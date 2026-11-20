// Authenticated game commands. Raw roles, action rows and authoritative state
// never travel over the browser's Supabase table/realtime clients.
async function gameRequest(op, code, args = {}) {
  const epoch = authEpoch;
  const accountId = profile?.id;
  const current = (await client.auth.getSession()).data?.session;
  if (epoch !== authEpoch || !accountId || current?.user?.id !== accountId || !current.access_token) throw new Error('登录状态已变化');
  const token = current.access_token;
  const { data, error } = await client.functions.invoke('game', {
    headers: { Authorization: `Bearer ${token}` }, body: { op, code, ...args, accountId },
  });
  if (epoch !== authEpoch) throw new Error('登录状态已变化');
  if (error) {
    const status = error.context?.status;
    if (status === 401) {
      const latest = (await client.auth.getSession()).data?.session;
      if (epoch === authEpoch && latest?.access_token === token) showAuthScreen();
      else throw new Error('登录凭据已变化，请按当前状态重试');
      throw new Error('登录状态过期，请重新登录');
    }
    let reason = error.message;
    if (error.context?.headers?.get('content-type')?.includes('application/json')) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') reason = body.error;
    }
    throw new Error(`对局服务连接失败${status ? `（HTTP ${status}）` : ''}：${reason}`);
  }
  if (!data || data.error) {
    const failure = new Error(data?.error || '对局响应为空');
    if (data?.code === 'SETTLEMENT_RETRY') failure.retry = data.retry;
    throw failure;
  }
  return data;
}
async function createRoom() {
  const epoch = authEpoch;
  for (let i = 0; i < 6; i++) {
    const result = await gameRequest('create', randomCode(), { mode: els.modeSelect.value });
    if (epoch !== authEpoch) return;
    if (!result.collision) {
      enterRoom(result);
      return;
    }
  }
  throw new Error('房间码生成失败，请重试');
}
async function joinRoom(_name, code) {
  const epoch = authEpoch;
  const result = await gameRequest('join', code);
  if (epoch === authEpoch) enterRoom(result);
}
function membershipKey() { return `${SESSION_KEY}:${profile?.id}`; }
function newerSeat(active) {
  try {
    const record = JSON.parse(localStorage.getItem(membershipKey()));
    return record?.code === active.code && record.playerId !== active.playerId;
  } catch { return false; }
}
window.addEventListener('storage', event => {
  if (session && event.key === membershipKey() && newerSeat(session)) exitRoomLocal('座位已变化，刷新可恢复新座位');
});
async function restoreSession() {
  const epoch = authEpoch;
  const ownKey = membershipKey();
  const key = localStorage.getItem(ownKey) === null ? SESSION_KEY : ownKey;
  const saved = localStorage.getItem(key);
  if (!saved) return;
  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return;
  }
  if (!/^\d{6}$/.test(parsed?.code) || !parsed.playerId) {
    return;
  }
  if (parsed.accountId && parsed.accountId !== profile?.id) return;
  const result = await gameRequest('restore', parsed.code);
  if (epoch !== authEpoch || session || localStorage.getItem(key) !== saved) return;
  if (key === SESSION_KEY && (localStorage.getItem(ownKey) !== null || result.playerId !== parsed.playerId)) return;
  if (result.gone) localStorage.removeItem(key);
  else {
    enterRoom(result);
    if (key === SESSION_KEY && localStorage.getItem(key) === saved) localStorage.removeItem(key);
  }
}
function isPlayerOnline(member) {
  return member?.online !== false;
}
function isSeatOnline(seat) {
  return isPlayerOnline(members.find((p) => p.seat === seat));
}

function applySnapshot(data) {
  if (!session || data.code !== session.code || data.revision < (room?.revision ?? -1)) return;
  if (newerSeat(session) || data.me?.id !== session.playerId) {
    exitRoomLocal('此标签页的座位已失效。刷新可恢复当前座位，或用房间码重新加入。');
    return;
  }
  const previous = g;
  room = data;
  members = data.members;
  myRow = data.me;
  g = data.options.g;
  if (previous && previous.matchId !== g?.matchId) {
    clearPreSpeech();
    roleShown = false;
  }
  const next = g ? `${g.matchId}:${g.day}:${g.phase}:${g.step}` : 'waiting';
  if (next !== phaseKey) {
    phaseKey = next;
    pick = null;
    kickAsked = null;
  }
  submitted = new Set(data.submitted);
  wolfPicks = data.wolfPicks;
  chatRows = data.channel === 'chat' ? data.chat : [];
  wolfChatRows = data.channel === 'wolfchat' ? data.chat : [];
  if (!feedSeeded) {
    localFeed.push(`房间 ${session.code} · ${currentMode().name}`);
    feedSeeded = true;
  }
  renderRoom();
  renderChat();
  renderGameOver();
  updateHomeRoomCard();
  const key = members.map((p) => p.name).sort().join('|');
  if (key && key !== ratingsKey) {
    loadRatings().then(() => {
      if (session) renderRoom();
    });
  }
  setConn('已连接 · 服务端同步中', true);
}
let failedSettlement = null;
function clearSettlementRetry() {
  failedSettlement = null;
  els.retrySettlement.hidden = true;
}
async function retrySettlement() {
  const last = failedSettlement;
  if (!last || last.active !== session) return;
  clearSettlementRetry();
  await roomCommand(last.op, { ...last.args, retry: last.retry });
}
async function roomCommand(op, args) {
  const active = session;
  if (!active) return;
  let data;
  try {
    if (newerSeat(active)) { exitRoomLocal('座位已变化，刷新可恢复新座位'); return; }
    data = await gameRequest(op, active.code, { ...args, playerId: active.playerId });
  } catch (error) {
    const retry = error.retry;
    if (retry && active === session && retry.matchId === g?.matchId && retry.revision >= room?.revision &&
        (op !== 'snapshot' || !failedSettlement || failedSettlement.retry.revision < retry.revision)) {
      failedSettlement = { active, retry, op, args };
      const label = { leave: '离房', kick: '请离', act: '行动', snapshot: '同步' }[op];
      els.retrySettlement.textContent = `重试${label || '操作'}并保存结算`;
      els.retrySettlement.hidden = false;
    }
    throw error;
  }
  if (active !== session) return;
  if (failedSettlement && data.revision >= failedSettlement.retry.revision &&
      (data.revision > failedSettlement.retry.revision || data.options?.g?.matchId !== failedSettlement.retry.matchId ||
        (op === 'snapshot' && failedSettlement.op === 'snapshot'))) {
    clearSettlementRetry();
  }
  if (data.gone) exitRoomLocal(op === 'leave' ? '已退出房间' : '你已不在该房间');
  else applySnapshot(data);
}
async function pollOnce() {
  if (!session || document.hidden || polling) return;
  const active = polling = session;
  try {
    if (++pollTick % 8 === 0) refreshProfileQuiet().catch(() => {});
    await roomCommand('snapshot');
  } catch (error) {
    if (session === active) setConn(`同步失败，正在重试：${friendlyError(error)}`);
  } finally {
    if (polling === active) polling = null;
  }
}
async function startGame() {
  if (busy) return;
  busy = true;
  try {
    await roomCommand('start');
  } catch (e) {
    toast(friendlyError(e));
  } finally {
    busy = false;
  }
}
function replayGame() {
  return roomCommand('reset', { matchId: g?.matchId });
}
function departureContext() {
  if (!room || !session) throw new Error('房间尚未同步，请稍后重试');
  return { playerId: session.playerId, matchId: g?.matchId ?? null, ...(!g ? { lobbyRevision: room.revision } : {}) };
}
async function leaveRoom() {
  return roomCommand('leave', departureContext());
}
function addBot() {
  return roomCommand('bot');
}
async function kickMember(member) {
  kickAsked = null;
  return roomCommand('kick', { id: member.id, ...departureContext() });
}
async function act(step, target, payload = {}) {
  if (!g) return false;
  try {
    await roomCommand('act', { matchId: g.matchId, day: g.day, step, target: target ?? null, payload });
    return true;
  } catch (e) {
    toast(friendlyError(e));
    return false;
  }
}
async function spectateLoad() {
  const active = spectate;
  if (!active) return;
  const data = await gameRequest('spectate', active.code);
  if (spectate !== active) return;
  if (!data.options?.g) {
    exitSpectate();
    toast(data.gone ? '旁观的房间不存在' : '这局尚未开始或已重置');
    return;
  }
  if (data.revision < (active.room?.revision ?? -1)) return;
  Object.assign(active, { room: data, g: data.options.g, members: data.members, chatRows: data.chat });
  renderSpectate();
}
