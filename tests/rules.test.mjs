import test from 'node:test';
import assert from 'node:assert/strict';
import { engine, MODES, Rules } from '../supabase/functions/game/engine.mjs';
import { hostOf, project, replayEvent, won } from '../supabase/functions/game/protocol.mjs';

function fixture(id, bots = false) {
  const mode = MODES.find((m) => m.id === id);
  const roster = mode.roles.map((_, i) => ({ id: String(i), online: true, is_bot: bots }));
  const run = engine({ state: null, mode, roster });
  run.start();
  return { run, roster, g: run.state };
}
test('each mode completes using the same referee without a host browser', () => {
  for (const { id } of MODES) {
    const { run, g, roster } = fixture(id, true);
    for (let i = 0; i < 1000 && g.phase !== 'finished'; i++) {
      g.deadline = 0;
      run.tick();
    }
    assert.equal(g.phase, 'finished', id);
    assert.deepEqual(g.aliveSeats.slice().sort(), roster.filter((r) => r.alive).map((r) => r.seat).sort());
  }
});
test('thief can guard on night one and cannot duplicate an existing unique role', () => {
  const { run, g, roster } = fixture('dz12');
  assert.ok(!g.thiefCards.some((r) => ['seer', 'hunter'].includes(r)));
  g.thiefCards = ['guard', 'villager'];
  run.record(g.thiefSeat, 'thief', null, { card: 0 });
  run.tick();
  assert.equal(g.step, 'guard');
  assert.deepEqual(run.expectedSeats('guard'), [g.thiefSeat]);
  assert.equal(roster.find((r) => r.seat === g.thiefSeat).role, 'guard');
});
test('a skipped night clears the guard/charm repeat ban', () => {
  for (const [step, key] of [['guard', 'lastGuard'], ['wolfbeauty', 'lastCharm']]) {
    const { run, g } = fixture('wmq12');
    g.step = step;
    g.nightIndex = g.nightQueue.indexOf(step);
    g[key] = 1;
    g.deadline = 0;
    run.tick();
    assert.equal(g[key], null);
  }
});
test('all members of the mixed couple faction have the same result', () => {
  const g = { lovers: [1, 2], cupidSeat: 3, teams: { wolves: [1, 4] } };
  for (const winner of ['wolf', 'good', 'lovers']) {
    g.winner = winner;
    for (const [seat, role] of [[1, 'werewolf'], [2, 'villager'], [3, 'cupid']]) {
      assert.equal(won(g, { seat, role }), winner === 'lovers');
    }
    assert.equal(won(g, { seat: 4, role: 'werewolf' }), winner === 'wolf');
  }
});
test('Elo deltas match persisted balances, including at the floor', () => {
  for (let size = 2; size <= 12; size++) {
    for (let n = 0; n < 100; n++) {
      const entries = Array.from(
        { length: size },
        (_, i) => ({ seat: i, win: i <= n % size, rating: 100 + (i % 3 ? 0 : (i * n * 11) % 2500) }),
      );
      const scores = Rules.computeTeamElo(entries, 24);
      assert.equal(scores.reduce((s, p) => s + p.delta, 0), 0);
      for (const p of scores) {
        assert.ok(p.after >= 100);
        assert.equal(p.delta, p.after - p.before || 0);
      }
    }
  }
});
test('role views never include raw referee state; offline humans and bots are not hosts', () => {
  const { g, roster } = fixture('newbie6');
  g.checks = [{ seat: 3, target: 5, killer: false }];
  const villager = roster.find((r) => r.role === 'villager');
  for (const me of [null, villager]) {
    const v = project(g, me);
    for (const key of ['checks', 'teams', 'kill', 'nightQueue', 'thiefSeat', 'lovers']) {
      assert.ok(!(key in v));
    }
  }
  assert.equal(
    hostOf([{ id: 'bot', is_bot: true, online: true }, { id: 'off', online: false }, {
      id: 'host',
      online: true,
    }]),
    'host',
  );
});
test('duel and hunter events retain their actual phase and target', () => {
  assert.equal(replayEvent({ phase: 'day', step: 'day', target: 1, payload: { duel: 1 } }).t, 'duel');
  const { g, run } = fixture('std9');
  Object.assign(g, { phase: 'hunter', hunterFrom: 'night' });
  run.record(1, 'hunter', 2);
  const ev = replayEvent(run.pending[0]);
  assert.equal(ev.phase, 'night');
  assert.equal(ev.t, 'hunter');
  assert.equal(ev.target, 2);
});
