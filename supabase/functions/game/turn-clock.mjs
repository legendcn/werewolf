import { civicPhase } from './civic.mjs';
export const TURN_MS = 60_000;
export const BANK_MS = 60_000;

// Charge once: on acceptance, expiry, or cancellation of an unfinished turn.
// A temporary pause (e.g. a death confirmation) shifts the deadline on resume.
export function turnClock(state, expected, fetchActions, roster, clock) {
  const bankOf = (g, s) => g.bank?.[s] ?? BANK_MS; // also supports games started before v0.14
  function waiting(g) {
    if (civicPhase(g.phase)) return []; // v0.16 public scenes have a fixed 60-second limit
    const speech = g.phase === 'day';
    const seats = speech
      ? [g.speechOrder?.[g.speechIndex]].filter((s) => g.aliveSeats.includes(s))
      : expected(g.step);
    const done = new Set(
      fetchActions(g.day, speech ? 'speech' : g.step)
        .filter((a) => !speech || a.payload.turn === g.speechIndex).map((a) => a.seat),
    );
    return seats.filter((s) =>
      !done.has(s) && roster.some((p) => p.seat === s && !p.is_bot && p.online && !p.departed)
    );
  }
  function set(g, seat, amount) {
    (g.bank ??= {})[seat] = amount;
    if (amount === 0 && !(g.afk ??= []).includes(seat)) {
      g.afk.push(seat);
      if (g.phase !== 'night' && g.aliveSeats.includes(seat)) {
        (g.publicAfk ??= []).push(seat);
        g.log.push({
          day: g.day,
          kind: 'warning',
          text: `${String(seat).padStart(2, '0')} 号局时用完，进入挂机状态`,
        });
      }
    }
  }
  function hasExtra(g, s, now) {
    return !(g.afk || []).includes(s) && now < g.deadline + bankOf(g, s);
  }
  return {
    inTime(seat, optional = false) {
      const g = state(), now = clock();
      return now <= g.deadline || waiting(g).some((s) => (optional || s === seat) && hasExtra(g, s, now));
    },
    charge(seat, step) {
      const g = state(), late = clock() - g.deadline;
      if (late > 0 && step === (g.phase === 'day' ? 'speech' : g.step) && waiting(g).includes(seat)) {
        set(g, seat, Math.max(0, bankOf(g, seat) - late));
      }
    },
    // Call before removing seats or changing phase. Completed actions are not waiting.
    interrupt(removed = null) {
      const g = state(), late = clock() - g.deadline;
      if (late <= 0) return;
      for (const s of waiting(g)) {
        if (!removed || removed.includes(s)) set(g, s, Math.max(0, bankOf(g, s) - late));
      }
    },
    expired(now) {
      const g = state();
      if (now < g.deadline) return false;
      let expired = true;
      for (const s of waiting(g)) {
        if (hasExtra(g, s, now)) expired = false;
        else if (bankOf(g, s) > 0) set(g, s, 0);
      }
      return expired;
    },
  };
}
