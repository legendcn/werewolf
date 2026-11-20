import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../supabase/functions/game/protocol.mjs';
import { game } from './referee-fixture.mjs';

// 高优先回归：警上自爆直接终局时，被保密的首夜死者必须公布并留下死亡记录，
// 否则公开存活名单与回放会把他们算成存活。
test('election self-boom that ends the game still publishes the deferred first-night deaths', () => {
  const f = game('bww12');
  const [a, b, c] = f.roster.filter(p => p.role === 'werewolf');
  const king = f.role('wolfking');
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: a.seat, poison: b.seat });
  f.act(f.role('seer'), 'seer', c.seat);
  f.ref.tick();
  assert.equal(f.g.phase, 'dawn');
  assert.equal(f.g.nightPending.length, 2);
  f.at(f.g.deadline); f.ref.tick();
  assert.equal(f.g.phase, 'sheriff');
  f.act(king, 'explode', c.seat, { explode: true, target: c.seat });
  f.ref.tick();
  // 首夜死者含被刀者，须先走出局确认窗口再终局。
  let guard = 0;
  while (f.g.phase === 'hunter' && guard++ < 10) {
    if (f.g.hunterPending != null) f.act(f.roster.find(p => p.seat === f.g.hunterPending), 'hunter', null, {});
    else f.act(f.roster.find(p => p.seat === f.g.deathConfirmSeats[0]), 'deathConfirm', null, {});
    f.ref.tick();
  }
  assert.equal(f.g.phase, 'finished');
  assert.equal(f.g.winner, 'good');
  assert.equal(f.g.nightPending, undefined);
  const pub = project(f.g, null);
  for (const seat of [a.seat, b.seat, c.seat, king.seat]) {
    assert.ok(!pub.aliveSeats.includes(seat), `终局公开存活名单不应含 ${seat} 号`);
    assert.ok(f.g.deaths.some(d => d.seat === seat), `缺少 ${seat} 号死亡记录`);
  }
  assert.ok(pub.log.some(e => e.kind === 'death' && e.text.includes(String(a.seat).padStart(2, '0'))));
});

// 中优先回归：首日应先公布首夜死讯、确认、遗言与警徽移交，再由最终持徽者选方向。
// 场景：首夜猎人出局；当选警长（预言家）在公布死讯后被猎人带走，接徽者应能选方向。
test('day-1 direction is chosen by the final badge holder after deaths/words/badge settle', () => {
  const f = game('std9');
  const hunter = f.role('hunter'), seer = f.role('seer'), vill = f.role('villager');
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: hunter.seat });
  f.act(seer, 'seer', vill.seat);
  f.ref.tick();
  f.at(f.g.deadline); f.ref.tick();
  assert.equal(f.g.phase, 'sheriff');
  for (const seat of f.g.aliveSeats) f.ref.record(seat, 'policeSignup', null, { run: seat === seer.seat });
  f.ref.tick(); // 单人上警 → 当选 → 先公布死讯（猎人确认窗口）
  assert.ok(f.g.log.some(e => e.kind === 'death'), '当选后应先公布首夜死讯');
  let guard = 0;
  while (!['order', 'day', 'finished'].includes(f.g.phase) && guard++ < 20) {
    if (f.g.phase === 'lastwords') {
      f.act(f.roster.find(p => p.seat === f.g.lastWordsSeat), 'lastwords', null, { end: true });
    } else if (f.g.phase === 'hunter') {
      if (f.g.hunterPending === hunter.seat) f.act(hunter, 'hunter', seer.seat);
      else f.act(f.roster.find(p => p.seat === f.g.deathConfirmSeats[0]), 'deathConfirm', null, {});
    } else if (f.g.phase === 'badge') {
      f.act(f.roster.find(p => p.seat === f.g.badgePending), 'badge', vill.seat);
    }
    f.ref.tick();
  }
  assert.equal(f.g.phase, 'order', '接徽后应进入选方向，而不是直接讨论');
  assert.equal(f.g.sheriff, vill.seat, '警徽应移交给存活者');
  assert.ok(f.g.deaths.some(d => d.seat === hunter.seat) && f.g.deaths.some(d => d.seat === seer.seat));
  const orderLog = f.g.log.findIndex(e => e.text.includes('决定今天的发言方向'));
  const deathLog = f.g.log.map(e => e.kind).lastIndexOf('death');
  assert.ok(orderLog > deathLog, '选方向应在公布死讯之后');
  f.act(vill, 'order', null, { dir: 'ccw' });
  f.ref.tick();
  assert.equal(f.g.phase, 'day');
  assert.equal(f.g.speechDir, 'ccw', '最终持徽者的方向选择应生效');
  assert.equal(f.g.speechOrder[0], vill.seat);
});