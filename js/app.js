const MAX_PLAYERS = 12;
const NAME_KEY = 'wolf.name';
const SESSION_KEY = 'wolf.session';

const els = {
  homeView: document.querySelector('#homeView'),
  roomView: document.querySelector('#roomView'),
  nameInput: document.querySelector('#playerName'),
  createBtn: document.querySelector('#createRoom'),
  joinForm: document.querySelector('#joinForm'),
  joinBtn: document.querySelector('#joinForm button'),
  codeInput: document.querySelector('#roomCode'),
  status: document.querySelector('#status'),
  connStatus: document.querySelector('#connStatus'),
  roomCodeLabel: document.querySelector('#roomCodeLabel'),
  copyBtn: document.querySelector('#copyCode'),
  playerCount: document.querySelector('#playerCount'),
  playerList: document.querySelector('#playerList'),
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
let busy = false;

let toastTimer;
function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 2600);
}

function setStatus(text) {
  els.status.textContent = text;
}

function setConn(text) {
  els.connStatus.textContent = text;
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

async function createRoom(name) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    const { error } = await client.from('rooms').insert({ code });
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
  const { data: room, error } = await client
    .from('rooms')
    .select('code')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  if (!room) throw new Error('房间不存在，检查一下房间码');

  const { count, error: countError } = await client
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_code', code);
  if (countError) throw countError;
  if (count >= MAX_PLAYERS) throw new Error('房间已满');

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
  showRoom();
  setConn('连接中…');
  loadMembers();
  subscribeRoom();
}

function subscribeRoom() {
  if (channel) channel.unsubscribe();
  channel = client
    .channel(`room:${session.code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${session.code}` },
      () => loadMembers()
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setConn('已连接 · 实时同步中');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConn('实时连接异常，可尝试退出重进');
      }
    });
}

async function loadMembers() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, name, joined_at')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error) {
    setConn('读取玩家列表失败');
    return;
  }
  renderPlayers(data);
}

function renderPlayers(rows) {
  els.playerCount.textContent = rows.length;
  els.playerList.replaceChildren();

  if (rows.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '还没有玩家';
    els.playerList.append(li);
    return;
  }

  const hostId = rows[0].id;
  rows.forEach((row, index) => {
    const li = document.createElement('li');

    const seat = document.createElement('span');
    seat.className = 'seat';
    seat.textContent = String(index + 1).padStart(2, '0');

    const name = document.createElement('span');
    name.className = 'pname';
    name.textContent = row.name;

    li.append(seat, name);

    if (row.id === hostId) {
      const host = document.createElement('span');
      host.className = 'badge host';
      host.textContent = '房主';
      li.append(host);
    }
    if (row.id === session.playerId) {
      const me = document.createElement('span');
      me.className = 'badge me';
      me.textContent = '我';
      li.append(me);
    }
    els.playerList.append(li);
  });
}

async function leaveRoom() {
  const leaving = session;
  session = null;
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  localStorage.removeItem(SESSION_KEY);
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

els.leaveBtn.addEventListener('click', () => {
  leaveRoom().catch((error) => toast(friendlyError(error)));
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
  const { data } = await client.from('players').select('id').eq('id', parsed.playerId).maybeSingle();
  if (data) enterRoom(parsed);
  else localStorage.removeItem(SESSION_KEY);
}

async function boot() {
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

  setStatus('服务器已连接');
  try {
    await restoreSession();
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

boot();
