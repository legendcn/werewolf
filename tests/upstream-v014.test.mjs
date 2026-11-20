import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../supabase/functions/game/protocol.mjs';
import { game } from './referee-fixture.mjs';

test('every turn is a fixed 60 seconds with no time bank', () => {
  const { g, ref, roster, act, at, now } = game();
  assert.equal(g.step, 'wolves');
  assert.equal(g.deadline - now(), 60_000);
  assert.ok(!('bank' in g) && !('afk' in g));
  const [first] = roster.filter((p) => p.role === 'werewolf');
  act(first, 'wolves', first.seat);
  ref.tick();
  assert.equal(g.step, 'wolves'); // the other wolves are still deciding
  at(g.deadline + 1);
  ref.tick();
  assert.notEqual(g.step, 'wolves'); // expiry advances the night even without a full vote
});

test('speech turns expire at 60 seconds; late actions are rejected', () => {
  const { g, ref, roster, act, at, now } = game();
  const p = roster[0], q = roster[1];
  Object.assign(g, { phase: 'day', step: 'day', speechOrder: [p.seat, q.seat], speechIndex: 0, deadline: now() + 60_000 });
  at(g.deadline + 1);
  assert.throws(() => act(p, 'chat', null, { text: '迟到' }));
  ref.tick();
  assert.equal(g.speechIndex, 1);
  assert.equal(g.deadline - now(), 60_000);
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
    // 首日先竞选警长，竞选结束后才公布死讯并开猎人窗口。
    at(g.deadline); ref.tick();
    for (const seat of g.aliveSeats) ref.record(seat, 'policeSignup', null, { run: false });
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
    // 首夜死者（含猎人本人）按座位从小到大说遗言，然后进入白天讨论。
    const spoken = [];
    while (g.phase === 'lastwords') {
      spoken.push(g.lastWordsSeat);
      act(roster.find((p) => p.seat === g.lastWordsSeat), 'lastwords', null, { end: true });
      ref.tick();
    }
    const victim = roster.find((p) => p.role === 'werewolf' && !p.alive);
    const expected = (choice === 'shoot' ? [hunter.seat, victim.seat] : [hunter.seat]).sort((a, b) => a - b);
    assert.deepEqual(spoken, expected);
    assert.equal(g.phase, 'day');
    assert.equal(g.deadline - now(), 60_000);
    assert.equal(g.log.filter((e) => e.text.includes('天亮了')).length, 1);
    assert.equal(g.log.some((e) => e.text.includes('翻开猎人牌')), false); // 夜间翻牌/死因不公开
    assert.ok(!g.log.some((e) => /号出局（/.test(e.text)), '夜死讯不应带死因括号');
    assert.equal(roster.filter((p) => !p.alive).length, choice === 'shoot' ? 2 : 1);
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
  b.at(b.g.deadline); b.ref.tick();
  for (const seat of b.g.aliveSeats) b.ref.record(seat, 'policeSignup', null, { run: false });
  b.ref.tick();
  // 首夜被毒有遗言，但毒杀不开枪。
  assert.deepEqual([b.g.phase, b.g.lastWordsSeat], ['lastwords', victim.seat]);
  assert.equal(b.g.hunterPending, null);
  b.act(victim, 'lastwords', null, { end: true });
  b.ref.tick();
  assert.equal(b.g.phase, 'day');
});
