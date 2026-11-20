import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../supabase/functions/game/protocol.mjs';
import { game } from './referee-fixture.mjs';

function nightDeaths(f, kill, poison) {
  Object.assign(f.g, { day: 2, step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill, poison });
  f.act(f.role('seer'), 'seer', f.role('villager').seat);
  f.ref.tick();
}
function voteOut(f, victim) {
  Object.assign(f.g, { phase: 'vote', step: 'vote' });
  for (const p of f.roster.filter(p => p.alive)) f.act(p, 'vote', p === victim ? -1 : victim.seat);
  f.ref.tick();
}
function drainWords(f) {
  while (f.g.phase === 'lastwords') {
    f.act(f.roster.find(p => p.seat === f.g.lastWordsSeat), 'lastwords', null, { end: true });
    f.ref.tick();
  }
}

test('night death announcements carry no cause; vote deaths read 放逐', () => {
  const f = game('std9');
  const [v1, v2] = f.roster.filter(p => p.role === 'villager');
  nightDeaths(f, v1.seat, v2.seat);
  const deathLines = f.g.log.filter(e => e.kind === 'death');
  assert.equal(deathLines.length, 2);
  for (const line of deathLines) {
    assert.ok(!line.text.includes('（'), `夜死讯不应带死因：${line.text}`);
    assert.ok(/^\d\d 号出局$/.test(line.text), `夜死讯应仅为出局座位：${line.text}`);
  }
  assert.ok(!project(f.g, null).log.some(e => /被狼人杀害|被女巫毒杀/.test(e.text)));
  voteOut(f, f.role('werewolf'));
  assert.ok(f.g.log.some(e => e.kind === 'death' && e.text.includes('（放逐）')), '放逐应显示为放逐');
});

test('night hunter shot is not publicly revealed; day hunter shot is', () => {
  const night = game('std9');
  const hunter = night.role('hunter'), wolf = night.role('werewolf');
  nightDeaths(night, hunter.seat, null);
  assert.equal(night.g.phase, 'hunter');
  night.act(hunter, 'hunter', wolf.seat);
  night.ref.tick();
  assert.ok(!night.g.log.some(e => e.text.includes('翻开猎人牌')), '夜猎翻牌不应公开');
  assert.ok(!night.g.log.some(e => /号出局（/.test(e.text)), '夜猎带走不应带死因');
  assert.ok(!wolf.alive);

  const day = game('std9');
  const hunter2 = day.role('hunter'), wolf2 = day.role('werewolf');
  voteOut(day, hunter2);
  drainWords(day);
  assert.equal(day.g.phase, 'hunter');
  day.act(hunter2, 'hunter', wolf2.seat);
  day.ref.tick();
  assert.ok(day.g.log.some(e => e.text.includes('翻开猎人牌')), '白天猎人翻牌应公开');
});