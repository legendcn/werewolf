import test from 'node:test';
import assert from 'node:assert/strict';
import { engine } from '../supabase/functions/game/engine.mjs';
import { submit } from '../supabase/functions/game/protocol.mjs';

// 自定义板子便于构造「首夜即可能判胜」的极端局面。
function customGame(roles) {
  const mode = { id: 'custom', name: '自定义测试局', roles };
  const roster = roles.map((_, i) => ({ id: String(i), online: true, is_bot: false }));
  const actions = [];
  let now = 1_000_000;
  const ref = engine({ state: null, roster, mode, actions, clock: () => now });
  ref.start();
  const g = ref.state;
  return {
    g, ref, roster, actions,
    act: (p, step, target = null, payload = {}) => submit(ref, p, { matchId: g.matchId, day: g.day, step, target, payload }, actions),
    role: r => roster.find(p => p.role === r),
    at: n => { now = n; },
  };
}

// 首夜结算：狼自刀+被毒全灭本应判好人胜，但首夜死者仍有出局确认窗口，
// 不能跳过窗口直接终局（等待期间不写回放/评分）。
test('first-night settlement opens the death-confirmation window before judging victory', () => {
  const f = customGame(['werewolf', 'werewolf', 'villager', 'villager', 'seer', 'hunter']);
  const [w1, w2] = f.roster.filter(p => p.role === 'werewolf');
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: w1.seat, poison: w2.seat });
  f.act(f.role('seer'), 'seer', f.role('villager').seat);
  f.ref.tick();
  assert.equal(f.g.phase, 'hunter', '应先开出局确认窗口而非直接终局');
  assert.equal(f.g.winner, null);
  assert.equal(f.g.nightPending, undefined);
  assert.ok(f.g.deathConfirmSeats.includes(w1.seat));
  assert.ok(f.g.log.some(e => e.kind === 'death'), '死讯应已公布');
  f.act(w1, 'deathConfirm', null, {});
  f.ref.tick();
  assert.equal(f.g.phase, 'finished');
  assert.equal(f.g.winner, 'good');
});

// 警上自爆：首夜死讯未公布时自爆灭狼，本应判好人胜；但首夜死者含猎人，
// 猎人一枪带走最后平民会翻成狼人屠边胜，必须先确认再判胜。
test('election self-boom waits for the hunter shot, which can flip the winner', () => {
  const f = customGame(['werewolf', 'wolfking', 'villager', 'seer', 'hunter', 'guard']);
  const hunter = f.role('hunter'), king = f.role('wolfking'), wolf = f.role('werewolf'), vill = f.role('villager');
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: hunter.seat });
  f.act(f.role('seer'), 'seer', vill.seat);
  f.ref.tick();
  f.at(f.g.deadline); f.ref.tick();
  assert.equal(f.g.phase, 'sheriff');
  f.act(king, 'explode', wolf.seat, { explode: true, target: wolf.seat });
  f.ref.tick();
  assert.equal(f.g.phase, 'hunter', '自爆后应先开猎人确认窗口而非直接判胜');
  assert.equal(f.g.winner, null);
  assert.equal(f.g.hunterPending, hunter.seat);
  f.act(hunter, 'hunter', vill.seat);
  f.ref.tick();
  assert.equal(f.g.phase, 'finished');
  assert.equal(f.g.winner, 'wolf', '猎人带走最后平民后应翻为狼人屠边胜');
  assert.ok(f.g.winReason.includes('平民'));
  assert.ok(f.g.deaths.some(d => d.seat === hunter.seat) && f.g.deaths.some(d => d.seat === vill.seat));
});

// 无适格确认者时仍立即结算，不引入多余窗口。
test('with no eligible confirmation the game still settles immediately', () => {
  const f = customGame(['werewolf', 'werewolf', 'villager', 'villager', 'seer', 'witch']);
  const [w1, w2] = f.roster.filter(p => p.role === 'werewolf');
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: w1.seat, poison: w2.seat });
  f.act(f.role('seer'), 'seer', f.role('villager').seat);
  f.ref.tick();
  assert.equal(f.g.phase, 'finished');
  assert.equal(f.g.winner, 'good');
});