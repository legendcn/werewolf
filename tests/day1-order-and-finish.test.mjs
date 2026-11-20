import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../supabase/functions/game/protocol.mjs';
import { speechOrder } from '../supabase/functions/game/civic.mjs';
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
  assert.equal(f.g.speechOrder.at(-1), vill.seat, '警长最后发言');
  const alive = f.g.aliveSeats.slice().sort((a, b) => a - b);
  const cycle = speechOrder(alive, vill.seat, 'ccw');
  cycle.push(cycle.shift());
  assert.deepEqual(f.g.speechOrder, cycle);
});

// 高优先回归：狼人白天自爆直接进夜后，女巫即使短暂离线，回合也必须等满 60 秒，
// 不能像旧版那样 12 秒就被跳过（“自爆吞女巫回合”）。
test('self-boom into night keeps the witch turn for the full 60s even if she briefly drops offline', () => {
  const f = game('std12');
  const witch = f.role('witch');
  let guard = 0;
  while (!(f.g.phase === 'day' && f.g.day >= 2) && guard++ < 300) {
    if (f.g.phase === 'night') { for (const s of f.ref.expectedSeats(f.g.step)) f.ref.record(s, f.g.step, null, {}); }
    else if (f.g.phase === 'dawn') f.at(f.g.deadline);
    else if (f.g.phase === 'sheriff') { for (const s of f.g.aliveSeats) f.ref.record(s, f.g.step, null, { run: false }); }
    else if (f.g.phase === 'hunter') { for (const s of (f.g.deathConfirmSeats ?? [f.g.hunterPending])) if (s != null) f.ref.record(s, 'deathConfirm', null, {}); }
    else if (f.g.phase === 'lastwords') f.ref.record(f.g.lastWordsSeat, 'lastwords', null, { end: true });
    else if (f.g.phase === 'order') f.ref.record(f.g.sheriff, 'order', null, { dir: 'cw' });
    else if (f.g.phase === 'vote' || f.g.phase === 'runoff') { for (const s of f.g.aliveSeats) f.ref.record(s, f.g.step, -1, {}); }
    else if (f.g.phase === 'day') { const sp = f.g.speechOrder[f.g.speechIndex]; if (sp != null) f.ref.record(sp, 'speech', null, { turn: f.g.speechIndex }); }
    f.ref.tick();
  }
  const boomer = f.roster.find(p => ['werewolf', 'wolfking'].includes(p.role) && p.alive);
  f.act(boomer, 'day', null, { explode: true });
  f.ref.tick();
  assert.equal(f.g.phase, 'night');
  guard = 0;
  while (f.g.phase === 'night' && f.g.step !== 'witch' && guard++ < 20) {
    for (const s of f.ref.expectedSeats(f.g.step)) f.ref.record(s, f.g.step, null, {});
    f.ref.tick();
  }
  assert.equal(f.g.step, 'witch');
  const witchRow = f.roster.find(r => r.seat === witch.seat);
  witchRow.online = false;
  const start = f.now();
  f.at(start + 13000); f.ref.tick();
  assert.equal(f.g.step, 'witch', '离线 13 秒不应吞掉女巫回合');
  assert.ok(f.g.deadline - f.now() > 0, '女巫回合应仍有剩余时间');
  witchRow.online = true;
  f.act(witch, 'witch', null, {});
  f.ref.tick();
  assert.notEqual(f.g.step, 'witch', '女巫回来后行动应正常结算');
});

test('sheriff picks the direction but speaks last; without a sheriff the death-based start is kept', () => {
  for (const dir of ['cw', 'ccw']) {
    const f = game('std9');
    const sheriff = f.roster[2];
    Object.assign(f.g, { phase: 'order', step: 'order', sheriff: sheriff.seat, sheriffDone: true, day: 2 });
    f.act(sheriff, 'order', null, { dir });
    f.ref.tick();
    assert.equal(f.g.phase, 'day');
    assert.equal(f.g.speechDir, dir);
    const alive = f.g.aliveSeats.slice().sort((a, b) => a - b);
    const cycle = speechOrder(alive, sheriff.seat, dir);
    cycle.push(cycle.shift());
    assert.deepEqual(f.g.speechOrder, cycle, `${dir} 应从警长下家开始`);
    assert.equal(f.g.speechOrder.at(-1), sheriff.seat, `${dir} 警长应最后发言`);
    assert.ok(f.g.log.some((e) => e.text.includes('警长最后发言')));
  }
  const f = game('std9');
  Object.assign(f.g, {
    phase: 'order', step: 'order', sheriff: null, sheriffDone: true, day: 2,
    deaths: [{ seat: 4, day: 2, reason: 'vote' }],
  });
  f.ref.tick();
  assert.equal(f.g.phase, 'day');
  assert.equal(f.g.speechOrder[0], 5, '无警长时从最小号死者的下家开始');
});