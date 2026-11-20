import { engine, MODES } from '../supabase/functions/game/engine.mjs';
import { submit } from '../supabase/functions/game/protocol.mjs';

// Referee time, never client timestamps. A second referee can replay the same deal.
export function game(id = 'std9', saved = null) {
  const mode = MODES.find(m => m.id === id);
  const roster = saved ? structuredClone(saved.roster) : mode.roles.map((_, i) => ({ id: String(i), online: true, is_bot: false }));
  const actions = saved ? structuredClone(saved.actions) : [];
  let now = saved ? saved.now() : 1_000_000;
  const ref = engine({ state: saved ? structuredClone(saved.g) : null, roster, mode, actions, clock: () => now });
  if (!saved) ref.start();
  const g = ref.state;
  return {
    g, ref, roster, actions,
    act: (p, step, target = null, payload = {}) => submit(ref, p, { matchId: g.matchId, day: g.day, step, target, payload }, actions),
    role: r => roster.find(p => p.role === r),
    at: n => { now = n; },
    now: () => now,
  };
}
