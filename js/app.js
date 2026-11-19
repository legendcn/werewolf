const NAME_KEY = 'wolf.name';
const SESSION_KEY = 'wolf.session';
const { ROLES, MODES, CAMPS, modeById } = window.WOLF_MODES;
const Rules = window.WolfRules;

const DUR = {
  thief: 20000,
  cupid: 20000,
  guard: 20000,
  wolves: 30000,
  wolfbeauty: 15000,
  witch: 20000,
  seer: 20000,
  dawn: 6000,
  day: 90000,
  vote: 30000,
  runoff: 25000,
  hunter: 20000,
};

const STEP_LABEL = {
  thief: '盗贼换牌',
  cupid: '丘比特连情侣',
  guard: '守卫守护',
  wolves: '狼人行动',
  wolfbeauty: '狼美人魅惑',
  witch: '女巫用药',
  seer: '预言家查验',
  dawn: '天亮了',
  day: '白天讨论',
  vote: '投票',
  runoff: 'PK 投票',
  hunter: '猎人开枪',
};

const REASON_LABEL = {
  wolf: '（被狼人杀害）',
  poison: '（被女巫毒杀）',
  vote: '（被投票放逐）',
  hunter: '（被猎人带走）',
  duel: '（决斗出局）',
  lover: '（殉情）',
  charm: '（被狼美人带走）',
  explode: '（被白狼王自爆带走）',
};

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
  statusBar: document.querySelector('#statusBar'),
  phaseLabel: document.querySelector('#phaseLabel'),
  gameClock: document.querySelector('#gameClock'),
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
  roleExtra: document.querySelector('#roleExtra'),
  playerList: document.querySelector('#playerList'),
  actionArea: document.querySelector('#actionArea'),
  feed: document.querySelector('#feed'),
  chatCard: document.querySelector('#chatCard'),
  chatFeed: document.querySelector('#chatFeed'),
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#chatInput'),
  chatNote: document.querySelector('#chatNote'),
  modeInfo: document.querySelector('#modeInfo'),
  gameOverCard: document.querySelector('#gameOverCard'),
  winnerText: document.querySelector('#winnerText'),
  revealBody: document.querySelector('#revealBody'),
  replayBtn: document.querySelector('#replayBtn'),
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
let pollTick = 0;
let busy = false;
let room = null;
let members = [];
let myRow = null;
let roleShown = false;
let localFeed = [];
let g = null;
let hostRoles = [];
let allRoles = [];
let hostTimer = null;
let hostBusy = false;
let wolfPicks = [];
let chatRows = [];
let submitted = new Set();
let pick = null;
let phaseKey = '';
let feedSeeded = false;

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

function pad(seat) {
  return String(seat).padStart(2, '0');
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
  return modeById(g?.mode || room?.options?.mode || 'std12');
}

function roomPhase() {
  return room?.options?.phase || 'waiting';
}

function isHost() {
  return members.length > 0 && members[0].id === session?.playerId;
}

function aliveSet() {
  return new Set(g?.aliveSeats || []);
}

function isAliveSeat(seat) {
  if (seat == null) return false;
  return aliveSet().has(seat);
}

function roleSeat(role) {
  const row = hostRoles.find((r) => r.role === role);
  return row ? row.seat : null;
}

function rowBySeat(seat) {
  return hostRoles.find((r) => r.seat === seat) || null;
}

function note(text) {
  const span = document.createElement('span');
  span.className = 'sr-act-hint';
  span.textContent = text;
  return span;
}

function makeBtn(label, cls, onClick, disabled = false) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn btn-sm ${cls}`;
  btn.textContent = label;
  btn.disabled = disabled;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
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
  if (roomRow.options?.phase && roomRow.options.phase !== 'waiting') {
    throw new Error('这局已经开始了，等下一局吧');
  }

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
  g = null;
  hostRoles = [];
  allRoles = [];
  roleShown = false;
  localFeed = [];
  chatRows = [];
  submitted = new Set();
  pick = null;
  phaseKey = '';
  feedSeeded = false;
  resetRoomView();
  showRoom();
  setConn('连接中…');
  loadRoom();
  loadMembers();
  subscribeRoom();
  startPolling();
}

function resetRoomView() {
  els.phaseLabel.textContent = '载入中…';
  els.seatCount.textContent = '–';
  els.gameClock.textContent = '';
  els.statusPrompt.textContent = '';
  els.modeLabel.textContent = '–';
  els.myBar.hidden = true;
  els.roleCard.hidden = true;
  els.chatCard.hidden = true;
  els.gameOverCard.hidden = true;
  els.playerList.replaceChildren();
  els.actionArea.replaceChildren();
  els.modeInfo.replaceChildren();
  els.chatFeed.replaceChildren();
  els.statusBar.classList.remove('sr-night');
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
        if (payload.eventType === 'INSERT') localFeed.push(`${payload.new.name} 加入了房间`);
        if (payload.eventType === 'DELETE') localFeed.push(`${payload.old.name} 离开了房间`);
        loadMembers();
        renderFeed();
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

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollOnce, 1600);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

let polling = false;

async function pollOnce() {
  if (!session || document.hidden || polling) return;
  polling = true;
  try {
    pollTick += 1;
    await loadRoom();
    if (!session) return;
    if (pollTick % 2 === 0) await loadMembers();
    if (!g || g.phase === 'finished') return;
    await loadMyRole();
    if (!g) return;
    if (g.phase !== 'night') await loadChat();
    if (g.phase === 'night' && g.step === 'wolves' && myRow?.role && Rules.isWolfRole(myRow.role)) {
      await loadWolfPicks();
    }
  } finally {
    polling = false;
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
    stopPolling();
    stopHost();
    localStorage.removeItem(SESSION_KEY);
    showHome();
    setStatus('房间已关闭');
    return;
  }
  applyRoom(data);
}

function applyRoom(row) {
  if (!row) return;
  // 房主正在判定时，轮询回来的旧快照不能覆盖本地的权威状态
  if (isHost() && hostBusy) return;
  const incomingG = row.options?.g || null;
  if (g) {
    if (incomingG) {
      if ((incomingG.v || 0) < (g.v || 0)) return;
    } else if (row.options?.phase === 'waiting') {
      if (g.phase !== 'finished') return;
    } else {
      return;
    }
  }
  if (!feedSeeded) {
    const mode = modeById(row.options?.mode || 'std12');
    localFeed.push(`房间 ${session?.code} · ${mode.name}（${mode.roles.length} 人）`);
    localFeed.push('把房间码发给朋友，满员后房主开牌');
    feedSeeded = true;
  }
  const previousKey = phaseKey;
  room = row;
  g = row.options?.g || null;
  const nextKey = g ? `${g.phase}:${g.step}:${g.day}` : `lobby:${row.options?.phase || 'waiting'}`;
  if (nextKey !== previousKey) {
    phaseKey = nextKey;
    pick = null;
    submitted = new Set();
    if (g && g.phase === 'finished') loadAllRoles();
  }
  if (g && g.phase !== 'finished') manageHost();
  else stopHost();
  renderRoom();
  renderGameOver();
}

function startHost() {
  stopHost();
  hostTimer = setInterval(hostTick, 900);
}

function stopHost() {
  if (hostTimer) {
    clearInterval(hostTimer);
    hostTimer = null;
  }
}

function manageHost() {
  if (isHost()) {
    if (!hostTimer) startHost();
  } else {
    stopHost();
  }
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
}

async function loadMyRole() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, seat, role')
    .eq('id', session.playerId)
    .maybeSingle();
  if (error || !data || !session) return;
  const changed = myRow?.role !== data.role || myRow?.seat !== data.seat;
  myRow = data;
  if (changed) renderRoom();
}

async function loadHostRoles() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, name, seat, role, alive')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error) return;
  hostRoles = data || [];
}

async function loadAllRoles() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, name, seat, role, alive')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error) return;
  allRoles = (data || []).slice().sort((a, b) => (a.seat || 99) - (b.seat || 99));
  renderGameOver();
}

async function loadChat() {
  if (!session || !g) return;
  const { data, error } = await client
    .from('game_actions')
    .select('player_id, payload, created_at, day')
    .eq('room_code', session.code)
    .eq('step', 'chat')
    .order('created_at', { ascending: true })
    .limit(120);
  if (error) return;
  chatRows = data || [];
  renderChat();
}

async function loadWolfPicks() {
  if (!session || !g) return;
  const { data, error } = await client
    .from('game_actions')
    .select('player_id, target_seat, created_at')
    .eq('room_code', session.code)
    .eq('day', g.day)
    .eq('step', 'wolves')
    .order('created_at', { ascending: true });
  if (error) return;
  const idToSeat = new Map(members.map((m) => [m.id, m.seat]));
  const latest = new Map();
  (data || []).forEach((row) => {
    const seat = idToSeat.get(row.player_id);
    if (seat) latest.set(seat, row.target_seat);
  });
  wolfPicks = [...latest.entries()].map(([seat, target]) => ({ seat, target }));
  renderRoom();
}

async function fetchActions(day, step) {
  const { data, error } = await client
    .from('game_actions')
    .select('player_id, target_seat, payload, created_at')
    .eq('room_code', session.code)
    .eq('day', day)
    .eq('step', step)
    .order('created_at', { ascending: true });
  if (error) return [];
  const idToSeat = new Map(hostRoles.map((r) => [r.id, r.seat]));
  const latest = new Map();
  (data || []).forEach((row) => {
    const seat = idToSeat.get(row.player_id);
    if (seat != null) latest.set(seat, { seat, target: row.target_seat, payload: row.payload || {} });
  });
  return [...latest.values()];
}

function renderFeed() {
  const entries = [];
  if (g?.log) entries.push(...g.log.slice(-100));
  localFeed.slice(-20).forEach((text) => entries.push({ kind: 'system', text }));
  const stick = els.feed.scrollHeight - els.feed.scrollTop - els.feed.clientHeight < 40;
  const frag = document.createDocumentFragment();
  entries.forEach((entry) => {
    const line = document.createElement('div');
    line.className = `sr-sys${entry.kind && entry.kind !== 'system' ? ` sr-sys-${entry.kind}` : ''}`;
    line.textContent = entry.text;
    frag.append(line);
  });
  els.feed.replaceChildren(frag);
  if (stick) els.feed.scrollTop = els.feed.scrollHeight;
}

function renderChat() {
  const frag = document.createDocumentFragment();
  chatRows.forEach((row) => {
    const wrap = document.createElement('div');
    wrap.className = 'sr-chat-msg';
    const who = document.createElement('span');
    who.className = 'sr-chat-who';
    who.textContent = row.payload?.name || '玩家';
    const text = document.createElement('span');
    text.className = 'sr-chat-text';
    text.textContent = row.payload?.text || '';
    wrap.append(who, text);
    frag.append(wrap);
  });
  els.chatFeed.replaceChildren(frag);
  els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
}

function renderRoom() {
  const mode = currentMode();
  const total = mode.roles.length;
  const inGame = Boolean(g);

  els.chatCard.hidden = !inGame;
  if (inGame) {
    els.seatCount.textContent = `${g.aliveSeats.length} / ${total} 存活`;
  } else {
    els.seatCount.textContent = `${members.length} / ${total}`;
  }

  if (inGame) {
    els.phaseLabel.textContent = phaseText();
    els.statusBar.classList.toggle('sr-night', g.phase === 'night');
    els.statusBar.classList.toggle('sr-over', g.phase === 'finished');
  } else {
    els.phaseLabel.textContent = '等待玩家';
    els.statusBar.classList.remove('sr-night');
    els.statusBar.classList.remove('sr-over');
  }

  els.modeLabel.textContent = `${mode.name} · ${total} 人`;
  renderSeats(mode, inGame);
  renderActionPanel(mode, inGame);
  renderModeInfo(mode);
  renderMyBar();
  renderStatusPrompt(mode, inGame);
  renderFeed();
  updateChatForm();
  updateClock();
}

function phaseText() {
  if (!g) return '等待玩家';
  if (g.phase === 'finished') return '对局结束';
  if (g.phase === 'night') return `第 ${g.day} 夜 · ${STEP_LABEL[g.step] || '夜晚'}`;
  if (g.phase === 'dawn') return `第 ${g.day} 天 · 天亮了`;
  if (g.phase === 'vote') return `第 ${g.day} 天 · 投票`;
  if (g.phase === 'runoff') return `第 ${g.day} 天 · PK 投票`;
  if (g.phase === 'hunter') return '猎人开枪';
  return `第 ${g.day} 天 · 讨论`;
}

function renderStatusPrompt(mode, inGame) {
  if (!inGame) {
    const total = mode.roles.length;
    const count = members.length;
    els.statusPrompt.textContent = count < total
      ? `还差 ${total - count} 人。把房间码发给朋友，满员后房主点「开始游戏」。`
      : '人齐了！等房主点「开始游戏」发牌。';
    return;
  }
  if (g.phase === 'finished') {
    els.statusPrompt.textContent = g.winReason || '本局结束';
    return;
  }
  if (!isAliveSeat(myRow?.seat)) {
    els.statusPrompt.textContent = '你已出局，可以继续围观本局。';
    return;
  }
  if (g.phase === 'night') {
    els.statusPrompt.textContent = '夜晚行动中：按顺序行动，选择目标后确认；超时未选视为放弃。';
  } else if (g.phase === 'day') {
    els.statusPrompt.textContent = '白天讨论：存活玩家在右侧发言，讨论结束后同时投票。';
  } else if (g.phase === 'vote' || g.phase === 'runoff') {
    els.statusPrompt.textContent = '投票：点击座位选择目标，不能投自己，也可以弃权。';
  } else if (g.phase === 'hunter') {
    els.statusPrompt.textContent = '猎人正在选择开枪目标…';
  } else if (g.phase === 'dawn') {
    els.statusPrompt.textContent = '天亮了，等待公布昨夜结果…';
  }
}

function updateClock() {
  if (!g || !g.deadline || g.phase === 'finished') {
    els.gameClock.textContent = '';
    return;
  }
  const left = Math.max(0, Math.ceil((g.deadline - Date.now()) / 1000));
  els.gameClock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
}

setInterval(updateClock, 500);

function renderSeats(mode, inGame) {
  const total = mode.roles.length;
  const hostId = members[0]?.id;
  const bySeat = new Map();
  members.forEach((member, index) => {
    const seat = inGame && member.seat ? member.seat : index + 1;
    bySeat.set(seat, member);
  });
  const alive = inGame ? aliveSet() : null;

  const frag = document.createDocumentFragment();
  for (let seat = 1; seat <= total; seat += 1) {
    const member = bySeat.get(seat);
    const li = document.createElement('li');
    li.className = 'sr-seat';

    const head = document.createElement('div');
    head.className = 'sr-seat-head';
    const num = document.createElement('span');
    num.className = 'sr-num';
    num.textContent = pad(seat);
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
      if (inGame && alive && !alive.has(seat)) li.classList.add('sr-dead');

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
      if (inGame && alive && !alive.has(seat)) {
        const out = document.createElement('span');
        out.className = 'badge badge-secondary';
        out.textContent = '出局';
        marks.append(out);
      }
    }

    if (pick && pick.allowed.has(seat) && member && !li.classList.contains('sr-dead')) {
      li.classList.add('sr-clickable');
      if (pick.selected.includes(seat)) li.classList.add('sr-picked');
      li.addEventListener('click', () => togglePick(seat));
    }

    li.append(head, avatar, name, marks);
    frag.append(li);
  }
  els.playerList.replaceChildren(frag);
}

function togglePick(seat) {
  if (!pick || !pick.allowed.has(seat)) return;
  if (pick.selected.includes(seat)) {
    pick.selected = pick.selected.filter((s) => s !== seat);
  } else if (pick.max === 1) {
    pick.selected = [seat];
  } else if (pick.selected.length < pick.max) {
    pick.selected.push(seat);
  } else {
    pick.selected = [...pick.selected.slice(1), seat];
  }
  renderRoom();
}

function beginPick(kind, allowed, max, onConfirm) {
  pick = { kind, allowed: new Set(allowed), max, selected: [], onConfirm };
}

function clearPick() {
  pick = null;
  renderRoom();
}

function pickButtons(onConfirm) {
  const wrap = document.createElement('div');
  wrap.className = 'sr-act w-100';
  const label = document.createElement('span');
  label.className = 'sr-act-hint';
  label.textContent = pick.selected.length ? `已选：${pick.selected.map(pad).join('、')}` : '点击座位选择目标';
  wrap.append(label);
  const ok = makeBtn('确认', 'btn-danger', () => {
    if (!pick || pick.selected.length !== pick.max) return;
    const selected = [...pick.selected];
    pick = null;
    onConfirm(selected);
  });
  ok.disabled = pick.selected.length !== pick.max;
  const cancel = makeBtn('取消', 'btn-outline-secondary', clearPick);
  wrap.append(ok, cancel);
  return wrap;
}

function submittedHelp(step) {
  return submitted.has(`${g.day}:${step}`);
}

function act(step, target, payload) {
  if (!session || !g) return;
  const key = `${g.day}:${step}`;
  client
    .from('game_actions')
    .insert({
      room_code: session.code,
      day: g.day,
      step,
      player_id: session.playerId,
      target_seat: target ?? null,
      payload: payload || {},
    })
    .then(({ error }) => {
      if (error) {
        toast(friendlyError(error));
        return;
      }
      submitted.add(key);
      toast('已提交，等待结算');
      if (isHost()) setTimeout(hostTick, 200);
      renderRoom();
    });
}

function renderActionPanel(mode, inGame) {
  els.actionArea.replaceChildren();
  if (!inGame) {
    const missing = mode.roles.length - members.length;
    if (isHost()) {
      const btn = makeBtn(
        missing > 0 ? `开始游戏（还差 ${missing} 人）` : `开始游戏（${mode.roles.length} 人）`,
        'btn-danger',
        startGame,
        missing > 0
      );
      els.actionArea.append(btn, note('满员后随机入座、随机发牌'));
    } else {
      els.actionArea.append(note(missing > 0
        ? `等待房主开始（还差 ${missing} 人）`
        : '人齐了，等待房主点「开始游戏」'));
    }
    return;
  }

  if (g.phase === 'finished') {
    els.actionArea.append(note('对局已结束。房主可以点下方「再来一局」。'));
    return;
  }

  const seat = myRow?.seat;
  const role = myRow?.role;
  const alive = isAliveSeat(seat);

  if (g.phase === 'hunter' && g.hunterPending === seat) {
    renderHunterPanel(seat);
    return;
  }
  if (!alive) {
    els.actionArea.append(note('你已出局，可以旁观；死者不能在白天发言或投票。'));
    return;
  }

  if (g.phase === 'night') {
    renderNightPanel(seat, role);
  } else if (g.phase === 'day') {
    renderDayPanel(seat, role);
  } else if (g.phase === 'vote' || g.phase === 'runoff') {
    renderVotePanel(seat);
  } else if (g.phase === 'hunter') {
    els.actionArea.append(note('等待猎人开枪…'));
  } else if (g.phase === 'dawn') {
    els.actionArea.append(note('天亮了，等待公布昨夜结果…'));
  }
}

function renderNightPanel(seat, role) {
  const step = g.step;
  if (submittedHelp(step)) {
    els.actionArea.append(note('已提交，等待结算…'));
    return;
  }

  const aliveSeats = g.aliveSeats.slice();

  if (step === 'thief' && seat === g.thiefSeat) {
    const cards = g.thiefCards || [];
    els.actionArea.append(note('盗贼行动：从两张底牌中选一张作为你的身份（另一张作废）。'));
    cards.forEach((cardKey, index) => {
      const roleDef = ROLES[cardKey];
      els.actionArea.append(makeBtn(`选 ${roleDef?.name || cardKey}`, index === 0 ? 'btn-danger' : 'btn-primary',
        () => act('thief', null, { card: index })));
    });
    return;
  }
  if (step === 'cupid' && role === 'cupid') {
    if (!pick || pick.kind !== 'cupid') {
      beginPick('cupid', aliveSeats, 2, (sel) => act('cupid', null, { a: sel[0], b: sel[1] }));
    }
    els.actionArea.append(note('丘比特行动：点击两名玩家，把他们连成情侣（可以连自己）。'));
    els.actionArea.append(pickButtons((sel) => act('cupid', null, { a: sel[0], b: sel[1] })));
    return;
  }
  if (step === 'guard' && role === 'guard') {
    const allowed = aliveSeats.filter((s) => s !== g.lastGuard);
    if (!pick || pick.kind !== 'guard') {
      beginPick('guard', allowed, 1, (sel) => act('guard', sel[0]));
    }
    els.actionArea.append(note(g.lastGuard
      ? `守卫行动：昨晚守护了 ${pad(g.lastGuard)} 号，今晚不能连守，请选择新的守护目标。`
      : '守卫行动：选择今晚要守护的人（可以守自己）。'));
    els.actionArea.append(pickButtons((sel) => act('guard', sel[0])));
    return;
  }
  if (step === 'wolves' && Rules.isWolfRole(role)) {
    const allowed = aliveSeats.slice();
    if (!pick || pick.kind !== 'wolf') {
      beginPick('wolf', allowed, 1, (sel) => act('wolves', sel[0]));
    }
    const mates = g.teams.wolves.map((s) => `${pad(s)}${g.aliveSeats.includes(s) ? '' : '✝'}`).join('、');
    const picksText = wolfPicks.length
      ? wolfPicks.map((row) => `${pad(row.seat)}→${row.target ? pad(row.target) : '弃'}`).join('  ')
      : '暂无';
    els.actionArea.append(note(`狼人行动：点击要刀的人（可以自刀）。狼队友：${mates}；同伴选择：${picksText}`));
    els.actionArea.append(pickButtons((sel) => act('wolves', sel[0])));
    return;
  }
  if (step === 'wolfbeauty' && role === 'wolfbeauty') {
    const allowed = aliveSeats.filter((s) => s !== seat && s !== g.lastCharm);
    if (!pick || pick.kind !== 'charm') {
      beginPick('charm', allowed, 1, (sel) => act('wolfbeauty', sel[0]));
    }
    els.actionArea.append(note(g.lastCharm
      ? `狼美人行动：昨晚魅惑了 ${pad(g.lastCharm)} 号，今晚不能重复，请选择新的目标。`
      : '狼美人行动：选择今晚要魅惑的玩家；你出局时他/她会殉情。'));
    els.actionArea.append(pickButtons((sel) => act('wolfbeauty', sel[0])));
    return;
  }
  if (step === 'witch' && role === 'witch') {
    els.actionArea.append(note(`女巫行动：解药${g.potions.save ? '可用' : '已用'}，毒药${g.potions.poison ? '可用' : '已用'}。一晚最多用一瓶。`));
    if (g.kill != null) {
      els.actionArea.append(note(`今晚 ${pad(g.kill)} 号被狼人袭击。`));
      if (g.potions.save) {
        els.actionArea.append(makeBtn(`用解药救 ${pad(g.kill)} 号`, 'btn-success', () => act('witch', null, { save: true })));
      }
    } else {
      els.actionArea.append(note('今晚没有人被袭击。'));
    }
    if (g.potions.poison) {
      if (pick && pick.kind === 'poison') {
        els.actionArea.append(note('毒药：点击一名玩家，再点确认。'));
        els.actionArea.append(pickButtons((sel) => act('witch', sel[0], { poison: sel[0] })));
      } else {
        els.actionArea.append(makeBtn('用毒药', 'btn-danger', () => {
          beginPick('poison', aliveSeats, 1, (sel) => act('witch', sel[0], { poison: sel[0] }));
          renderRoom();
        }));
      }
    }
    els.actionArea.append(makeBtn('不用药（过）', 'btn-outline-secondary', () => act('witch', null, {})));
    return;
  }
  if (step === 'seer' && role === 'seer') {
    const allowed = aliveSeats.filter((s) => s !== seat);
    if (!pick || pick.kind !== 'seer') {
      beginPick('seer', allowed, 1, (sel) => act('seer', sel[0]));
    }
    els.actionArea.append(note('预言家行动：选择一名玩家查验身份。'));
    els.actionArea.append(pickButtons((sel) => act('seer', sel[0])));
    const checks = (g.checks || []).filter((c) => c.seat === seat);
    if (checks.length) {
      const list = checks.map((c) => `第${c.day}夜 ${pad(c.target)}号 ${c.killer ? '狼人' : '好人'}`).join('；');
      els.actionArea.append(note(`验人记录：${list}`));
    }
    return;
  }

  els.actionArea.append(note(`第 ${g.day} 夜：等待其他人行动…`));
}

function renderDayPanel(seat, role) {
  if (role === 'knight' && !g.knightUsed && !submittedHelp('day')) {
    if (pick && pick.kind === 'duel') {
      els.actionArea.append(note('骑士决斗：对方是狼人则对方出局并直接天黑；对方是好人则你出局。'));
      els.actionArea.append(pickButtons((sel) => act('day', sel[0], { duel: sel[0] })));
    } else {
      els.actionArea.append(makeBtn('翻牌决斗', 'btn-primary', () => {
        beginPick('duel', g.aliveSeats.filter((s) => s !== seat), 1, (sel) => act('day', sel[0], { duel: sel[0] }));
        renderRoom();
      }));
      els.actionArea.append(note('白天可以发起一次决斗，投票前使用。'));
    }
  }
  if (role === 'wolfking' && !submittedHelp('day')) {
    if (pick && pick.kind === 'explode') {
      els.actionArea.append(note('白狼王自爆：选择要带走的玩家，然后立即进入黑夜。'));
      els.actionArea.append(pickButtons((sel) => act('day', sel[0], { explode: true, target: sel[0] })));
    } else {
      els.actionArea.append(makeBtn('自爆带人', 'btn-danger', () => {
        beginPick('explode', g.aliveSeats.filter((s) => s !== seat), 1, (sel) => act('day', sel[0], { explode: true, target: sel[0] }));
        renderRoom();
      }));
      els.actionArea.append(note('也可以直接在右侧发言与大家讨论。'));
    }
  }
  if (!els.actionArea.childElementCount) {
    els.actionArea.append(note('白天讨论中：在右侧发言框发言；讨论结束后自动进入投票。'));
  }
}

function renderVotePanel(seat) {
  if (submittedHelp(g.step)) {
    els.actionArea.append(note('已投票，等待其他玩家…'));
    return;
  }
  let allowed = g.aliveSeats.filter((s) => s !== seat);
  if (g.phase === 'runoff' && g.runoffSeats) {
    allowed = allowed.filter((s) => g.runoffSeats.includes(s));
  }
  if (!pick || pick.kind !== 'vote') {
    beginPick('vote', allowed, 1, (sel) => act(g.step, sel[0]));
  }
  els.actionArea.append(note(g.phase === 'runoff'
    ? `PK 投票：只能在 ${g.runoffSeats.map(pad).join('、')} 号中选择。`
    : '投票：点击座位选择你要放逐的人，不能投自己。'));
  els.actionArea.append(pickButtons((sel) => act(g.step, sel[0])));
  els.actionArea.append(makeBtn('弃权', 'btn-outline-secondary', () => act(g.step, -1)));
}

function renderHunterPanel(seat) {
  if (submittedHelp('hunter')) {
    els.actionArea.append(note('已选择开枪目标，等待结算…'));
    return;
  }
  if (!pick || pick.kind !== 'hunter') {
    beginPick('hunter', g.aliveSeats, 1, (sel) => act('hunter', sel[0]));
  }
  els.actionArea.append(note('你已出局，但可以开枪带走一名玩家（也可以不开枪）。'));
  els.actionArea.append(pickButtons((sel) => act('hunter', sel[0])));
  els.actionArea.append(makeBtn('不开枪', 'btn-outline-secondary', () => act('hunter', null)));
}

function renderMyBar() {
  const roleKey = myRow?.role;
  const seat = myRow?.seat;
  if (!g || !roleKey) {
    els.myBar.hidden = true;
    els.roleCard.hidden = true;
    return;
  }
  const role = ROLES[roleKey] || { name: roleKey, camp: 'civilian', campName: '', skill: '' };
  const camp = CAMPS[role.camp] || CAMPS.civilian;

  els.myBar.hidden = false;
  els.myBar.className = `sr-me mb-3 ${camp.bar}`.trim();
  els.mySeat.textContent = seat ? `座位 ${pad(seat)}` : '座位 —';
  els.revealBtn.textContent = roleShown ? '收起身份牌' : '查看我的身份牌';

  els.roleCard.className = `card mb-3 sr-rolecard ${role.camp === 'killer' ? 'sr-rolecard-killer' : role.camp === 'police' ? 'sr-rolecard-police' : 'sr-rolecard-neutral'}`.trim();
  els.roleTag.className = `sr-tag ${camp.tag}`;
  els.roleTag.textContent = role.name;
  els.roleName.textContent = role.name;
  els.roleCamp.textContent = role.campName || camp.name;
  els.roleSkill.textContent = role.skill;
  els.roleCard.hidden = !roleShown;

  const extras = [];
  if (g.lovers && seat != null) {
    if (g.lovers.includes(seat)) {
      const partner = g.lovers[0] === seat ? g.lovers[1] : g.lovers[0];
      const cross = g.lovers.some((s) => g.teams.wolves.includes(s)) && g.lovers.some((s) => !g.teams.wolves.includes(s));
      extras.push(`你的情侣是 ${pad(partner)} 号${cross ? '（人狼情侣，第三方阵营）' : ''}`);
    }
    if (roleKey === 'cupid') {
      extras.push(`你连的情侣：${pad(g.lovers[0])} 号 与 ${pad(g.lovers[1])} 号`);
    }
  }
  if (Rules.isWolfRole(roleKey)) {
    const mates = g.teams.wolves.filter((s) => s !== seat);
    if (mates.length) extras.push(`狼队友：${mates.map(pad).join('、')} 号`);
  }
  if (roleKey === 'seer' && g.checks?.length) {
    const mine = g.checks.filter((check) => check.seat === seat);
    if (mine.length) {
      extras.push(`验人：${mine.map((check) => `${pad(check.target)} 号${check.killer ? '狼人' : '好人'}`).join('，')}`);
    }
  }
  els.roleExtra.hidden = extras.length === 0;
  els.roleExtra.textContent = extras.join('；');
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

function renderGameOver() {
  const show = Boolean(g && g.phase === 'finished');
  els.gameOverCard.hidden = !show;
  els.replayBtn.hidden = !(show && isHost());
  if (!show) return;

  const winner = g.winner;
  const label = winner === 'wolf' ? '狼人阵营获胜' : winner === 'lovers' ? '第三方阵营获胜' : '好人阵营获胜';
  els.winnerText.className = `sr-winner ${winner === 'wolf' ? 'sr-winner-wolf' : winner === 'lovers' ? 'sr-winner-lovers' : ''}`.trim();
  els.winnerText.textContent = `${label} · ${g.winReason || ''}`;

  const rows = (allRoles.length ? allRoles : members).slice();
  rows.sort((a, b) => (a.seat || 99) - (b.seat || 99));
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const seatTd = document.createElement('td');
    seatTd.textContent = row.seat ? pad(row.seat) : '—';
    const nameTd = document.createElement('td');
    nameTd.textContent = row.name || '';
    const roleTd = document.createElement('td');
    roleTd.className = 'sr-role-tagcell';
    const role = ROLES[row.role];
    if (role) {
      const tag = document.createElement('span');
      tag.className = `sr-tag ${CAMPS[role.camp]?.tag || ''}`;
      tag.textContent = role.name;
      roleTd.append(tag);
    } else {
      roleTd.textContent = '—';
    }
    const resultTd = document.createElement('td');
    resultTd.textContent = row.alive ? '存活' : '出局';
    tr.append(seatTd, nameTd, roleTd, resultTd);
    frag.append(tr);
  });
  els.revealBody.replaceChildren(frag);
}

function updateChatForm() {
  const canChat = Boolean(g) && g.phase === 'day' && isAliveSeat(myRow?.seat);
  els.chatInput.disabled = !canChat;
  els.chatForm.querySelector('button').disabled = !canChat;
  els.chatNote.textContent = !g ? ''
    : g.phase === 'day'
      ? (canChat ? '只有存活玩家能发言' : '你已出局，只能旁观')
      : '讨论阶段才能发言';
}

async function startGame() {
  if (busy || !room) return;
  const mode = currentMode();
  const total = mode.roles.length;
  if (!isHost()) return toast('只有房主可以开始游戏');
  if (members.length !== total) return toast(`还差 ${total - members.length} 人`);
  if (g) return;

  busy = true;
  const btn = els.actionArea.querySelector('button');
  if (btn) { btn.disabled = true; btn.textContent = '发牌中…'; }

  try {
    await client.from('game_actions').delete().eq('room_code', session.code);

    const roles = Rules.shuffle([...mode.roles]);
    const seats = Rules.shuffle(Array.from({ length: total }, (_, i) => i + 1));
    for (let i = 0; i < members.length; i += 1) {
      const { error } = await client
        .from('players')
        .update({ role: roles[i], seat: seats[i], alive: true })
        .eq('id', members[i].id);
      if (error) throw error;
    }
    await loadHostRoles();
    if (hostRoles.length !== members.length) throw new Error('座位数据没写全，请重试一次');
    myRow = hostRoles.find((row) => row.id === session.playerId) || myRow;

    const rolesBySeat = {};
    hostRoles.forEach((row) => { rolesBySeat[row.seat] = row.role; });
    const teams = Rules.groupsFromRoles(rolesBySeat);
    const thiefSeat = hostRoles.find((r) => r.role === 'thief')?.seat ?? null;
    const cupidSeat = hostRoles.find((r) => r.role === 'cupid')?.seat ?? null;

    g = {
      mode: mode.id,
      phase: 'night',
      step: null,
      day: 1,
      deadline: null,
      aliveSeats: hostRoles.map((r) => r.seat).sort((a, b) => a - b),
      teams,
      lovers: null,
      cupidSeat,
      thiefSeat,
      thiefCards: thiefSeat ? drawThiefCards() : null,
      checks: [],
      potions: { save: true, poison: true },
      lastGuard: null,
      lastCharm: null,
      charmTarget: null,
      kill: null,
      guarded: null,
      saved: false,
      poison: null,
      knightUsed: false,
      voteBanned: [],
      idiotRevealed: [],
      hunterPending: null,
      hunterFrom: null,
      hunterUsed: false,
      nightQueue: [],
      nightIndex: 0,
      votes: null,
      runoffSeats: null,
      deaths: [],
      log: [{ day: 1, kind: 'system', text: `板子：${mode.name}，共 ${total} 人` }],
      winner: null,
      winReason: '',
    };
    g.log.push({ day: 1, kind: 'night', text: '第 1 夜 · 天黑请闭眼' });
    startNightInternal(true);
  } catch (error) {
    toast(`发牌失败：${friendlyError(error)}`);
    g = null;
  } finally {
    busy = false;
    renderRoom();
    renderGameOver();
  }
}

function drawThiefCards() {
  const pool = ['villager', 'villager', 'werewolf', 'hunter', 'guard', 'seer'];
  return Rules.shuffle(pool).slice(0, 2);
}

function buildNightQueue() {
  const queue = [];
  if (g.day === 1 && g.thiefSeat && isAliveSeat(g.thiefSeat)) queue.push('thief');
  if (g.day === 1 && g.cupidSeat && isAliveSeat(g.cupidSeat)) queue.push('cupid');
  const guard = roleSeat('guard');
  if (guard && isAliveSeat(guard)) queue.push('guard');
  if (g.teams.wolves.some((s) => isAliveSeat(s))) queue.push('wolves');
  const beast = roleSeat('wolfbeauty');
  if (beast && isAliveSeat(beast)) queue.push('wolfbeauty');
  const witch = roleSeat('witch');
  if (witch && isAliveSeat(witch) && (g.potions.save || g.potions.poison)) queue.push('witch');
  const seer = roleSeat('seer');
  if (seer && isAliveSeat(seer)) queue.push('seer');
  return queue;
}

function startNightInternal(first) {
  if (!first) g.day += 1;
  g.phase = 'night';
  g.kill = null;
  g.guarded = null;
  g.saved = false;
  g.poison = null;
  g.charmTarget = null;
  g.votes = null;
  g.runoffSeats = null;
  g.step = null;
  g.nightQueue = buildNightQueue();
  g.nightIndex = 0;
  if (!first) g.log.push({ day: g.day, kind: 'night', text: `第 ${g.day} 夜 · 天黑请闭眼` });
  if (g.nightQueue.length) enterStep(g.nightQueue[0]);
  else finishNight();
}

function enterStep(step) {
  g.step = step;
  g.deadline = Date.now() + (DUR[step] || 20000);
  saveGame();
}

function expectedSeats(step) {
  if (step === 'thief') return g.thiefSeat && isAliveSeat(g.thiefSeat) ? [g.thiefSeat] : [];
  if (step === 'cupid') return g.cupidSeat && isAliveSeat(g.cupidSeat) ? [g.cupidSeat] : [];
  if (step === 'guard') {
    const seat = roleSeat('guard');
    return seat && isAliveSeat(seat) ? [seat] : [];
  }
  if (step === 'wolves') return g.teams.wolves.filter((s) => isAliveSeat(s));
  if (step === 'wolfbeauty') {
    const seat = roleSeat('wolfbeauty');
    return seat && isAliveSeat(seat) ? [seat] : [];
  }
  if (step === 'witch') {
    const seat = roleSeat('witch');
    return seat && isAliveSeat(seat) ? [seat] : [];
  }
  if (step === 'seer') {
    const seat = roleSeat('seer');
    return seat && isAliveSeat(seat) ? [seat] : [];
  }
  if (step === 'hunter') return g.hunterPending != null ? [g.hunterPending] : [];
  if (step === 'vote' || step === 'runoff') {
    return g.aliveSeats.filter((s) => !g.voteBanned.includes(s));
  }
  return [];
}

function allActed(step, actions) {
  const expected = expectedSeats(step);
  if (!expected.length) return true;
  const acted = new Set(actions.filter((a) => a.payload && !a.payload.ignore).map((a) => a.seat));
  return expected.every((seat) => acted.has(seat));
}

async function hostTick() {
  if (!session || !isHost() || !g || !room || g.phase === 'finished' || hostBusy) return;
  hostBusy = true;
  try {
    if (!hostRoles.length) await loadHostRoles();
    const actions = await fetchActions(g.day, g.step || 'day');
    const now = Date.now();
    if (g.phase === 'night') {
      if (allActed(g.step, actions) || now >= g.deadline) await resolveNightStep(actions);
    } else if (g.phase === 'dawn') {
      if (now >= g.deadline) await startDay();
    } else if (g.phase === 'day') {
      const handled = await handleDaySpecial(actions);
      if (!handled && now >= g.deadline) await startVote();
    } else if (g.phase === 'vote' || g.phase === 'runoff') {
      if (allActed(g.step, actions) || now >= g.deadline) await resolveVote(actions);
    } else if (g.phase === 'hunter') {
      if (allActed('hunter', actions) || now >= g.deadline) await resolveHunter(actions);
    }
  } catch (error) {
    toast(`判定出错：${friendlyError(error)}`);
  } finally {
    hostBusy = false;
  }
}

async function resolveNightStep(actions) {
  const step = g.step;
  const get = (seat) => actions.find((a) => a.seat === seat);

  if (step === 'thief' && g.thiefSeat) {
    const row = get(g.thiefSeat);
    const index = row?.payload?.card === 1 ? 1 : 0;
    const chosen = g.thiefCards?.[index] || 'villager';
    await applyThiefChoice(g.thiefSeat, chosen);
    g.log.push({ day: g.day, kind: 'system', text: '盗贼已经换牌' });
  } else if (step === 'cupid' && g.cupidSeat) {
    const row = get(g.cupidSeat);
    const a = row?.payload?.a;
    const b = row?.payload?.b;
    if (a && b && a !== b && isAliveSeat(a) && isAliveSeat(b)) g.lovers = [a, b];
    g.log.push({ day: g.day, kind: 'system', text: '丘比特已经连好情侣' });
  } else if (step === 'guard') {
    const seat = roleSeat('guard');
    const row = get(seat);
    const target = row?.target;
    if (target && target !== g.lastGuard && isAliveSeat(target)) {
      g.guarded = target;
      g.lastGuard = target;
    }
  } else if (step === 'wolves') {
    const top = Rules.wolfKillTop(actions, g.teams.wolves, aliveSet());
    g.kill = top.length ? top[Math.floor(Math.random() * top.length)] : null;
  } else if (step === 'wolfbeauty') {
    const seat = roleSeat('wolfbeauty');
    const row = get(seat);
    const target = row?.target;
    if (target && target !== seat && target !== g.lastCharm && isAliveSeat(target)) {
      g.charmTarget = target;
      g.lastCharm = target;
    }
  } else if (step === 'witch') {
    const seat = roleSeat('witch');
    const row = get(seat);
    const payload = row?.payload || {};
    let save = Boolean(payload.save) && g.potions.save && g.kill != null;
    let poison = payload.poison;
    if (poison != null && (!isAliveSeat(poison) || !g.potions.poison)) poison = null;
    if (save && poison != null) poison = null;
    if (save) { g.saved = true; g.potions.save = false; }
    if (poison != null) { g.poison = poison; g.potions.poison = false; }
  } else if (step === 'seer') {
    const seat = roleSeat('seer');
    const row = get(seat);
    const target = row?.target;
    if (target && target !== seat && isAliveSeat(target)) {
      g.checks.push({ day: g.day, target, killer: g.teams.wolves.includes(target), seat });
    }
  }

  g.nightIndex += 1;
  if (g.nightIndex < g.nightQueue.length) {
    await enterStep(g.nightQueue[g.nightIndex]);
    renderRoom();
  } else {
    await finishNight();
  }
}

async function applyThiefChoice(seat, roleKey) {
  const row = hostRoles.find((r) => r.seat === seat);
  if (!row) return;
  const { error } = await client.from('players').update({ role: roleKey }).eq('id', row.id);
  if (error) throw error;
  row.role = roleKey;
  const rolesBySeat = {};
  hostRoles.forEach((r) => { rolesBySeat[r.seat] = r.role; });
  g.teams = Rules.groupsFromRoles(rolesBySeat);
  if (myRow?.seat === seat) {
    myRow.role = roleKey;
    renderRoom();
  }
}

async function finishNight() {
  const alive = aliveSet();
  const rawDeaths = [];
  if (g.kill != null) {
    const guarded = g.guarded === g.kill;
    const survives = guarded !== g.saved;
    if (!survives) rawDeaths.push({ seat: g.kill, reason: 'wolf' });
  }
  if (g.poison != null) rawDeaths.push({ seat: g.poison, reason: 'poison' });

  const beast = roleSeat('wolfbeauty');
  const deaths = Rules.expandDeaths(rawDeaths, {
    alive,
    lovers: g.lovers,
    wolfbeautySeat: beast,
    charmTarget: g.charmTarget,
  });

  g.kill = null;
  g.guarded = null;
  g.saved = false;
  g.poison = null;

  const outcome = await applyDeaths(deaths, 'night');
  if (outcome !== 'continue') return;

  g.phase = 'dawn';
  g.step = 'dawn';
  g.deadline = Date.now() + DUR.dawn;
  g.log.push({ day: g.day, kind: 'dawn', text: `第 ${g.day} 天 · 天亮了` });
  await saveGame();
  renderRoom();
}

async function applyDeaths(deaths, when) {
  if (!deaths.length) {
    g.log.push({ day: g.day, kind: 'dawn', text: '昨夜是平安夜' });
  }
  deaths.forEach((death) => {
    g.aliveSeats = g.aliveSeats.filter((s) => s !== death.seat);
    g.deaths.push({ day: g.day, seat: death.seat, reason: death.reason });
    g.log.push({ day: g.day, kind: 'death', text: `${pad(death.seat)} 号出局${REASON_LABEL[death.reason] || ''}` });
  });
  if (deaths.length) {
    const ids = hostRoles
      .filter((row) => deaths.some((d) => d.seat === row.seat))
      .map((row) => row.id);
    if (ids.length) {
      await client.from('players').update({ alive: false }).in('id', ids);
      hostRoles.forEach((row) => {
        if (deaths.some((d) => d.seat === row.seat)) row.alive = false;
      });
    }
  }

  const hunterDeath = deaths.find((death) => {
    const row = rowBySeat(death.seat);
    return row?.role === 'hunter' && death.reason !== 'poison' && death.reason !== 'explode';
  });
  if (hunterDeath && !g.hunterUsed) {
    g.hunterUsed = true;
    g.hunterPending = hunterDeath.seat;
    g.hunterFrom = when;
    g.phase = 'hunter';
    g.step = 'hunter';
    g.deadline = Date.now() + DUR.hunter;
    g.log.push({ day: g.day, kind: 'warning', text: `${pad(hunterDeath.seat)} 号翻牌猎人，请选择开枪目标` });
    await saveGame();
    renderRoom();
    return 'hunter';
  }

  const win = checkWin();
  if (win) {
    await finishGame(win.winner, win.reason);
    return 'finished';
  }
  return 'continue';
}

function checkWin() {
  return Rules.winCheck({
    alive: aliveSet(),
    teams: g.teams,
    lovers: g.lovers,
    cupidSeat: g.cupidSeat,
  });
}

async function finishGame(winner, reason) {
  g.phase = 'finished';
  g.step = 'finished';
  g.deadline = null;
  g.winner = winner;
  g.winReason = reason;
  const label = winner === 'wolf' ? '狼人阵营获胜' : winner === 'lovers' ? '第三方阵营获胜' : '好人阵营获胜';
  g.log.push({ day: g.day, kind: 'finish', text: `游戏结束：${label}（${reason}）` });
  stopHost();
  await saveGame();
  await loadAllRoles();
  renderRoom();
  renderGameOver();
}

async function startDawn() {
  g.phase = 'dawn';
  g.step = 'dawn';
  g.deadline = Date.now() + DUR.dawn;
  g.log.push({ day: g.day, kind: 'dawn', text: `第 ${g.day} 天 · 天亮了` });
  await saveGame();
  renderRoom();
}

async function startDay() {
  g.phase = 'day';
  g.step = 'day';
  g.deadline = Date.now() + DUR.day;
  g.log.push({ day: g.day, kind: 'system', text: `第 ${g.day} 天讨论开始（${Math.round(DUR.day / 1000)} 秒），随后投票` });
  await saveGame();
  renderRoom();
}

async function handleDaySpecial(actions) {
  const now = Date.now();
  const knightSeat = roleSeat('knight');
  const duel = knightSeat != null && !g.knightUsed
    ? actions.find((a) => a.seat === knightSeat && a.payload?.duel)
    : null;
  if (duel) {
    const target = Number(duel.payload.duel);
    g.knightUsed = true;
    if (!isAliveSeat(target) || target === knightSeat) {
      await saveGame();
      return true;
    }
    if (g.teams.wolves.includes(target)) {
      g.log.push({ day: g.day, kind: 'system', text: `骑士 ${pad(knightSeat)} 号决斗 ${pad(target)} 号：${pad(target)} 号是狼人，立即出局，直接进入黑夜` });
      const deaths = Rules.expandDeaths([{ seat: target, reason: 'duel' }], {
        alive: aliveSet(),
        lovers: g.lovers,
        wolfbeautySeat: roleSeat('wolfbeauty'),
        charmTarget: g.charmTarget,
      });
      const outcome = await applyDeaths(deaths, 'day');
      if (outcome === 'continue') await startNightInternal(false);
    } else {
      g.log.push({ day: g.day, kind: 'system', text: `骑士 ${pad(knightSeat)} 号决斗 ${pad(target)} 号：${pad(target)} 号是好人，骑士出局，白天继续` });
      const deaths = Rules.expandDeaths([{ seat: knightSeat, reason: 'duel' }], {
        alive: aliveSet(),
        lovers: g.lovers,
        wolfbeautySeat: roleSeat('wolfbeauty'),
        charmTarget: g.charmTarget,
      });
      const outcome = await applyDeaths(deaths, 'day');
      if (outcome === 'continue') {
        g.deadline = Math.max(g.deadline || 0, now + 15000);
        await saveGame();
      }
    }
    renderRoom();
    return true;
  }

  const wolfkingSeat = roleSeat('wolfking');
  const boom = wolfkingSeat != null && isAliveSeat(wolfkingSeat)
    ? actions.find((a) => a.seat === wolfkingSeat && a.payload?.explode)
    : null;
  if (boom) {
    const target = boom.payload.target != null ? Number(boom.payload.target) : null;
    g.log.push({ day: g.day, kind: 'system', text: `白狼王 ${pad(wolfkingSeat)} 号自爆${target ? `，带走 ${pad(target)} 号` : ''}，直接进入黑夜` });
    const raw = [{ seat: wolfkingSeat, reason: 'explode' }];
    if (target && isAliveSeat(target) && target !== wolfkingSeat) raw.push({ seat: target, reason: 'explode' });
    const deaths = Rules.expandDeaths(raw, {
      alive: aliveSet(),
      lovers: g.lovers,
      wolfbeautySeat: roleSeat('wolfbeauty'),
      charmTarget: g.charmTarget,
    });
    const outcome = await applyDeaths(deaths, 'day');
    if (outcome === 'continue') await startNightInternal(false);
    renderRoom();
    return true;
  }
  return false;
}

async function startVote() {
  g.phase = 'vote';
  g.step = 'vote';
  g.deadline = Date.now() + DUR.vote;
  g.votes = null;
  g.runoffSeats = null;
  g.log.push({ day: g.day, kind: 'vote', text: `投票开始（${Math.round(DUR.vote / 1000)} 秒），不能投自己，可以弃权` });
  await saveGame();
  renderRoom();
}

async function resolveVote(actions) {
  const eligible = g.aliveSeats.filter((s) => !g.voteBanned.includes(s));
  let rows = actions.filter((a) => eligible.includes(a.seat));
  if (g.phase === 'runoff' && g.runoffSeats) {
    rows = rows.map((a) => ({ ...a, target: g.runoffSeats.includes(a.target) ? a.target : -1 }));
  }
  const voteText = rows.map((a) => `${pad(a.seat)}→${a.target > 0 ? pad(a.target) : '弃'}`).join('、');
  const tally = Rules.tallyVotes(rows);
  g.votes = tally.counts;

  if (voteText) g.log.push({ day: g.day, kind: 'vote', text: `投票结果：${voteText}` });

  if (!tally.top.length) {
    g.log.push({ day: g.day, kind: 'vote', text: '无人得票，本轮无人出局' });
    await saveGame();
    await startNightInternal(false);
    return;
  }

  if (tally.top.length > 1) {
    if (g.phase === 'vote') {
      g.phase = 'runoff';
      g.step = 'runoff';
      g.runoffSeats = tally.top;
      g.deadline = Date.now() + DUR.runoff;
      g.log.push({ day: g.day, kind: 'vote', text: `平票：${tally.top.map(pad).join('、')} 号进入 PK，请重新投票` });
      await saveGame();
      renderRoom();
      return;
    }
    g.log.push({ day: g.day, kind: 'vote', text: '再次平票，本轮无人出局' });
    await saveGame();
    await startNightInternal(false);
    return;
  }

  const target = tally.top[0];
  const targetRow = rowBySeat(target);
  g.log.push({ day: g.day, kind: 'vote', text: `${pad(target)} 号得票最多（${tally.counts[target]} 票）` });

  if (targetRow?.role === 'idiot') {
    if (!g.idiotRevealed.includes(target)) {
      g.idiotRevealed.push(target);
      g.voteBanned.push(target);
      g.log.push({ day: g.day, kind: 'warning', text: `${pad(target)} 号翻开白痴牌，免于放逐，之后失去投票权` });
    } else {
      g.log.push({ day: g.day, kind: 'vote', text: `${pad(target)} 号白痴已翻牌，本轮无人出局` });
    }
    await saveGame();
    await startNightInternal(false);
    return;
  }

  const deaths = Rules.expandDeaths([{ seat: target, reason: 'vote' }], {
    alive: aliveSet(),
    lovers: g.lovers,
    wolfbeautySeat: roleSeat('wolfbeauty'),
    charmTarget: g.charmTarget,
  });
  const outcome = await applyDeaths(deaths, 'day');
  if (outcome !== 'continue') return;
  await startNightInternal(false);
}

async function resolveHunter(actions) {
  const seat = g.hunterPending;
  const row = actions.find((a) => a.seat === seat);
  const target = row?.target != null ? Number(row.target) : null;
  const from = g.hunterFrom || 'night';
  g.hunterPending = null;
  g.hunterFrom = null;

  if (target && isAliveSeat(target)) {
    g.log.push({ day: g.day, kind: 'death', text: `${pad(seat)} 号猎人开枪带走 ${pad(target)} 号` });
    const deaths = Rules.expandDeaths([{ seat: target, reason: 'hunter' }], {
      alive: aliveSet(),
      lovers: g.lovers,
      wolfbeautySeat: roleSeat('wolfbeauty'),
      charmTarget: g.charmTarget,
    });
    const outcome = await applyDeaths(deaths, 'day');
    if (outcome !== 'continue') return;
  } else {
    g.log.push({ day: g.day, kind: 'system', text: `${pad(seat)} 号猎人没有开枪` });
    const win = checkWin();
    if (win) {
      await finishGame(win.winner, win.reason);
      return;
    }
  }

  if (from === 'night') await startDawn();
  else await startNightInternal(false);
}

async function saveGame() {
  if (!session || !room || !g) return;
  g.v = (g.v || 0) + 1;
  const options = Object.assign({}, room.options || {}, {
    mode: g.mode,
    phase: g.phase === 'finished' ? 'finished' : 'playing',
    g,
  });
  const { error } = await client.from('rooms').update({ options }).eq('code', session.code);
  if (error) {
    toast(`保存对局状态失败：${friendlyError(error)}`);
    return;
  }
  room = Object.assign({}, room, { options });
  if (g.phase !== 'finished') manageHost();
}

async function leaveRoom() {
  if (g && g.phase !== 'finished' && isHost()) {
    toast('房主离开会中断整局游戏，请等本局结束');
    return;
  }
  const leaving = session;
  session = null;
  stopPolling();
  stopHost();
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  localStorage.removeItem(SESSION_KEY);
  room = null;
  members = [];
  myRow = null;
  g = null;
  hostRoles = [];
  showHome();
  if (leaving) {
    await client.from('players').delete().eq('id', leaving.playerId);
  }
  setStatus('已退出房间');
}

async function replayGame() {
  if (!g || g.phase !== 'finished' || !isHost()) return;
  busy = true;
  try {
    await client.from('game_actions').delete().eq('room_code', session.code);
    for (const member of members) {
      const { error } = await client
        .from('players')
        .update({ role: null, seat: null, alive: true })
        .eq('id', member.id);
      if (error) throw error;
    }
    const options = { mode: g.mode, phase: 'waiting' };
    const { error } = await client.from('rooms').update({ options }).eq('code', session.code);
    if (error) throw error;
    g = null;
    hostRoles = [];
    allRoles = [];
    room = Object.assign({}, room, { options });
    phaseKey = '';
    toast('已重置房间，可以重新开一局');
    loadMembers();
    renderRoom();
    renderGameOver();
  } catch (error) {
    toast(`重置失败：${friendlyError(error)}`);
  } finally {
    busy = false;
  }
}

function friendlyError(error) {
  const message = String(error?.message || error || '未知错误');
  if (/fetch|network|Load failed|Failed to fetch/i.test(message)) {
    return '网络连不上服务器，检查加速器后重试';
  }
  if (/relation .* does not exist|column .* does not exist|schema cache|42703|42P01|PGRST205/i.test(message)) {
    return '数据库还没升级，先在 Supabase SQL Editor 运行 supabase/migration-v3.sql';
  }
  if (/permission denied|row-level security/i.test(message)) {
    return '数据库权限没配好，先运行 supabase/migration-v3.sql';
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

els.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!g || g.phase !== 'day' || !isAliveSeat(myRow?.seat)) return;
  const text = els.chatInput.value.trim();
  if (!text) return;
  els.chatInput.value = '';
  act('chat', null, { name: members.find((m) => m.id === session.playerId)?.name || session.name, text });
  setTimeout(loadChat, 300);
});

els.leaveBtn.addEventListener('click', () => {
  leaveRoom().catch((error) => toast(friendlyError(error)));
});

els.replayBtn.addEventListener('click', () => {
  replayGame().catch((error) => toast(friendlyError(error)));
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
