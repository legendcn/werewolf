import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../supabase/functions/game/protocol.mjs';
import { game } from './referee-fixture.mjs';

function voteOut(f, victim) {
  Object.assign(f.g, { phase: 'vote', step: 'vote' });
  for (const p of f.roster.filter(p => p.alive)) f.act(p, 'vote', p === victim ? -1 : victim.seat);
  f.ref.tick();
}
function drainWords(f) {
  const spoken = [];
  while (f.g.phase === 'lastwords') {
    spoken.push(f.g.lastWordsSeat);
    f.act(f.roster.find(p => p.seat === f.g.lastWordsSeat), 'lastwords', null, { end: true });
    f.ref.tick();
  }
  return spoken;
}

test('first-night deaths speak at dawn in ascending seat order, before the sheriff election', () => {
  const f = game('wmq12'), [high, low] = [f.role('witch'), f.role('villager')];
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: high.seat, poison: low.seat });
  f.act(f.role('seer'), 'seer', low.seat);
  f.ref.tick();
  assert.equal(f.g.phase, 'lastwords');
  assert.deepEqual(drainWords(f), [low.seat, high.seat].sort((a, b) => a - b));
  assert.equal(f.g.phase, 'dawn');
  f.at(f.g.deadline); f.ref.tick();
  assert.equal(f.g.phase, 'sheriff'); // 首夜遗言说完才竞选
});

test('self-explode during the election aborts it and loses the badge, without swallowing first-night words', () => {
  const f = game('wmq12'), victim = f.role('villager'), wolf = f.role('werewolf');
  Object.assign(f.g, { step: 'seer', nightIndex: f.g.nightQueue.indexOf('seer'), kill: victim.seat });
  f.act(f.role('seer'), 'seer', victim.seat);
  f.ref.tick();
  const spoken = drainWords(f);
  assert.deepEqual(spoken, [victim.seat]); // 遗言在竞选之前已经说完
  f.at(f.g.deadline); f.ref.tick();
  assert.equal(f.g.phase, 'sheriff');
  f.act(wolf, 'explode', null, { explode: true });
  f.ref.tick();
  assert.equal(f.g.phase, 'night');
  assert.equal(f.g.sheriff, null);
  assert.equal(f.g.sheriffDone, true);
  assert.equal(f.g.day, 2);
  assert.ok(f.g.log.some(e => e.text.includes('警徽流失')));
  assert.ok(!f.g.log.some(e => e.text.includes('发表遗言') && e.day === 2));
});

test('self-explode during someone’s last words interrupts it and goes straight to night', () => {
  const f = game(), victim = f.role('villager'), wolf = f.role('werewolf');
  voteOut(f, victim);
  assert.deepEqual([f.g.phase, f.g.lastWordsSeat], ['lastwords', victim.seat]);
  f.act(wolf, 'explode', null, { explode: true });
  f.ref.tick();
  assert.equal(f.g.phase, 'night');
  assert.equal(f.g.lastWordsSeat, null);
  assert.deepEqual(f.g.lastWordsQueue, []);
  assert.equal(f.g.day, 2);
});

test('a day-voted wolfbeauty and her charmed lover both get last words', () => {
  const f = game('wmq12'), beauty = f.role('wolfbeauty'), lover = f.role('villager');
  f.g.charmTarget = lover.seat;
  voteOut(f, beauty);
  assert.equal(f.g.phase, 'lastwords');
  const spoken = drainWords(f);
  assert.deepEqual(spoken, [beauty.seat, lover.seat]);
  assert.equal(f.g.phase, 'night');
  assert.ok(!f.roster.find(p => p.seat === lover.seat).alive);
});

test('knight duel: a duelled wolf dies without words and night falls; a duelled knight dies without words and day continues', () => {
  const wolfCase = game('wmq12'), knight = wolfCase.role('knight'), wolf = wolfCase.role('werewolf');
  Object.assign(wolfCase.g, { phase: 'day', step: 'day', speechOrder: [knight.seat], speechIndex: 0 });
  wolfCase.act(knight, 'day', wolf.seat, { duel: wolf.seat });
  wolfCase.ref.tick();
  assert.equal(wolfCase.g.phase, 'night');
  assert.ok(!wolf.alive);
  assert.ok(!wolfCase.g.lastWordsSeat);
  const goodCase = game('wmq12'), knight2 = goodCase.role('knight'), good = goodCase.role('seer');
  Object.assign(goodCase.g, { phase: 'day', step: 'day', speechOrder: [knight2.seat], speechIndex: 0 });
  goodCase.act(knight2, 'day', good.seat, { duel: good.seat });
  goodCase.ref.tick();
  assert.equal(goodCase.g.phase, 'day');
  assert.ok(!knight2.alive);
  assert.ok(!goodCase.g.lastWordsSeat);
});

test('a vote that ends the game settles immediately with no last words once no confirmation is possible', () => {
  const f = game(), wolf = f.role('werewolf'), villager = f.role('villager'), seer = f.role('seer');
  f.g.hunterRevealed = true;
  for (const p of f.roster) p.alive = p === wolf || p === villager || p === seer;
  f.g.aliveSeats = [wolf.seat, villager.seat, seer.seat];
  voteOut(f, wolf);
  assert.equal(f.g.phase, 'finished');
  assert.equal(f.g.winner, 'good');
  assert.deepEqual(f.g.lastWordsQueue, []);
  assert.equal(f.g.lastWordsSeat, null);
  assert.equal(project(f.g, null).phase, 'finished');
});