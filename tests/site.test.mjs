import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import preview from '../server.js';
import { buildSite } from '../scripts/build-site.mjs';

test('offline preview serves the example instead of the live client config', async () => {
  const route = '/js/config.js?v=test';
  const offline = preview.assetPath(route, true);
  assert.notEqual(offline, preview.assetPath(route));
  const window = {};
  vm.runInNewContext(await readFile(offline, 'utf8'), { window });
  assert.equal(window.WOLF_CONFIG.SUPABASE_KEY, '');
  assert.equal(preview.assetPath('/supabase/functions/game/index.ts', true), null);
});

test('static build works at a Pages subpath and excludes stale or server-only files', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'werewolf-site-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'dist'));
  await writeFile(join(dir, 'dist/.env'), 'stale fixture');
  const out = await buildSite(dir);
  const base = 'https://example.test/werewolf/';
  for (const html of ['index.html', 'rules.html']) {
    const dom = new JSDOM(await readFile(join(out, html), 'utf8'), { url: base + html });
    t.after(() => dom.window.close());
    for (const el of dom.window.document.querySelectorAll('a[href], link[href], script[src]')) {
      const url = new URL(el.getAttribute('href') ?? el.getAttribute('src'), base + html);
      if (url.origin !== 'https://example.test') continue;
      assert.ok(url.pathname.startsWith('/werewolf/'), url.href);
      await access(join(out, url.pathname.slice('/werewolf/'.length) || 'index.html'));
    }
  }
  await access(join(out, '.nojekyll'));
  const notices = await readFile(join(out, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  for (const [, license] of notices.matchAll(/\((vendor\/licenses\/[^)]+)\)/g)) await access(join(out, license));
  for (const path of ['.env', '.git', 'node_modules', 'tests', 'examples', 'supabase/schema.sql', 'supabase/functions/game']) {
    await assert.rejects(access(join(out, path)), { code: 'ENOENT' }, path);
  }
});
