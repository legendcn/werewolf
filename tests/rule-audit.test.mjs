import test from 'node:test';
import assert from 'node:assert/strict';
import { Rules } from '../supabase/functions/game/engine.mjs';
import { project } from '../supabase/functions/game/protocol.mjs';
import { game } from './referee-fixture.mjs';

function voteOut(f, victim) {
  Object.assign(f.g, { phase: 'vote', step: 'vote' });
  for (const p of f.roster.filter(p => p.alive)) f.act(p, 'vote', p === victim ? -1 : victim.seat);
  f.ref.tick();
}
function endWords(f, seat) {
  assert.deepEqual([f.g.phase, f.g.lastWordsSeat], ['lastwords', seat]);
  f.act(f.roster.find(p => p.seat === seat), 'lastwords', null, {end:true});
  f.ref.tick();
}
function leave(f, p, reason = 'leave') {
  f.ref.depart(p.seat, reason);
  Object.assign(p, { departed: true, online: false }); // as in the locked room transaction
}

test('an intervening departure must not settle a provisional winner before the hunter shoots', () => {
  for (const reason of ['leave', 'kick']) {
    const f = game(), { g, role } = f;
    const wolf = role('werewolf'), villager = role('villager'), hunter = role('hunter');
    // One wolf, one villager, three gods. First the hunter is voted out, then the last wolf leaves.
    for (const p of f.roster) p.alive = p === wolf || p === villager || g.teams.gods.includes(p.seat);
    g.aliveSeats = g.aliveSeats.filter(s => f.roster.some(p => p.alive && p.seat === s));
    voteOut(f, hunter);
    leave(f, wolf, reason);
    assert.equal(g.winner, null);
    assert.equal(project(g, hunter).hunterPending, hunter.seat);
    f.act(hunter, 'hunter', villager.seat, { reveal: true });
    f.ref.tick();
    assert.equal(g.deaths.at(-1).reason, 'hunter');
    assert.equal(g.hunterPending, null);
    assert.equal(g.winner, 'wolf'); // both conditions now hold; wiped villagers take precedence
    assert.equal(g.log.filter(e => e.kind === 'finish').length, 1);
  }
});

test('identical public vote, confirmation, deadline and next phase for a villager and a concealed hunter', () => {
  const original = game(), cover = game('std9', original);
  const hunter = original.role('hunter'), civilian = cover.role('villager'), swapped = cover.role('hunter');
  [civilian.role, swapped.role] = [swapped.role, civilian.role];
  cover.g.teams = Rules.groupsFromRoles(Object.fromEntries(cover.roster.map(p => [p.seat, p.role])));
  voteOut(original, hunter);
  voteOut(cover, swapped);
  const publicViews = f => [project(f.g, null), project(f.g, f.role('seer'))];
  assert.deepEqual(publicViews(original), publicViews(cover));
  assert.equal(project(cover.g, swapped).step, 'deathConfirm');
  assert.throws(() => cover.act(swapped, 'hunter', cover.role('seer').seat, { reveal: true }));
  assert.throws(() => cover.act(cover.role('seer'), 'deathConfirm'));
  assert.throws(() => original.act(hunter, 'deathConfirm'));
  original.at(original.g.deadline + 14000); cover.at(cover.g.deadline + 14000);
  original.act(hunter, 'hunter', null, { reveal: false }); cover.act(swapped, 'deathConfirm');
  original.ref.tick(); cover.ref.tick();
  assert.deepEqual(publicViews(original), publicViews(cover));
  endWords(original, hunter.seat); endWords(cover, swapped.seat);
  assert.deepEqual(publicViews(original), publicViews(cover));
  assert.equal(original.g.phase, 'night');
  assert.equal(original.g.bank[hunter.seat], 46000);
  assert.equal(cover.g.bank[swapped.seat], 46000);
  // A later ordinary death must not reveal that the real hunter has already passed.
  voteOut(original, original.role('villager'));
  assert.equal(project(original.g, null).phase, 'settling');
  original.at(original.g.deadline + 60000); original.ref.tick();
  endWords(original, original.role('villager').seat);
  assert.equal(original.g.phase, 'night');
});

test('a lover dying during another victim’s confirmation gets a full window before continuation', () => {
  const f = game('qbt12'), [a, b] = f.roster.filter(p => p.role === 'villager'), hunter = f.role('hunter');
  f.g.lovers = [b.seat, hunter.seat];
  voteOut(f, a);
  leave(f, b);
  assert.equal(project(f.g, a).step, 'deathConfirm');
  assert.throws(() => f.act(hunter, 'hunter', null, { reveal: true }));
  f.at(f.now() + 31000); f.act(a, 'deathConfirm'); f.ref.tick();
  assert.equal(f.g.deadline - f.now(), 60000);
  assert.equal(project(f.g, hunter).hunterPending, hunter.seat);
  f.act(hunter, 'hunter', null, { reveal: false }); f.ref.tick();
  endWords(f, a.seat); endWords(f, hunter.seat);
  assert.equal(f.g.day, 2);
  assert.equal(f.g.phase, 'night');
});

test('mid-speech lover death pauses the clock and a second departure does not discard the resume point', () => {
  const f = game('qbt12'), speaker = f.role('seer'), hunter = f.role('hunter');
  const [a, b] = f.roster.filter(p => p.role === 'villager');
  Object.assign(f.g, { phase: 'day', step: 'day', speechOrder: [speaker.seat], speechIndex: 0, lovers: [a.seat, hunter.seat] });
  f.at(f.g.deadline + 10000);
  leave(f, a);
  f.at(f.now() + 18000); leave(f, b, 'kick');
  f.act(hunter, 'hunter', null, { reveal: false }); f.ref.tick();
  endWords(f, hunter.seat);
  assert.equal(f.g.phase, 'day');
  assert.equal(f.now() - f.g.deadline, 10000);
  f.act(speaker, 'speech', null, { turn: 0 });
  assert.equal(f.g.bank[speaker.seat], 50000); // no charge for the 18-second pause
});

test('night timeout and return are private, including later phases; Cupid log never claims a result', () => {
  for (const [mode, role] of [['qbt12', 'cupid'], ['dz12', 'thief']]) {
    const f = game(mode), owner = f.role(role), viewer = f.role('seer');
    f.at(f.g.deadline + 60000); f.ref.tick();
    assert.deepEqual(project(f.g, owner).afk, [owner.seat]);
    for (const me of [viewer, null]) assert.deepEqual(project(f.g, me).afk, []);
    if (role === 'cupid') {
      assert.equal(f.g.lovers, null);
      const ok = game(mode), [a, b] = ok.g.aliveSeats;
      ok.act(ok.role(role), role, null, { a, b }); ok.ref.tick();
      assert.deepEqual(ok.g.lovers, [a, b]);
      assert.deepEqual(ok.g.log.at(-1), f.g.log.at(-1));
      assert.equal(f.g.log.at(-1).text, '丘比特行动结束');
    }
    Object.assign(f.g, { phase: 'vote', step: 'vote' });
    assert.deepEqual(project(f.g, viewer).afk, []);
    f.act(owner, 'afk', null, { back: true });
    assert.equal(f.g.bank[owner.seat], 0);
    assert.ok(!project(f.g, null).log.some(e => /局时用完|解除挂机/.test(e.text)));
  }
  const f = game(), p = f.role('seer');
  Object.assign(f.g, { phase: 'day', step: 'day', speechOrder: [p.seat], speechIndex: 0 });
  f.at(f.g.deadline + 60000); f.ref.tick();
  assert.deepEqual(project(f.g, null).afk, [p.seat]); // public speech still has a public timeout
  f.act(p, 'afk', null, { back: true });
  assert.deepEqual(project(f.g, null).afk, []);
});

test('a departed wolf target is not shown, cannot be saved, and cannot consume a potion at resolution', () => {
  const f = game(), witch = f.role('witch'), target = f.role('villager');
  for (const wolf of f.roster.filter(p => p.role === 'werewolf')) f.act(wolf, 'wolves', target.seat);
  f.ref.tick();
  assert.equal(project(f.g, witch).kill, target.seat);
  leave(f, target);
  assert.equal(f.g.kill, null);
  f.g.kill = target.seat; // also handle a stale snapshot made before this fix
  assert.equal(project(f.g, witch).kill, null);
  assert.throws(() => f.act(witch, 'witch', null, { save: true }));
  f.ref.record(witch.seat, 'witch', null, { save: true }); // even a previously recorded intent is rechecked
  f.ref.tick();
  assert.equal(f.g.potions.save, true);
  assert.equal(f.g.saved, false);
});

test('explosions charge interrupted speech and pending votes once, never already-submitted voters', () => {
  const f = game(), speaker = f.role('seer'), wolf = f.role('werewolf');
  Object.assign(f.g, { phase: 'day', step: 'day', speechOrder: [speaker.seat], speechIndex: 0 });
  f.at(f.g.deadline + 20000); f.act(wolf, 'day', null, { explode: true }); f.ref.tick();
  assert.equal(f.g.phase, 'night');
  assert.equal(f.g.bank[speaker.seat], 40000);
  assert.equal(f.g.bank[wolf.seat], 60000);
  f.ref.tick(); assert.equal(f.g.bank[speaker.seat], 40000);
  const v = game(), submitted = v.role('witch'), bomber = v.role('werewolf');
  Object.assign(v.g, { phase: 'vote', step: 'vote' });
  v.at(v.g.deadline + 5000); v.act(submitted, 'vote', -1);
  v.at(v.g.deadline + 20000); v.act(bomber, 'vote', null, { explode: true }); v.ref.tick();
  assert.equal(v.g.bank[submitted.seat], 55000);
  for (const p of v.roster.filter(p => p !== submitted)) assert.equal(v.g.bank[p.seat], 40000);
});
