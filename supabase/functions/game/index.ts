import postgres from 'npm:postgres@3.4.7';
import { dispatch, SettlementError } from './service.mjs';
import { GameError } from './protocol.mjs';

// Use the transaction pooler on hosted Supabase. This secret is server-only.
const db = postgres(Deno.env.get('GAME_DATABASE_URL') || Deno.env.get('SUPABASE_DB_URL')!, {
  prepare: false,
  max: 2,
  idle_timeout: 20,
  connect_timeout: 10,
});
// Projects created with the publishable-key system may not expose the legacy
// SUPABASE_ANON_KEY; fall back to the default publishable key.
function clientApiKey(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  try {
    return Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}'))[0] as string;
  } catch {
    return '';
  }
}
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json({ error: '仅支持 POST' }, 405);
  const token = req.headers.get('Authorization');
  if (!token?.startsWith('Bearer ')) return json({ error: '请登录' }, 401);
  try {
    const auth = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { Authorization: token, apikey: clientApiKey() },
    });
    if (!auth.ok) {
      return json({ error: '账号验证失败' }, auth.status === 401 || auth.status === 403 ? 401 : 503);
    }
    const { id } = await auth.json();
    if (!id) return json({ error: '请登录' }, 401);
    const raw = await req.text();
    if (raw.length > 4096) return json({ error: '请求太大' }, 413);
    let cmd;
    try {
      cmd = JSON.parse(raw);
    } catch {
      return json({ error: '请求格式无效' }, 400);
    }
    if (!cmd || typeof cmd !== 'object') return json({ error: '请求格式无效' }, 400);
    const result = await db.begin((tx) =>
      dispatch((s: string, args: postgres.ParameterOrJSON<never>[] = []) => tx.unsafe(s, args), id, cmd)
    );
    return json(result);
  } catch (e) {
    if (e instanceof SettlementError) {
      console.error('settlement rolled back', e.retry.matchId, e.cause instanceof Error ? e.cause.name : 'error');
      return json({ error: e.message, code: 'SETTLEMENT_RETRY', retry: e.retry });
    }
    if (e instanceof GameError) return json({ error: e.message });
    console.error('game transaction failed', e instanceof Error ? e.name : 'error');
    return json({ error: '对局未能同步，请重试' }, 503);
  }
});
