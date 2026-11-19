const NAME_KEY = 'wolf.name';
const SESSION_KEY = 'wolf.session';
const { ROLES, MODES, CAMPS, modeById } = window.WOLF_MODES;

const els = {
  homeView: document.querySelector('#homeView'),
  roomView: document.querySelector('#roomView'),
  nameInput: document.querySelector('#playerName'),
  modeSelect: document.querySelector('#modeSelect'),
  modeHint: document.querySelector('#modeHint'),
  createBtn: document.querySelector('#createRoom'),
  joinForm: document.querySelector('#joinForm'),
  joinBtn: document.querySelector('#joinForm button'),
  codeInput: document.querySelector('#roomCode'),
  status: document.querySelector('#status'),
  connStatus: document.querySelector('#connStatus'),
  roomCodeLabel: document.querySelector('#roomCodeLabel'),
  copyBtn: document.querySelector('#copyCode'),
  phaseLabel: document.querySelector('#phaseLabel'),
  seatCount: document.querySelector('#seatCount'),
  statusPrompt: document.querySelector('#statusPrompt'),
  modeLabel: document.querySelector('#modeLabel'),
  myBar: document.querySelector('#myBar'),
  mySeat: document.querySelector('#mySeat'),
  revealBtn: document.querySelector('#revealBtn'),
  roleCard: document.querySelector('#roleCard'),
  roleTag: document.querySelector('#roleTag'),
  roleName: document.querySelector('#roleName'),
  roleCamp: document.querySelector('#roleCamp'),
  roleSkill: document.querySelector('#roleSkill'),
  playerList: document.querySelector('#playerList'),
  actionArea: document.querySelector('#actionArea'),
  feed: document.querySelector('#feed'),
  modeInfo: document.querySelector('#modeInfo'),
  leaveBtn: document.querySelector('#leaveRoom'),
  toast: document.querySelector('#toast'),
};

const cfg = window.WOLF_CONFIG || {};
const configured = Boolean(
  window.supabase?.createClient &&
  cfg.SUPABASE_URL &&
  cfg.SUPABASE_KEY &&
  !cfg.SUPABASE_URL.includes('YOUR-PROJECT')
);
const client = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY) : null;

let session = null;
let channel = null;
let pollTimer = null;
let busy = false;
let room = null;
let members = [];
let myRow = null;
let roleShown = false;
let feedLines = [];

let toastTimer;
function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 3000);
}

function setStatus(text) {
  els.status.textContent = text;
}

function setConn(text, live = false) {
  els.connStatus.textContent = text;
  els.connStatus.classList.toggle('sr-conn-live', live);
}

function setBusy(value) {
  busy = value;
  els.createBtn.disabled = value;
  els.joinBtn.disabled = value;
}

function showRoom() {
  els.homeView.hidden = true;
  els.roomView.hidden = false;
}

function showHome() {
  els.roomView.hidden = true;
  els.homeView.hidden = false;
}

function readName() {
  const name = els.nameInput.value.trim();
  if (!name) {
    toast('先填一个昵称');
    els.nameInput.focus();
    return null;
  }
  localStorage.setItem(NAME_KEY, name);
  return name;
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function currentMode() {
  return modeById(room?.options?.mode || 'std12');
}

function phase() {
  return room?.options?.phase || 'waiting';
}

function isHost() {
  return members.length > 0 && members[0].id === session?.playerId;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function fillModeSelect() {
  const frag = document.createDocumentFragment();
  MODES.forEach((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = `${mode.name}（${mode.roles.length} 人）`;
    frag.append(option);
  });
  els.modeSelect.replaceChildren(frag);
  els.modeSelect.value = 'std12';
  updateModeHint();
}

function updateModeHint() {
  const mode = modeById(els.modeSelect.value);
  els.modeHint.textContent = `${mode.desc} 需 ${mode.roles.length} 人。`;
}

async function createRoom(name) {
  const mode = modeById(els.modeSelect.value);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    const { error } = await client
      .from('rooms')
      .insert({ code, options: { mode: mode.id, phase: 'waiting' } });
    if (!error) {
      const { data: player, error: playerError } = await client
        .from('players')
        .insert({ room_code: code, name })
        .select('id')
        .single();
      if (playerError) throw playerError;
      enterRoom({ code, playerId: player.id, name });
      return;
    }
    if (error.code !== '23505') throw error;
  }
  throw new Error('房间码生成失败，请重试');
}

async function joinRoom(name, code) {
  const { data: roomRow, error } = await client
    .from('rooms')
    .select('code, options')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  if (!roomRow) throw new Error('房间不存在，检查一下房间码');

  const mode = modeById(roomRow.options?.mode || 'std12');
  if (roomRow.options?.phase === 'assigned') throw new Error('这局已经发牌了，等下一局吧');

  const { count, error: countError } = await client
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_code', code);
  if (countError) throw countError;
  if ((count || 0) >= mode.roles.length) {
    throw new Error(`房间已满（${mode.name}固定 ${mode.roles.length} 人）`);
  }

  const { data: player, error: playerError } = await client
    .from('players')
    .insert({ room_code: code, name })
    .select('id')
    .single();
  if (playerError) throw playerError;

  enterRoom({ code, playerId: player.id, name });
}

function enterRoom(nextSession) {
  session = nextSession;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  els.roomCodeLabel.textContent = session.code;
  room = null;
  members = [];
  myRow = null;
  roleShown = false;
  feedLines = [];
  resetRoomView();
  showRoom();
  setConn('连接中…');
  loadRoom();
  loadMembers();
  subscribeRoom();
  startRoomPolling();
}

function resetRoomView() {
  els.phaseLabel.textContent = '载入中…';
  els.seatCount.textContent = '–';
  els.statusPrompt.textContent = '';
  els.modeLabel.textContent = '–';
  els.myBar.hidden = true;
  els.roleCard.hidden = true;
  els.playerList.replaceChildren();
  els.actionArea.replaceChildren();
  els.modeInfo.replaceChildren();
  renderFeed();
}

function subscribeRoom() {
  if (channel) channel.unsubscribe();
  const code = session.code;
  channel = client
    .channel(`room:${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` },
      (payload) => {
        if (!session) return;
        if (payload.eventType === 'INSERT') feed(`${payload.new.name} 加入了房间`);
        if (payload.eventType === 'DELETE') feed(`${payload.old.name} 离开了房间`);
        loadMembers();
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
      (payload) => {
        if (!session) return;
        applyRoom(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setConn('已连接 · 实时同步中', true);
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConn('实时连接异常，可尝试退出重进');
      }
    });
}

function startRoomPolling() {
  stopRoomPolling();
  pollTimer = setInterval(() => {
    if (!session || document.hidden) return;
    loadRoom();
    if (phase() !== 'assigned') loadMembers();
  }, 4000);
}

function stopRoomPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function loadRoom() {
  if (!session) return;
  const { data, error } = await client
    .from('rooms')
    .select('code, options')
    .eq('code', session.code)
    .maybeSingle();
  if (!session) return;
  if (error) return;
  if (!data) {
    session = null;
    stopRoomPolling();
    localStorage.removeItem(SESSION_KEY);
    showHome();
    setStatus('房间已关闭');
    return;
  }
  applyRoom(data);
}

function applyRoom(row) {
  const wasAssigned = phase() === 'assigned';
  room = row;
  if (!wasAssigned && phase() === 'assigned') {
    roleShown = false;
    loadMyRole();
    feed('身份已发放，游戏准备开始');
    if (session && !isHost()) toast('房主已发牌');
  }
  if (feedLines.length === 0) {
    const mode = currentMode();
    feed(`房间 ${session.code} · ${mode.name}（${mode.roles.length} 人）`);
    feed(`把房间码发给朋友，满员后房主点「开始游戏」`);
  }
  renderRoom();
}

async function loadMembers() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, name, joined_at, seat, alive')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error || !session) return;
  members = data || [];
  renderRoom();
  if (phase() === 'assigned' && !myRow) loadMyRole();
}

async function loadMyRole() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, seat, role')
    .eq('id', session.playerId)
    .maybeSingle();
  if (error || !data || !session) return;
  myRow = data;
  renderRoom();
}

function feed(text) {
  feedLines.push(text);
  if (feedLines.length > 80) feedLines.shift();
  renderFeed();
}

function renderFeed() {
  const frag = document.createDocumentFragment();
  feedLines.forEach((text) => {
    const line = document.createElement('div');
    line.className = 'sr-sys';
    line.textContent = text;
    frag.append(line);
  });
  els.feed.replaceChildren(frag);
  els.feed.scrollTop = els.feed.scrollHeight;
}

function renderRoom() {
  const mode = currentMode();
  const total = mode.roles.length;
  const started = phase() === 'assigned';
  const count = members.length;

  if (started) {
    els.phaseLabel.textContent = '身份已发放';
    els.seatCount.textContent = `${total} / ${total}`;
    els.statusPrompt.textContent = '点「查看我的身份牌」确认自己的角色与技能。夜晚行动、发言和投票将在下个版本开放。';
  } else {
    els.phaseLabel.textContent = '等待玩家';
    els.seatCount.textContent = `${count} / ${total}`;
    els.statusPrompt.textContent = count < total
      ? `还差 ${total - count} 人。把房间码发给朋友，满员后房主点「开始游戏」。`
      : '人齐了！等房主点「开始游戏」发牌。';
  }
  els.modeLabel.textContent = `${mode.name} · ${total} 人`;

  renderSeats(mode, started);
  renderAction(mode, started);
  renderModeInfo(mode);
  renderMyBar();
}

function renderSeats(mode, started) {
  const total = mode.roles.length;
  const hostId = members[0]?.id;
  const bySeat = new Map();
  members.forEach((member, index) => {
    const seat = started && Number.isInteger(member.seat) ? member.seat : index + 1;
    bySeat.set(seat, member);
  });

  const frag = document.createDocumentFragment();
  for (let seat = 1; seat <= total; seat += 1) {
    const member = bySeat.get(seat);
    const li = document.createElement('li');
    li.className = 'sr-seat';

    const head = document.createElement('div');
    head.className = 'sr-seat-head';
    const num = document.createElement('span');
    num.className = 'sr-num';
    num.textContent = String(seat).padStart(2, '0');
    head.append(num);

    const avatar = document.createElement('div');
    avatar.className = 'sr-avatar';
    const name = document.createElement('span');
    name.className = 'sr-name';
    const marks = document.createElement('div');
    marks.className = 'sr-marks';

    if (!member) {
      li.classList.add('sr-seat-empty');
      avatar.textContent = '·';
      name.textContent = '等待加入';
    } else {
      if (member.id === session.playerId) li.classList.add('sr-self');
      if (started && member.alive === false) li.classList.add('sr-dead');

      if (member.id === hostId) {
        const host = document.createElement('span');
        host.className = 'badge badge-warning';
        host.textContent = '房主';
        head.append(host);
      }

      avatar.textContent = (member.name || '?').trim().charAt(0).toUpperCase();
      name.textContent = member.name;

      if (member.id === session.playerId) {
        const me = document.createElement('span');
        me.className = 'badge badge-primary';
        me.textContent = '我';
        marks.append(me);
      }
      if (started && member.alive === false) {
        const out = document.createElement('span');
        out.className = 'badge badge-secondary';
        out.textContent = '出局';
        marks.append(out);
      }
    }

    li.append(head, avatar, name, marks);
    frag.append(li);
  }
  els.playerList.replaceChildren(frag);
}

function renderAction(mode, started) {
  els.actionArea.replaceChildren();
  const note = document.createElement('span');
  note.className = 'text-muted small';

  if (started) {
    note.textContent = '下个版本开放：夜晚行动、白天轮流发言、投票放逐与胜负判定。';
    els.actionArea.append(note);
    return;
  }

  const missing = mode.roles.length - members.length;
  if (isHost()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'startGame';
    btn.className = 'btn btn-danger';
    btn.disabled = missing > 0;
    btn.textContent = missing > 0 ? `开始游戏（还差 ${missing} 人）` : `开始游戏（${mode.roles.length} 人）`;
    btn.addEventListener('click', startGame);
    els.actionArea.append(btn);
    note.textContent = '满员后随机入座、随机发牌';
  } else {
    note.textContent = missing > 0
      ? `等待房主开始（还差 ${missing} 人）`
      : '人齐了，等待房主点「开始游戏」';
  }
  els.actionArea.append(note);
}

function renderModeInfo(mode) {
  const title = document.createElement('div');
  title.className = 'd-flex justify-content-between align-items-baseline';
  const strong = document.createElement('strong');
  strong.textContent = mode.name;
  const need = document.createElement('span');
  need.className = 'text-muted';
  need.textContent = `需 ${mode.roles.length} 人`;
  title.append(strong, need);

  const counts = {};
  const order = [];
  mode.roles.forEach((key) => {
    if (!counts[key]) { counts[key] = 0; order.push(key); }
    counts[key] += 1;
  });
  const list = document.createElement('div');
  list.className = 'mt-2';
  order.forEach((key) => {
    const role = ROLES[key];
    const tag = document.createElement('span');
    tag.className = `sr-tag ${CAMPS[role.camp]?.tag || ''} mr-1`;
    tag.textContent = role.name;
    list.append(tag);
    const num = document.createElement('span');
    num.className = 'mr-2';
    num.textContent = `×${counts[key]}`;
    list.append(num);
  });

  const desc = document.createElement('p');
  desc.className = 'text-muted mb-0 mt-2';
  desc.textContent = mode.desc;

  els.modeInfo.replaceChildren(title, list, desc);
}

function renderMyBar() {
  const roleKey = myRow?.role;
  const started = phase() === 'assigned';
  if (!started || !roleKey) {
    els.myBar.hidden = true;
    els.roleCard.hidden = true;
    return;
  }
  const role = ROLES[roleKey] || { name: roleKey, camp: 'civilian', campName: '', skill: '' };
  const camp = CAMPS[role.camp] || CAMPS.civilian;

  els.myBar.hidden = false;
  els.myBar.className = `sr-me mb-3 ${camp.bar}`.trim();
  els.mySeat.textContent = Number.isInteger(myRow.seat)
    ? `座位 ${String(myRow.seat).padStart(2, '0')}`
    : '座位 —';
  els.revealBtn.textContent = roleShown ? '收起身份牌' : '查看我的身份牌';

  els.roleCard.className = `card mb-3 sr-rolecard ${role.camp === 'killer' ? 'sr-rolecard-killer' : role.camp === 'police' ? 'sr-rolecard-police' : ''}`.trim();
  els.roleTag.className = `sr-tag ${camp.tag}`;
  els.roleTag.textContent = role.name;
  els.roleName.textContent = role.name;
  els.roleCamp.textContent = role.campName || camp.name;
  els.roleSkill.textContent = role.skill;
  els.roleCard.hidden = !roleShown;
}

async function startGame() {
  if (busy || !room) return;
  const mode = currentMode();
  const total = mode.roles.length;
  if (!isHost()) return toast('只有房主可以开始游戏');
  if (members.length !== total) return toast(`还差 ${total - members.length} 人`);
  if (phase() !== 'waiting') return;

  busy = true;
  const btn = document.querySelector('#startGame');
  if (btn) { btn.disabled = true; btn.textContent = '发牌中…'; }

  try {
    const roles = shuffle([...mode.roles]);
    const seats = shuffle(Array.from({ length: total }, (_, i) => i + 1));
    for (let i = 0; i < members.length; i += 1) {
      const { error } = await client
        .from('players')
        .update({ role: roles[i], seat: seats[i], alive: true })
        .eq('id', members[i].id);
      if (error) throw error;
    }
    const options = Object.assign({}, room.options || {}, { mode: mode.id, phase: 'assigned' });
    const { error: roomError } = await client
      .from('rooms')
      .update({ options })
      .eq('code', session.code);
    if (roomError) throw roomError;
    await loadRoom();
    await loadMembers();
    await loadMyRole();
  } catch (error) {
    toast(`发牌失败：${friendlyError(error)}`);
  } finally {
    busy = false;
    renderRoom();
  }
}

async function leaveRoom() {
  const leaving = session;
  session = null;
  stopRoomPolling();
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  localStorage.removeItem(SESSION_KEY);
  room = null;
  members = [];
  myRow = null;
  showHome();
  if (leaving) {
    await client.from('players').delete().eq('id', leaving.playerId);
  }
  setStatus('已退出房间');
}

function friendlyError(error) {
  const message = String(error?.message || error || '未知错误');
  if (/fetch|network|Load failed|Failed to fetch/i.test(message)) {
    return '网络连不上服务器，检查加速器后重试';
  }
  if (/column .* does not exist|schema cache|42703/i.test(message)) {
    return '数据库还没升级，先在 Supabase SQL Editor 运行 supabase/migration-v2.sql';
  }
  if (/permission denied|row-level security/i.test(message)) {
    return '数据库权限没配好，先运行 supabase/migration-v2.sql';
  }
  return message;
}

els.createBtn.addEventListener('click', async () => {
  if (busy) return;
  if (!guardClient()) return;
  const name = readName();
  if (!name) return;
  setBusy(true);
  try {
    await createRoom(name);
  } catch (error) {
    toast(friendlyError(error));
  } finally {
    setBusy(false);
  }
});

els.joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  if (!guardClient()) return;
  const name = readName();
  if (!name) return;
  const code = els.codeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    toast('请输入 6 位数字房间码');
    return;
  }
  setBusy(true);
  try {
    await joinRoom(name, code);
  } catch (error) {
    toast(friendlyError(error));
  } finally {
    setBusy(false);
  }
});

els.copyBtn.addEventListener('click', async () => {
  if (!session) return;
  try {
    await navigator.clipboard.writeText(session.code);
    toast('房间码已复制');
  } catch {
    toast(`复制失败，房间码是 ${session.code}`);
  }
});

els.revealBtn.addEventListener('click', () => {
  roleShown = !roleShown;
  renderMyBar();
  if (roleShown) els.roleCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

els.leaveBtn.addEventListener('click', () => {
  leaveRoom().catch((error) => toast(friendlyError(error)));
});

els.modeSelect.addEventListener('change', updateModeHint);

document.querySelector('#heroStart').addEventListener('click', (event) => {
  event.preventDefault();
  document.querySelector('#start').scrollIntoView({ behavior: 'smooth', block: 'start' });
  els.nameInput.focus({ preventScroll: true });
});

els.codeInput.addEventListener('input', () => {
  els.codeInput.value = els.codeInput.value.replace(/\D/g, '').slice(0, 6);
});

function guardClient() {
  if (client) return true;
  toast('服务器还没配置好，稍等主人填一下地址');
  return false;
}

async function restoreSession() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return;
  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  const { data } = await client
    .from('players')
    .select('id, name, room_code')
    .eq('id', parsed.playerId)
    .maybeSingle();
  if (!data) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  const { data: roomRow } = await client
    .from('rooms')
    .select('code')
    .eq('code', data.room_code)
    .maybeSingle();
  if (!roomRow) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  enterRoom({ code: data.room_code, playerId: parsed.playerId, name: data.name || parsed.name || '' });
}

async function boot() {
  fillModeSelect();

  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) els.nameInput.value = savedName;

  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('room');
  if (fromUrl && /^\d{6}$/.test(fromUrl)) els.codeInput.value = fromUrl;

  if (!client) {
    setStatus('服务器未配置 · 等待 js/config.js 填入 Supabase 地址');
    els.createBtn.disabled = true;
    els.joinBtn.disabled = true;
    return;
  }

  setStatus('服务器已连接 · 选好板子创建房间');
  try {
    await restoreSession();
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

boot();
