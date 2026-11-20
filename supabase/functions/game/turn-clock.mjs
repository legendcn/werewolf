export const TURN_MS = 60_000;

// Every turn is a fixed 60 seconds. There is no per-player time bank.
// Phase-level free actions (wolf chat, self-explosion, knight duel) are not
// bound to a single turn, so they stay submittable while the phase is active.
export function turnClock(state, clock) {
  return {
    inTime(seat, optional = false) {
      return optional || clock() <= state().deadline;
    },
    expired(now) {
      return now >= state().deadline;
    },
  };
}