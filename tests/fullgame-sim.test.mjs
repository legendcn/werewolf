import test from 'node:test';
import assert from 'node:assert/strict';
import { engine, MODES, Rules } from '../supabase/functions/game/engine.mjs';

// Drive a full game with every seat played by the engine's own bot logic.
// This exercises the whole phase machine (night queue, dawn, day-1 election,
// deferred death announcement, speech, vote/runoff, last words, hunter/confirm,
// badge, explode, departures) without a hand-written script per role.
function playBotGame(mode, seedTick = 61_000) {
  const roster = mode.roles.map((_, i) => ({ id: String(i), online: true, is_bot: true }));
  const actions = [];
  let now = 1_000_000;
  const ref = engine({ state: null, roster, mode, actions, clock: () => now });
  ref.start();
  const g = ref.state;
  const seenPhases = new Set();
  let ticks = 0;
  while (g.phase !== 'finished' && ticks < 4000 && g.day <= 80) {
    seenPhases.add(g.phase);
    ref.tick();
    now += seedTick;
    ticks++;
    assert.ok(g.aliveSeats.every((s) => s >= 1 && s <= mode.roles.length), '存活座位越界');
    assert.equal(new Set(g.aliveSeats).size, g.aliveSeats.length, '存活座位重复');
  }
  return { g, roster, ticks, seenPhases };
}

for (const mode of MODES) {
  test(`整局模拟 ${mode.name}：25 局全人机均能正常终局`, () => {
    const winners = {};
    for (let i = 0; i < 25; i++) {
      const { g, roster, ticks } = playBotGame(mode);
      assert.equal(g.phase, 'finished', `${mode.id} 第${i}局未终局：day=${g.day} phase=${g.phase} step=${g.step} alive=${g.aliveSeats} ticks=${ticks}`);
      assert.ok(['good', 'wolf', 'lovers'].includes(g.winner), `胜方非法：${g.winner}`);
      assert.ok(g.winReason, '缺少胜因');
      winners[g.winner] = (winners[g.winner] || 0) + 1;
      // 死亡记录与存活状态一致（人机不会离房/被踢）。
      const deadSeats = roster.filter((p) => !p.alive).map((p) => p.seat);
      const recorded = new Set(g.deaths.map((d) => d.seat));
      for (const seat of deadSeats) {
        assert.ok(recorded.has(seat) || g.kicked.includes(seat), `${mode.id} 座位${seat}已死但无出局记录`);
      }
      assert.equal(new Set(g.deaths.map((d) => d.seat)).size, g.deaths.length, '出局记录重复');
      const aliveSet = new Set(g.aliveSeats);
      for (const p of roster) assert.equal(p.alive, aliveSet.has(p.seat), '存活标记与 aliveSeats 不一致');
    }
    assert.ok(Object.keys(winners).length >= 1, '没有任何胜方');
  });
}

test('6 人新手局不设警长：全程无竞选阶段，标准局仍有', () => {
  for (let i = 0; i < 10; i++) {
    const six = playBotGame(MODES.find(m => m.id === 'newbie6'));
    assert.equal(six.g.sheriff, null, '6 人局不应产生警长');
    assert.equal(six.g.sheriffDone, true);
    assert.ok(!six.seenPhases.has('sheriff'), '6 人局不应进入警长竞选');
    assert.ok(!six.g.log.some(l => /警长竞选/.test(l.text)), '6 人局日志不应有竞选');
  }
  const nine = playBotGame(MODES.find(m => m.id === 'std9'));
  assert.ok(nine.seenPhases.has('sheriff'), '9 人标准局应竞选警长');
});

test('Elo 零和：随机人数与阵营下胜方总加分等于败方总扣分', () => {
  for (let n = 6; n <= 16; n++) {
    for (let trial = 0; trial < 30; trial++) {
      const entries = Array.from({ length: n }, (_, i) => ({
        seat: i + 1,
        name: `p${i}`,
        rating: 1200 + Math.floor(Math.random() * 800),
        games: Math.floor(Math.random() * 50),
        wins: Math.floor(Math.random() * 20),
        win: Math.random() < 0.5,
      }));
      if (entries.every((e) => e.win) || entries.every((e) => !e.win)) continue;
      const k = n <= 6 ? 32 : n <= 9 ? 28 : 24;
      const scores = Rules.computeTeamElo(entries, k);
      const delta = scores.reduce((s, x) => s + x.delta, 0);
      assert.ok(Math.abs(delta) < 1e-6, `n=${n} 评分非零和：${delta}`);
      for (const s of scores) {
        assert.ok(s.after >= 100, '评分低于下限');
        assert.equal(s.after, s.before + s.delta, 'after 与 delta 不一致');
      }
    }
  }
});