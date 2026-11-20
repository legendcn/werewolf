import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../supabase/functions/game/protocol.mjs';
import { game } from './referee-fixture.mjs';

test('60-second turn; only the late wolf spends bank, once and at acceptance', () => {
  const { g, ref, roster, act, at, now } = game();
  assert.equal(g.step, 'wolves');
  assert.equal(g.deadline - now(), 60_000);
  const [first, second] = roster.filter((p) => p.role === 'werewolf');
  act(first, 'wolves', first.seat);
  ref.tick();
  at(g.deadline + 20_000);
  ref.tick();
  ref.tick();
  assert.equal(g.step, 'wolves');
  assert.equal(g.bank[first.seat], 60_000);
  act(second, 'wolves', second.seat);
  assert.equal(g.bank[second.seat], 40_000);
  at(now() + 5_000);
  ref.tick();
  assert.equal(g.step, 'wolves'); // third wolf is still deciding
  assert.throws(() => act(second, 'wolves', first.seat));
  assert.equal(g.bank[second.seat], 40_000);
});

test('speech and runoff share one bank; expiry, AFK return, rematch compatibility', () => {
  const { g, ref, roster, act, at, now } = game();
  const p = roster[0], q = roster[1];
  delete g.bank;
  delete g.afk; // previously saved v8 room
  Object.assign(g, { phase: 'day', step: 'day', speechOrder: [p.seat, q.seat], speechIndex: 0 });
  at(g.deadline + 20_000);
  act(p, 'chat', null, { text: '还在发言' });
  act(p, 'speech', null, { turn: 0 });
  ref.tick();
  assert.equal(g.bank[p.seat], 40_000);
  assert.equal(g.speechIndex, 1);
  assert.equal(g.deadline - now(), 60_000);
  Object.assign(g, { phase: 'runoff', step: 'runoff', runoffSeats: [p.seat, q.seat] });
  at(g.deadline + 40_000);
  ref.tick();
  assert.ok(g.afk.includes(p.seat));
  assert.equal(g.phase, 'runoff');
  assert.throws(() => act(p, 'runoff', q.seat));
  act(p, 'afk', null, { back: true });
  assert.equal(g.bank[p.seat], 0);
  assert.ok(!g.afk.includes(p.seat));
  assert.throws(() => act(p, 'runoff', q.seat));
  act(q, 'runoff', p.seat);
  assert.equal(g.bank[q.seat], 20_000);
  at(g.deadline + 60_000);
  ref.tick();
  assert.notEqual(g.phase, 'runoff');
});

test('a wolf can explode immediately during voting, independently of its existing vote', () => {
  const { g, ref, role, act, actions, now } = game('bww12');
  const wolf = role('wolfking'), hunter = role('hunter');
  Object.assign(g, { phase: 'vote', step: 'vote' });
  act(wolf, 'vote', -1);
  ref.tick();
  // A daytime intent arriving as the vote starts is still a daytime explosion.
  act(wolf, 'day', hunter.seat, { explode: true });
  ref.tick();
  assert.deepEqual(actions.map((a) => a.step), ['vote', 'explode']);
  // 自爆带走的人没有遗言，直接入夜。
  assert.equal(g.phase, 'night');
  assert.equal(g.lastWordsSeat, null);
  assert.equal(g.day, 2);
  assert.equal(g.deadline - now(), 60_000);
  assert.ok(!g.aliveSeats.includes(hunter.seat));
  assert.equal(g.hunterPending, null);
  assert.equal(g.voteHistory.length, 0);
});

for (const choice of ['conceal', 'reveal', 'shoot', 'timeout']) {
  test(`hunter ${choice}: no public role before a reveal; dawn precedes the result`, () => {
    const { g, ref, role, roster, act, at, now } = game();
    const hunter = role('hunter'), seer = role('seer');
    Object.assign(g, { step: 'seer', nightIndex: g.nightQueue.indexOf('seer'), kill: hunter.seat });
    act(seer, 'seer', hunter.seat);
    ref.tick();
    assert.equal(g.phase, 'hunter');
    assert.equal(g.deadline - now(), 60_000);
    const sunrise = g.log.findIndex((e) => e.text.includes('天亮了'));
    assert.ok(sunrise >= 0 && sunrise < g.log.findIndex((e) => e.kind === 'death'));
    for (const viewer of [null, role('villager')]) {
      const publicView = project(g, viewer);
      assert.deepEqual([publicView.phase, publicView.step], ['settling', 'settling']);
      assert.ok(!('hunterPending' in publicView));
      assert.ok(!JSON.stringify(publicView.log).includes('猎人'));
    }
    assert.equal(project(g, hunter).hunterPending, hunter.seat);
    if (choice === 'timeout') at(g.deadline + 60_000);
    else {
      const target = role('werewolf').seat;
      assert.throws(() => act(hunter, 'hunter', target, { reveal: false }));
      act(hunter, 'hunter', choice === 'shoot' ? target : null, { reveal: choice !== 'conceal' });
    }
    ref.tick();
    // 首夜死者（含猎人本人）按座位从小到大说遗言，然后才天亮。
    const spoken = [];
    while (g.phase === 'lastwords') {
      spoken.push(g.lastWordsSeat);
      act(roster.find((p) => p.seat === g.lastWordsSeat), 'lastwords', null, { end: true });
      ref.tick();
    }
    const victim = roster.find((p) => p.role === 'werewolf' && !p.alive);
    const expected = (choice === 'shoot' ? [hunter.seat, victim.seat] : [hunter.seat]).sort((a, b) => a - b);
    assert.deepEqual(spoken, expected);
    assert.equal(g.phase, 'dawn');
    assert.equal(g.deadline - now(), 6000);
    assert.equal(g.log.filter((e) => e.text.includes('天亮了')).length, 1);
    assert.equal(g.log.some((e) => e.text.includes('翻开猎人牌')), ['reveal', 'shoot'].includes(choice));
    assert.equal(roster.filter((p) => !p.alive).length, choice === 'shoot' ? 2 : 1);
    if (choice === 'timeout') assert.ok(!project(g, null).afk.includes(hunter.seat));
  });
}

test('a concealed hunter still settles a winning vote; poison does not open the choice', () => {
  const { g, ref, role, act } = game();
  const hunter = role('hunter');
  Object.assign(g, {
    phase: 'vote',
    step: 'vote',
    aliveSeats: g.aliveSeats.filter((s) => !g.teams.gods.includes(s) || s === hunter.seat),
  });
  for (const seat of g.aliveSeats) ref.record(seat, 'vote', hunter.seat);
  ref.tick();
  assert.equal(g.phase, 'lastwords'); // 白天放逐先遗言
  act(hunter, 'lastwords', null, { end: true });
  ref.tick();
  assert.equal(g.phase, 'hunter');
  act(hunter, 'hunter', null, { reveal: false });
  ref.tick();
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 'wolf');
  const b = game(), victim = b.role('hunter');
  Object.assign(b.g, { step: 'seer', nightIndex: b.g.nightQueue.indexOf('seer'), poison: victim.seat });
  b.act(b.role('seer'), 'seer', victim.seat);
  b.ref.tick();
  // 首夜被毒有遗言，但毒杀不开枪。
  assert.deepEqual([b.g.phase, b.g.lastWordsSeat], ['lastwords', victim.seat]);
  assert.equal(b.g.hunterPending, null);
  b.act(victim, 'lastwords', null, { end: true });
  b.ref.tick();
  assert.equal(b.g.phase, 'dawn');
});
