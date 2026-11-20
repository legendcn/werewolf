import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { dispatch, SettlementError } from '../supabase/functions/game/service.mjs';

// A disposable PostgreSQL cluster, not the URL in js/config.js. Run as a non-root user.
test('v8 migration and concurrent game transactions', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'werewolf-test-'));
  const sock = createServer();
  await new Promise((r) => sock.listen(0, '127.0.0.1', r));
  const port = sock.address().port;
  await new Promise((r) => sock.close(r));
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    port,
    persistent: false,
    onLog() {},
    onError() {},
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });
  await pg.initialise();
  await pg.start();
  const db = postgres(`postgres://postgres:password@127.0.0.1:${port}/postgres`, {
    prepare: false,
    onnotice() {},
  });
  t.after(async () => {
    await db.end();
    await pg.stop();
    await rm(dir, { recursive: true, force: true });
  });
  await db.unsafe(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create publication supabase_realtime;
    alter default privileges in schema public grant all on tables to authenticated,anon;`);
  const migration = await db.reserve();
  try {
    for (const file of ['schema.sql', ...Array.from({ length: 7 }, (_, i) => `migration-v${i + 2}.sql`)]) {
      if (file === 'migration-v8.sql') {
        // Simulate the v0.15 repair scenario: the v7 table exists but its read policy is missing.
        await migration.unsafe('drop policy "replays readable" on public.replays; revoke select on public.replays from authenticated');
      }
      await migration.unsafe(await readFile(new URL('../supabase/' + file, import.meta.url), 'utf8'));
    }
  } finally {
    migration.release();
  }
  for (
    const [table, privilege] of [
      ['rooms', 'select'],
      ['players', 'select'],
      ['game_actions', 'insert'],
      ['ratings', 'update'],
      ['replays', 'insert'],
      ['profiles', 'insert'],
    ]
  ) {
    const [r] = await db`select has_table_privilege('authenticated',${table},${privilege}) as allowed`;
    assert.equal(r.allowed, false, table + ':' + privilege);
  }
  const ids = [];
  for (let i = 0; i < 8; i++) {
    const name = i === 0 ? 'legendcn' : 'User' + i;
    const id = crypto.randomUUID();
    ids.push(id);
    const email = 'u_' +
      createHash('sha256').update('wolf:' + name.toLowerCase()).digest('hex').slice(0, 24) +
      '@werewolf.local';
    await db`insert into auth.users values(${id},${email},${db.json({ wolf_username: name })})`;
  }
  assert.deepEqual(await db`select role,status from profiles where id=${ids[0]}`.then((r) => ({ ...r[0] })), {
    role: 'member',
    status: 'pending',
  });
  // A genuine pre-v8 auth user without a profile can repair it on login.
  const legacy = crypto.randomUUID(),
    legacyEmail = 'u_' + createHash('sha256').update('wolf:legacy').digest('hex').slice(0, 24) +
      '@werewolf.local';
  await db`insert into auth.users(id,email) values(${legacy},${legacyEmail})`;
  await db.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub',${legacy},true)`;
    await tx`select public.repair_wolf_profile('Legacy')`;
    await tx`select public.repair_wolf_profile('Legacy')`;
  });
  assert.equal((await db`select status from profiles where id=${legacy}`)[0].status, 'pending');
  await db`update profiles set status='approved'`;
  const code = '123456';
  const call = (uid, op, opts = {}, inject = () => {}) =>
    db.begin((tx) =>
      dispatch(
        async (s, p) => {
          inject(s);
          return tx.unsafe(s, p);
        },
        uid,
        { code, op, ...opts },
      )
    );
  await call(ids[0], 'create', { mode: 'newbie6' });
  for (const id of ids.slice(1, 5)) await call(id, 'join');
  const race = await Promise.allSettled([call(ids[5], 'join'), call(ids[6], 'join')]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  const outsider = race[0].status === 'fulfilled' ? ids[6] : ids[5];
  assert.equal((await call(outsider, 'restore')).gone, true);
  assert.equal((await call(ids[0], 'restore')).code, code);
  const failAt = (pattern) => (s) => {
    if (pattern.test(s)) throw new Error('test rollback');
  };
  await assert.rejects(call(ids[0], 'start', {}, failAt(/update public.rooms set options/)), /test rollback/);
  assert.equal((await db`select count(*) n from players where role is not null`)[0].n, '0');
  // A non-host owner may reserve a role; neither the host nor a spectator can read it.
  await db`update profiles set role='owner' where id=${ids[1]}`;
  const player = (await call(ids[0], 'snapshot')).me.id;
  const alternate = (await call(ids[2], 'snapshot')).me.id;
  const appoint = (id, role) => call(ids[1], 'appoint', {id, role});
  await assert.rejects(call(ids[0], 'appoint', {id:player, role:'seer'}), /仅入房站长/);
  await assert.rejects(appoint(player,'hunter'), /没有这个角色/);
  const concurrent = await Promise.allSettled([appoint(player,'seer'), appoint(alternate,'seer')]);
  assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1);
  const fixed = concurrent[0].status === 'fulfilled' ? player : alternate;
  const viewer = fixed === player ? ids[0] : ids[2];
  const mine = await call(viewer, 'snapshot');
  assert.equal(mine.me.role, null); assert.ok(!('appointments' in mine));
  for (const uid of [ids[1], outsider]) {
    const spectate = await call(uid, 'spectate');
    assert.ok(!('appointments' in spectate)); assert.ok(spectate.members.every(p => !('role' in p)));
  }
  assert.deepEqual((await appoint(fixed,null)).appointments, {});
  assert.deepEqual((await appoint(fixed,'witch')).appointments, {[fixed]:'witch'});
  const opened = await call(ids[0], 'start');
  assert.equal((await call(viewer, 'snapshot')).me.role, 'witch');
  await assert.rejects(appoint(fixed,null), /发牌前/);
  assert.ok(!('appointments' in await call(ids[1], 'snapshot')));
  const matchId = opened.options.g.matchId;
  assert.ok(matchId);
  let view = await call(outsider, 'spectate');
  assert.equal(view.options.g.step, 'night');
  assert.equal(view.options.g.teams, undefined);
  assert.ok(view.members.every((m) => !('role' in m) && !('account_id' in m)));
  // Ordinary clients need neither an online host nor a role-bearing presence broadcast.
  await db`update players set last_seen=now()-interval '2 minutes' where account_id=${ids[0]}`;
  const other = await call(ids[1], 'snapshot');
  assert.equal(other.hostId, other.me.id);
  const wolves = await db`select account_id,id,seat from players where role='werewolf' order by seat`;
  const wolf = await call(wolves[0].account_id, 'snapshot');
  assert.equal(wolf.options.g.teams.wolves.length, 2);
  await call(wolves[0].account_id, 'act', {
    day: 1,
    matchId,
    step: 'wolfchat',
    payload: { text: 'private discussion' },
  });
  assert.equal((await call(outsider, 'spectate')).chat.length, 0);
  // Election submissions share the same locked room, including across concurrent requests.
  await db`update rooms set options=jsonb_set(options,'{g}',(options->'g') || '{"phase":"dawn","step":"dawn","deadline":0}'::jsonb) where rooms.code=${code}`;
  assert.equal((await call(ids[1], 'snapshot')).options.g.step, 'policeSignup');
  const signup = (id, run) => call(id,'act',{day:1, matchId, step:'policeSignup', payload:{run}});
  const attempts = await Promise.allSettled([signup(wolves[0].account_id,true), signup(wolves[0].account_id,true)]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length,1);
  assert.ok(!(await call(outsider,'spectate')).options.g.sheriffCandidates?.length);
  const policeVoters = await db`select account_id from players where room_code=${code} and account_id<>${wolves[0].account_id}`;
  await Promise.all(policeVoters.map(p => signup(p.account_id,false)));
  assert.equal((await call(outsider,'spectate')).options.g.sheriff,wolves[0].seat);
  const order = {day:1, matchId, step:'order', payload:{dir:'ccw'}};
  await assert.rejects(call(wolves[1].account_id,'act',order),/当前不能/);
  assert.equal((await call(wolves[0].account_id,'act',order)).options.g.speechOrder[0],wolves[0].seat);
  // Seed a long discussion and a timed-out vote, then inject a READ failure.
  await db`insert into game_actions(match_id,room_code,day,phase,step,player_id,payload)
    select ${matchId},${code},1,'day','chat',${
    wolves[0].id
  },jsonb_build_object('text',i::text) from generate_series(1,505) i`;
  await db`update rooms set options=jsonb_set(options,'{g}',(options->'g') || '{"phase":"vote","step":"vote","deadline":0}'::jsonb) where rooms.code=${code}`;
  await assert.rejects(call(ids[1], 'snapshot', {}, failAt(/and a.day=\$2/)), /test rollback/);
  assert.equal(
    (await db`select options->'g'->>'phase' as p from rooms where rooms.code=${code}`)[0].p,
    'vote',
  );
  await db`update rooms set options=jsonb_set(options,'{g,deadline}',to_jsonb(9999999999999::bigint)) where rooms.code=${code}`;
  assert.equal((await call(ids[1], 'snapshot')).chat.at(-1).payload.text, '505');
  view = await call(outsider, 'spectate');
  assert.equal(view.chat.length, 500);
  assert.equal(view.chat[0].payload.text, '6');
  await call(wolves[0].account_id, 'leave');
  assert.equal((await call(wolves[0].account_id, 'restore')).gone, true);
  assert.ok(!(await call(outsider, 'spectate')).options.g.aliveSeats.includes(wolves[0].seat));
  let retry;
  await assert.rejects(call(wolves[1].account_id, 'leave', {}, failAt(/insert into public.replays/)), e => {
    assert.ok(e instanceof SettlementError);
    assert.match(e.cause.message, /test rollback/);
    retry = e.retry;
    return retry.matchId === matchId;
  });
  assert.equal((await db`select count(*) n from ratings`)[0].n, '0');
  assert.equal((await db`select count(*) n from replays`)[0].n, '0');
  await assert.rejects(call(wolves[1].account_id, 'leave', { retry: { ...retry, revision: retry.revision - 1 } }), /已推进/);
  const leaves = await Promise.all([call(wolves[1].account_id, 'leave', { retry }), call(wolves[1].account_id, 'leave')]);
  assert.ok(leaves.every(result => result.gone));
  assert.equal((await call(wolves[1].account_id, 'leave', { retry })).gone, true);
  view = await call(outsider, 'spectate');
  assert.equal(view.options.g.phase, 'finished');
  const [r] = await db`select * from replays where match_id=${matchId}`;
  assert.equal(view.options.g.replayId, String(r.id));
  const replayCountAs = uid => db.begin(async tx => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claim.sub',${uid},true)`;
    return (await tx`select count(*) n from public.replays`)[0].n;
  });
  assert.equal(await replayCountAs(ids[0]), '1');
  assert.equal(await replayCountAs(crypto.randomUUID()), '0');
  assert.equal(r.events.filter((e) => e.t === 'policeSignup').length, 6);
  assert.equal(r.events.filter((e) => e.t === 'order').length, 1);
  assert.equal(r.events.filter((e) => e.t === 'chat').length, 505);
  assert.ok(r.events.some((e) => e.t === 'wolfchat' && e.text === 'private discussion'));
  assert.equal((await db`select sum(games) n from ratings`)[0].n, '6');
  const rem = await db`select account_id from players where not departed order by joined_at,id`;
  // Refresh the earliest remaining human if their heartbeat had expired.
  await call(rem[0].account_id, 'snapshot');
  const lobby = await call(rem[0].account_id, 'reset', { matchId });
  assert.equal(lobby.options.g, null);
  assert.ok(lobby.revision > view.revision);
  for (const w of wolves) await call(w.account_id, 'join');
  const next = await call(rem[0].account_id, 'start');
  assert.notEqual(next.options.g.matchId, matchId);
  await assert.rejects(call(wolves[1].account_id, 'leave', { retry }), /已推进/);
  assert.equal(next.options.g.replayId, undefined);
  assert.ok(next.revision > lobby.revision);
});
