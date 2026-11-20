import test from 'node:test';
import assert from 'node:assert/strict';
import { game } from './referee-fixture.mjs';
import { project } from '../supabase/functions/game/protocol.mjs';

function dawn(f) {
  Object.assign(f.g, { phase: 'dawn', step: 'dawn', deadline: f.now() });
  f.ref.tick();
}
function signup(f, candidates) {
  dawn(f);
  for (const p of f.roster) f.act(p, 'policeSignup', null, { run: candidates.includes(p) });
  f.ref.tick();
}

test('sheriff PK: only non-candidates vote; second tie loses the badge', () => {
  const f = game();
  const [a, b, c, ...voters] = f.roster;
  signup(f, [a, b, c]);
  for (const seat of f.g.policeOrder) {
    const cand = f.roster.find((p) => p.seat === seat);
    assert.throws(() => f.act(voters[0], 'chat', null, { text: 'not my turn' }));
    f.act(cand, 'chat', null, { text: '竞选' });
    f.act(cand, 'policeSpeech', null, { turn: f.g.policeIndex });
    f.ref.tick();
  }
  for (const step of ['policeVote', 'policeRunoff']) {
    assert.equal(f.g.step, step);
    assert.throws(() => f.act(c, step, a.seat));
    assert.throws(() => f.act(voters[0], step, step === 'policeRunoff' ? c.seat : voters[1].seat));
    voters.forEach((p, i) => f.act(p, step, i % 2 ? a.seat : b.seat));
    f.ref.tick();
  }
  assert.deepEqual([f.g.phase, f.g.sheriff, f.g.speechOrder[0]], ['day', null, 1]);
});

test('sheriff sets direction and casts 1.5 votes in both exile ballots', () => {
  for (const step of ['vote', 'runoff']) {
    const f = game(), [leader, a, b, voter] = f.roster;
    signup(f, [leader]);
    assert.equal(f.g.step, 'order');
    assert.throws(() => f.act(a, 'order', null, { dir: 'ccw' }));
    f.act(leader, 'order', null, { dir: 'ccw' });
    f.ref.tick();
    assert.deepEqual(f.g.speechOrder, Array.from({ length: 9 }, (_, i) => (leader.seat + 7 - i + 9) % 9 + 1));
    assert.equal(f.g.speechOrder.at(-1), leader.seat, '警长最后发言');
    Object.assign(f.g, { phase: step, step, runoffSeats: [a.seat, b.seat] });
    for (const p of f.roster) f.act(p, step, p === leader ? a.seat : p === voter ? b.seat : -1);
    f.ref.tick();
    assert.deepEqual(f.g.voteHistory.at(-1).counts, { [a.seat]: 1.5, [b.seat]: 1 });
    assert.equal(a.alive, false);
  }
});

test('last words before the hunter shot, then badge; only the speaker can post, and only until timeout', () => {
  const f = game(), hunter = f.role('hunter'), wolf = f.role('werewolf'), next = f.role('witch');
  Object.assign(f.g, { phase: 'vote', step: 'vote', sheriff: hunter.seat });
  for (const p of f.roster) f.act(p, 'vote', p === hunter ? -1 : hunter.seat);
  f.ref.tick();
  const words = (p) => {
    assert.deepEqual([f.g.phase, project(f.g, null).lastWordsSeat], ['lastwords', p.seat]);
    assert.throws(() => f.act(next, 'chat', null, { text: '插话' }));
    assert.throws(() => f.act(p, 'chat', null, { turn: 0, texts: ['旧讨论', '旧队尾'] }), /轮次已变化/);
    f.act(p, 'chat', null, { text: '一' });
    f.act(p, 'chat', null, { text: '二' });
    f.at(f.g.deadline + 1);
    assert.throws(() => f.act(p, 'chat', null, { text: '迟到' }));
    f.ref.tick();
    assert.equal(f.g.bank[p.seat], 60000);
  };
  words(hunter); // 遗言结束才开确认窗口
  assert.equal(project(f.g, null).phase, 'settling');
  assert.ok(!('badgePending' in project(f.g, null)));
  f.act(hunter, 'hunter', wolf.seat, { reveal: true });
  f.ref.tick();
  words(wolf); // 被带走者也有遗言，之后才处理警徽
  assert.equal(f.g.phase, 'badge');
  assert.throws(() => f.act(wolf, 'badge', next.seat));
  assert.throws(() => f.act(hunter, 'badge', wolf.seat));
  f.act(hunter, 'badge', next.seat);
  f.ref.tick();
  assert.equal(f.g.sheriff, next.seat);
  assert.deepEqual([f.g.phase, f.g.day], ['night', 2]);
});

test('second night death has NO last words; no sheriff means clockwise after the lowest dead seat', () => {
  const f = game(), victim = f.role('villager');
  Object.assign(f.g, { day: 2, step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: victim.seat });
  f.act(f.role('seer'), 'seer', victim.seat);
  f.ref.tick();
  f.act(victim, 'deathConfirm');
  f.ref.tick();
  assert.equal(f.g.phase, 'dawn');
  assert.ok(!f.g.lastWordsSeat);
  f.at(f.g.deadline);
  f.ref.tick();
  assert.equal(f.g.speechOrder[0], victim.seat % 9 + 1);
});

test('no extra time on signup; a self-exploding sheriff gets neither badge nor last words', () => {
  const f = game(), wolf = f.role('werewolf');
  dawn(f);
  f.at(f.g.deadline + 1);
  assert.throws(() => f.act(wolf, 'policeSignup', null, { run: true }));
  f.ref.tick();
  assert.equal(f.g.phase, 'day');
  f.g.sheriff = wolf.seat;
  f.act(wolf, 'day', null, { explode: true });
  f.ref.tick();
  assert.deepEqual([f.g.phase, f.g.sheriff, f.g.bank[wolf.seat]], ['night', null, 60000]);
});
