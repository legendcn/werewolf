const NAME_KEY = 'wolf.name';
const SESSION_KEY = 'wolf.session';
const { ROLES, MODES, CAMPS, modeById } = window.WOLF_MODES;
const Rules = window.WolfRules;

const DUR = {
  thief: 60000,
  cupid: 60000,
  guard: 60000,
  wolves: 60000,
  wolfbeauty: 60000,
  witch: 60000,
  seer: 60000,
  dawn: 6000,
  speech: 60000,
  vote: 60000,
  runoff: 60000,
  hunter: 60000,
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
  selfboom: '（自爆出局）',
  kick: '（被站长请离）',
};

const DEATH_SHORT = {
  wolf: '被狼刀',
  poison: '被毒杀',
  vote: '被放逐',
  hunter: '被猎人带走',
  duel: '决斗出局',
  lover: '殉情',
  charm: '被狼美人带走',
  explode: '自爆带走',
  selfboom: '自爆出局',
  kick: '被站长请离',
};

const els = {
  homeView: document.querySelector('#homeView'),
  roomView: document.querySelector('#roomView'),
  authCard: document.querySelector('#authCard'),
  authModal: document.querySelector('#authModal'),
  authClose: document.querySelector('#authClose'),
  accountBtn: document.querySelector('#accountBtn'),
  accountMenu: document.querySelector('#accountMenu'),
  accountTopName: document.querySelector('#accountTopName'),
  accountTopRole: document.querySelector('#accountTopRole'),
  accountTopNote: document.querySelector('#accountTopNote'),
  accountRefreshBtn: document.querySelector('#accountRefreshBtn'),
  accountAdminBtn: document.querySelector('#accountAdminBtn'),
  accountLogoutBtn: document.querySelector('#accountLogoutBtn'),
  authForms: document.querySelector('#authForms'),
  loginForm: document.querySelector('#loginForm'),
  loginName: document.querySelector('#loginName'),
  loginPass: document.querySelector('#loginPass'),
  registerForm: document.querySelector('#registerForm'),
  regName: document.querySelector('#regName'),
  regPass: document.querySelector('#regPass'),
  regPass2: document.querySelector('#regPass2'),
  accountBar: document.querySelector('#accountBar'),
  accountName: document.querySelector('#accountName'),
  accountRole: document.querySelector('#accountRole'),
  accountNote: document.querySelector('#accountNote'),
  authStatus: document.querySelector('#authStatus'),
  logoutBtn: document.querySelector('#logoutBtn'),
  refreshStatusBtn: document.querySelector('#refreshStatus'),
  activeRoomCard: document.querySelector('#activeRoomCard'),
  activeRoomCode: document.querySelector('#activeRoomCode'),
  activeRoomNote: document.querySelector('#activeRoomNote'),
  backToRoomBtn: document.querySelector('#backToRoomBtn'),
  pendingCard: document.querySelector('#pendingCard'),
  pendingTitle: document.querySelector('#pendingTitle'),
  pendingText: document.querySelector('#pendingText'),
  pendingRefresh: document.querySelector('#pendingRefresh'),
  adminCard: document.querySelector('#adminCard'),
  adminBody: document.querySelector('#adminBody'),
  adminRefresh: document.querySelector('#adminRefresh'),
  startCard: document.querySelector('#start'),
  leaderboardCard: document.querySelector('#leaderboard'),
  historyCard: document.querySelector('#historyCard'),
  historyBody: document.querySelector('#historyBody'),
  historyNote: document.querySelector('#historyNote'),
  historyRefresh: document.querySelector('#historyRefresh'),
  heroStart: document.querySelector('#heroStart'),
  nameInput: document.querySelector('#playerName'),
  modeSelect: document.querySelector('#modeSelect'),
  modeHint: document.querySelector('#modeHint'),
  createBtn: document.querySelector('#createRoom'),
  joinForm: document.querySelector('#joinForm'),
  joinBtn: document.querySelector('#joinForm button'),
  codeInput: document.querySelector('#roomCode'),
  status: document.querySelector('#status'),
  leaderboardBody: document.querySelector('#leaderboardBody'),
  leaderboardNote: document.querySelector('#leaderboardNote'),
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
  roleExplode: document.querySelector('#roleExplode'),
  roleExtra: document.querySelector('#roleExtra'),
  playerList: document.querySelector('#playerList'),
  actionArea: document.querySelector('#actionArea'),
  feed: document.querySelector('#feed'),
  chatCard: document.querySelector('#chatCard'),
  chatTitle: document.querySelector('#chatTitle'),
  chatFeed: document.querySelector('#chatFeed'),
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#chatInput'),
  chatNote: document.querySelector('#chatNote'),
  endSpeechBtn: document.querySelector('#endSpeech'),
  modeInfo: document.querySelector('#modeInfo'),
  gameOverCard: document.querySelector('#gameOverCard'),
  winnerText: document.querySelector('#winnerText'),
  resultNote: document.querySelector('#resultNote'),
  revealBody: document.querySelector('#revealBody'),
  replayBtn: document.querySelector('#replayBtn'),
  watchReplayBtn: document.querySelector('#watchReplayBtn'),
  leaveBtn: document.querySelector('#leaveRoom'),
  spectateBtn: document.querySelector('#spectateBtn'),
  spectateView: document.querySelector('#spectateView'),
  spectateCode: document.querySelector('#spectateCode'),
  spectateExit: document.querySelector('#spectateExit'),
  spectateReplayBtn: document.querySelector('#spectateReplayBtn'),
  spectateStatusBar: document.querySelector('#spectateStatusBar'),
  spectatePhase: document.querySelector('#spectatePhase'),
  spectateClock: document.querySelector('#spectateClock'),
  spectateCount: document.querySelector('#spectateCount'),
  spectatePrompt: document.querySelector('#spectatePrompt'),
  spectateMode: document.querySelector('#spectateMode'),
  spectateSeats: document.querySelector('#spectateSeats'),
  spectateChat: document.querySelector('#spectateChat'),
  spectateFeed: document.querySelector('#spectateFeed'),
  replayView: document.querySelector('#replayView'),
  replayCode: document.querySelector('#replayCode'),
  replayBack: document.querySelector('#replayBack'),
  replayWinner: document.querySelector('#replayWinner'),
  replayMeta: document.querySelector('#replayMeta'),
  replayPlayers: document.querySelector('#replayPlayers'),
  replayTimeline: document.querySelector('#replayTimeline'),
  replayLog: document.querySelector('#replayLog'),
  replayFilters: document.querySelector('#replayFilters'),
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
let wolfChatRows = [];
let presenceReady = false;
let onlineIds = new Set();
let knownOnline = new Set();
let ratings = new Map();
let ratingsKey = '';
let leaderboardData = [];
let submitted = new Set();
let pick = null;
let kickAsked = null;
let selfExited = false;
let botBusy = false;
let preSpeech = { day: 0, msgs: [] };
let preFlushing = false;
let preFailedAt = 0;
let phaseKey = '';
let feedSeeded = false;
let profile = null;
let authBusy = false;
let pendingTimer = null;
let approvedRouted = false;
let spectate = null;
let spectateTimer = null;
let spectateBusy = false;
let replayData = null;
let replayFilter = 'all';
let historyRows = [];

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

function setAuthNote(text) {
  els.authStatus.textContent = text || '';
  els.authStatus.hidden = !text;
}

function setConn(text, live = false) {
  els.connStatus.textContent = text;
  els.connStatus.classList.toggle('sr-conn-live', live);
}

function setBusy(value) {
  busy = value;
  els.createBtn.disabled = value || !accountApproved();
  els.joinBtn.disabled = value || !accountApproved();
}

function closeAccountMenu() {
  if (els.accountMenu) els.accountMenu.hidden = true;
}

function openAuthModal() {
  closeAccountMenu();
  if (els.authModal) els.authModal.hidden = false;
}

function closeAuthModal() {
  if (els.authModal) els.authModal.hidden = true;
}

function showRoom() {
  els.homeView.hidden = true;
  els.roomView.hidden = false;
  els.spectateView.hidden = true;
  els.replayView.hidden = true;
  closeAccountMenu();
}

function showHome() {
  els.roomView.hidden = true;
  els.homeView.hidden = false;
  els.spectateView.hidden = true;
  els.replayView.hidden = true;
  stopSpectate();
  spectate = null;
  closeAccountMenu();
  updateHomeRoomCard();
  if (client && accountApproved()) {
    loadLeaderboard();
    loadHistory();
  }
}

function updateHomeRoomCard() {
  const inRoom = Boolean(session);
  const approved = accountApproved();
  els.startCard.hidden = !approved || inRoom;
  els.activeRoomCard.hidden = !(approved && inRoom);
  els.heroStart.textContent = inRoom ? '返回当前对局' : '开始游戏';
  const navStart = document.querySelector('.navbar a[href="#start"]');
  if (navStart) navStart.textContent = inRoom ? '当前对局' : '开始游戏';
  if (!inRoom) return;
  els.activeRoomCode.textContent = session.code;
  els.activeRoomNote.textContent = isHost()
    ? '你是房主，对局引擎会在后台继续运行；审核完点「返回对局」即可继续。'
    : '对局还在进行，审核完点「返回对局」即可继续。';
}

function backToRoom() {
  if (!session) return;
  showRoom();
  renderRoom();
  window.scrollTo(0, 0);
}

function readName() {
  if (profile && profile.status === 'approved') return profile.username;
  const name = els.nameInput.value.trim();
  if (!name) {
    toast('先填一个昵称');
    els.nameInput.focus();
    return null;
  }
  localStorage.setItem(NAME_KEY, name);
  return name;
}

const NAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,12}$/;
const OWNER_NAME = 'legendcn';

async function sha256Hex(text) {
  if (!window.crypto?.subtle) throw new Error('浏览器不支持加密接口，请用 Chrome / Edge 打开');
  const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function emailFor(name) {
  const hash = await sha256Hex(`wolf:${name.trim().toLowerCase()}`);
  return `u_${hash.slice(0, 24)}@werewolf.local`;
}

function accountApproved() {
  return Boolean(profile && profile.status === 'approved');
}

function isAdminAccount() {
  return accountApproved() && (profile.role === 'owner' || profile.role === 'admin');
}

function isOwnerAccount() {
  return accountApproved() && profile.username === OWNER_NAME;
}

function roleLabel(role) {
  if (role === 'owner') return '站长';
  if (role === 'admin') return '管理员';
  return '成员';
}

function roleBadgeClass(role) {
  if (role === 'owner') return 'badge-danger';
  if (role === 'admin') return 'badge-info';
  return 'badge-secondary';
}

function statusLabel(status) {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已拒绝';
  if (status === 'banned') return '已封禁';
  return '待审核';
}

function statusBadgeClass(status) {
  if (status === 'approved') return 'badge-success';
  if (status === 'rejected') return 'badge-secondary';
  if (status === 'banned') return 'badge-danger';
  return 'badge-warning';
}

function friendlyAuthError(error) {
  const message = String(error?.message || error || '未知错误');
  if (/Invalid login credentials/i.test(message)) return '用户名或密码错误';
  if (/User already registered|already been registered/i.test(message)) return '这个用户名已经被注册了';
  if (/Password should be at least|password.*6/i.test(message)) return '密码至少 6 位';
  if (/Email not confirmed/i.test(message)) {
    return '注册需要邮箱确认：请站长先在 Supabase 关闭 Confirm email，再删掉这个账号重新注册';
  }
  if (/Email address .* is invalid/i.test(message)) {
    return 'Supabase 的「邮箱确认」还开着：请站长到 Authentication → Sign In / Providers → Email，把 Confirm email 关掉并保存，然后重新注册';
  }
  if (/rate limit|too many/i.test(message)) return '操作太频繁，等一分钟再试';
  if (/is_bot|profiles_status_check/i.test(message)) {
    return '数据库还没升级：先在 Supabase SQL Editor 运行 supabase/migration-v6.sql';
  }
  if (/profiles|username_taken/i.test(message)) {
    return '账号系统还没建好，先在 Supabase SQL Editor 运行 supabase/migration-v5.sql';
  }
  return friendlyError(error);
}

function applyAccountUI() {
  const has = Boolean(profile);
  const approved = accountApproved();
  els.authForms.hidden = has;
  els.accountBar.hidden = !has;
  els.pendingCard.hidden = true;
  els.leaderboardCard.hidden = !approved;
  els.historyCard.hidden = !approved;
  els.adminCard.hidden = !(approved && isAdminAccount());
  els.createBtn.disabled = busy || !approved;
  els.joinBtn.disabled = busy || !approved;

  els.accountBtn.textContent = has ? `${profile.username} ▾` : '登录 / 注册';
  els.accountTopName.textContent = has ? profile.username : '游客';
  els.accountTopRole.textContent = has ? roleLabel(profile.role) : '未登录';
  els.accountTopRole.className = `badge ${has ? roleBadgeClass(profile.role) : 'badge-secondary'}`;
  els.accountRefreshBtn.hidden = !has || approved;
  els.accountAdminBtn.hidden = !(has && approved && isAdminAccount());
  els.accountLogoutBtn.hidden = !has;

  if (!has) {
    els.accountTopNote.textContent = '登录后创建或加入房间';
    closeAccountMenu();
    els.nameInput.value = '';
    els.accountNote.textContent = '';
    updateHomeRoomCard();
    return;
  }
  els.accountName.textContent = profile.username;
  els.accountRole.textContent = roleLabel(profile.role);
  els.accountRole.className = `badge ${roleBadgeClass(profile.role)}`;
  els.refreshStatusBtn.hidden = approved;
  els.accountNote.textContent = approved
    ? ''
    : profile.status === 'banned' ? '账号已被封禁'
      : profile.status === 'rejected' ? '账号未通过审核' : '账号待审核';
  els.accountTopNote.textContent = approved
    ? `状态：已通过${isOwnerAccount() ? ' · 站长' : ''}`
    : els.accountNote.textContent;
  if (approved) {
    els.nameInput.value = profile.username;
    updateHomeRoomCard();
    return;
  }
  updateHomeRoomCard();
  els.pendingCard.hidden = false;
  els.pendingTitle.textContent = profile.status === 'banned' ? '账号已被封禁'
    : profile.status === 'rejected' ? '审核未通过' : '等待审核';
  els.pendingText.textContent = profile.status === 'banned'
    ? '你的账号被站长封禁，暂时无法进入游戏。如有疑问请联系站长解封。'
    : profile.status === 'rejected'
      ? '你的账号没有通过审核。如有疑问请联系站长。'
      : '账号已注册成功，正在等待站长或管理员审核。通过后这里会自动解锁，也可以直接点「刷新状态」。';
  els.pendingRefresh.hidden = profile.status !== 'pending';
}

function showAuthScreen() {
  profile = null;
  approvedRouted = false;
  stopPendingPoll();
  applyAccountUI();
  openAuthModal();
}

function showAuthProblem(title, text) {
  profile = null;
  approvedRouted = false;
  stopPendingPoll();
  applyAccountUI();
  els.authForms.hidden = true;
  els.accountBar.hidden = false;
  els.accountName.textContent = '—';
  els.accountRole.textContent = '未就绪';
  els.accountRole.className = 'badge badge-secondary';
  els.accountNote.textContent = '';
  els.refreshStatusBtn.hidden = false;
  els.startCard.hidden = true;
  els.leaderboardCard.hidden = true;
  els.adminCard.hidden = true;
  els.pendingTitle.textContent = title;
  els.pendingText.textContent = text;
  els.pendingRefresh.hidden = false;
  els.pendingCard.hidden = false;
}

async function afterApproved() {
  if (approvedRouted) return;
  approvedRouted = true;
  els.loginPass.value = '';
  els.regPass.value = '';
  els.regPass2.value = '';
  setAuthNote('');
  setStatus(`已登录：${profile.username}（${roleLabel(profile.role)}）`);
  closeAuthModal();
  loadLeaderboard();
  loadHistory();
  try {
    await restoreSession();
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

async function fetchProfileAndRoute() {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData?.user) {
    showAuthScreen();
    return false;
  }
  const { data, error } = await client
    .from('profiles')
    .select('id, username, role, status')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (error) {
    showAuthProblem(
      '账号系统未就绪',
      `读取账号资料失败：${friendlyError(error)}。请先在 Supabase SQL Editor 运行 supabase/migration-v5.sql。`
    );
    return false;
  }
  if (!data) {
    showAuthProblem(
      '账号资料缺失',
      '数据库里没有你的账号资料。请先在 Supabase 运行 supabase/migration-v5.sql，或联系站长。'
    );
    return false;
  }
  const wasApproved = accountApproved();
  profile = data;
  applyAccountUI();
  if (data.status === 'approved') {
    stopPendingPoll();
    if (!wasApproved) await afterApproved();
    if (isAdminAccount()) loadAdmin();
  } else if (data.status === 'pending') {
    startPendingPoll();
  } else {
    stopPendingPoll();
  }
  return true;
}

function stopPendingPoll() {
  if (pendingTimer) {
    clearInterval(pendingTimer);
    pendingTimer = null;
  }
}

function startPendingPoll() {
  stopPendingPoll();
  pendingTimer = setInterval(() => {
    refreshProfileQuiet().catch(() => {});
  }, 15000);
}

async function refreshProfileQuiet() {
  if (!profile || !client) return;
  const { data, error } = await client
    .from('profiles')
    .select('id, username, role, status')
    .eq('id', profile.id)
    .maybeSingle();
  if (error || !data) return;
  if (data.status === profile.status && data.role === profile.role) return;
  const wasApproved = accountApproved();
  profile = data;
  applyAccountUI();
  if (data.status === 'approved') {
    stopPendingPoll();
    toast('审核已通过，可以开始游戏了');
    if (!wasApproved) await afterApproved();
    if (isAdminAccount()) loadAdmin();
  } else {
    stopPendingPoll();
    if (data.status === 'banned') {
      toast('你的账号已被封禁');
      if (session) exitRoomLocal('你的账号已被封禁');
    } else if (data.status === 'rejected') {
      toast('账号未通过审核');
    }
  }
}

function adminMessageRow(text, cls) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 5;
  td.className = `text-center py-3 ${cls}`;
  td.textContent = text;
  tr.append(td);
  return tr;
}

async function loadAdmin() {
  if (!isAdminAccount()) return;
  els.adminBody.replaceChildren(adminMessageRow('加载中…', 'text-muted'));
  const { data, error } = await client
    .from('profiles')
    .select('id, username, role, status, created_at')
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) {
    els.adminBody.replaceChildren(adminMessageRow(`读取失败：${friendlyError(error)}`, 'text-danger'));
    return;
  }
  const rows = data || [];
  if (!rows.length) {
    els.adminBody.replaceChildren(adminMessageRow('还没有注册用户', 'text-muted'));
    return;
  }
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = row.username;
    if (profile && row.username === profile.username) {
      const me = document.createElement('span');
      me.className = 'badge badge-primary ml-2';
      me.textContent = '我';
      nameTd.append(me);
    }

    const statusTd = document.createElement('td');
    const statusTag = document.createElement('span');
    statusTag.className = `badge ${statusBadgeClass(row.status)}`;
    statusTag.textContent = statusLabel(row.status);
    statusTd.append(statusTag);

    const roleTd = document.createElement('td');
    const roleTag = document.createElement('span');
    roleTag.className = `badge ${roleBadgeClass(row.role)}`;
    roleTag.textContent = roleLabel(row.role);
    roleTd.append(roleTag);

    const timeTd = document.createElement('td');
    timeTd.className = 'small text-muted';
    timeTd.textContent = row.created_at
      ? new Date(row.created_at).toLocaleString('zh-CN', { hour12: false })
      : '—';

    const actTd = document.createElement('td');
    actTd.className = 'text-right';
    if (row.username === OWNER_NAME) {
      actTd.textContent = '—';
    } else if (row.status === 'banned') {
      if (isOwnerAccount()) {
        actTd.append(makeBtn('解封', 'btn-success mr-1 mb-1', () => adminUpdate(row.id, { status: 'approved' }, `已解封 ${row.username}`)));
      } else {
        const tip = document.createElement('span');
        tip.className = 'small text-muted';
        tip.textContent = '已封禁（仅站长可解封）';
        actTd.append(tip);
      }
    } else {
      if (row.status !== 'approved') {
        actTd.append(makeBtn('通过', 'btn-success mr-1 mb-1', () => adminUpdate(row.id, { status: 'approved' }, `已通过 ${row.username}`)));
      }
      if (row.status !== 'rejected') {
        actTd.append(makeBtn('拒绝', 'btn-outline-danger mr-1 mb-1', () => adminUpdate(row.id, { status: 'rejected' }, `已拒绝 ${row.username}`)));
      }
      const mayBan = row.status === 'approved'
        && (isOwnerAccount() ? row.role !== 'owner' : row.role === 'member');
      if (mayBan) {
        actTd.append(makeBtn('封禁', 'btn-danger mr-1 mb-1', () => adminUpdate(row.id, { status: 'banned' }, `已封禁 ${row.username}`)));
      }
      if (row.status === 'approved' && isOwnerAccount()) {
        if (row.role === 'admin') {
          actTd.append(makeBtn('取消管理员', 'btn-outline-secondary mr-1 mb-1', () => adminUpdate(row.id, { role: 'member' }, `已取消 ${row.username} 的管理员`)));
        } else {
          actTd.append(makeBtn('设为管理员', 'btn-outline-primary mr-1 mb-1', () => adminUpdate(row.id, { role: 'admin' }, `${row.username} 已成为管理员`)));
        }
      }
    }

    tr.append(nameTd, statusTd, roleTd, timeTd, actTd);
    frag.append(tr);
  });
  els.adminBody.replaceChildren(frag);
}

async function adminUpdate(id, patch, message) {
  if (!isAdminAccount()) return;
  const { error } = await client.from('profiles').update(patch).eq('id', id);
  if (error) {
    toast(friendlyError(error));
    return;
  }
  toast(message);
  await loadAdmin();
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

function currentSpeaker() {
  if (!g || g.phase !== 'day' || !g.speechOrder) return null;
  return g.speechOrder[g.speechIndex] ?? null;
}

function isMyWolf() {
  return Boolean(myRow?.role && Rules.isWolfRole(myRow.role));
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

function canKickMember(member) {
  if (!isOwnerAccount() || !session) return false;
  if (!member || member.id === session.playerId) return false;
  if (g && g.phase === 'finished') return false;
  if (g && g.phase !== 'finished' && member.id === members[0]?.id) return false;
  return true;
}

async function kickMember(member) {
  if (!session || !isOwnerAccount() || !member) return;
  kickAsked = null;
  if (g && g.phase !== 'finished') {
    if (!member.seat) {
      toast('这名玩家还没分到座位');
      renderRoom();
      return;
    }
    const { error } = await client.from('game_actions').insert({
      room_code: session.code,
      day: g.day,
      step: 'kick',
      player_id: session.playerId,
      target_seat: member.seat,
      payload: { kick: true },
    });
    if (error) {
      toast(friendlyError(error));
      renderRoom();
      return;
    }
    toast(`已请求踢出 ${member.name}，等房主结算`);
    renderRoom();
    if (isHost()) setTimeout(hostTick, 200);
    return;
  }
  const { error } = await client.from('players').delete().eq('id', member.id);
  if (error) {
    toast(friendlyError(error));
    renderRoom();
    return;
  }
  toast(`已把 ${member.name} 请出房间`);
  await loadMembers();
}

async function addBot() {
  if (!session || g || !isOwnerAccount() || botBusy) return;
  const total = currentMode().roles.length;
  if (members.length >= total) {
    toast('房间已经满员');
    return;
  }
  botBusy = true;
  try {
    const names = new Set(members.map((m) => m.name));
    let n = 1;
    while (names.has(`人机${n}`)) n += 1;
    const { error } = await client.from('players').insert({ room_code: session.code, name: `人机${n}`, is_bot: true });
    if (error) {
      toast(friendlyError(error));
      return;
    }
    toast(`已添加人机${n}：由房主引擎代为行动，不会发言`);
    await loadMembers();
  } finally {
    botBusy = false;
  }
}

function isBotSeat(seat) {
  const row = rowBySeat(seat);
  return Boolean(row?.is_bot);
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

  const { count: sameName, error: sameError } = await client
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_code', code)
    .eq('name', name);
  if (sameError) throw sameError;
  if ((sameName || 0) > 0) throw new Error('房间里已有同名玩家，换个昵称再进');

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
  wolfChatRows = [];
  presenceReady = false;
  onlineIds = new Set();
  knownOnline = new Set();
  ratings = new Map();
  ratingsKey = '';
  submitted = new Set();
  pick = null;
  preFlushing = false;
  preFailedAt = 0;
  loadPreSpeech();
  phaseKey = '';
  feedSeeded = false;
  resetRoomView();
  showRoom();
  updateHomeRoomCard();
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
    .channel(`room:${code}`, { config: { presence: { key: session.playerId } } })
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
    .on('presence', { event: 'sync' }, () => applyPresence())
    .on('presence', { event: 'join' }, () => applyPresence())
    .on('presence', { event: 'leave' }, () => applyPresence())
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConn('已连接 · 实时同步中', true);
        try {
          await channel.track({ player: session.playerId, name: session.name });
        } catch {
          // 离线检测失败时按“在线”处理，不影响对局
        }
        applyPresence();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConn('实时连接异常，可尝试退出重进');
      }
    });
}

function applyPresence() {
  if (!channel || !session) return;
  const state = channel.presenceState() || {};
  const ids = new Set();
  Object.values(state).forEach((list) => {
    (list || []).forEach((meta) => { if (meta.player) ids.add(meta.player); });
  });
  presenceReady = true;
  onlineIds = ids;
  ids.forEach((id) => knownOnline.add(id));
  renderRoom();
}

function isPlayerOnline(row) {
  if (!row) return true;
  if (!presenceReady || !knownOnline.has(row.id)) return true;
  return onlineIds.has(row.id);
}

function isSeatOnline(seat) {
  const row = (hostRoles.length ? hostRoles : members).find((item) => item.seat === seat);
  return row ? isPlayerOnline(row) : true;
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
    if (pollTick % 8 === 0) refreshProfileQuiet().catch(() => {});
    await loadRoom();
    if (!session) return;
    if (pollTick % 2 === 0) await loadMembers();
    if (!g || g.phase === 'finished') return;
    await loadMyRole();
    if (!g) return;
    await loadChat();
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
    kickAsked = null;
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
    .select('id, name, joined_at, seat, alive, is_bot')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error || !session) return;
  members = data || [];
  if (members.length && !members.some((m) => m.id === session.playerId)) {
    exitRoomLocal('你已被站长请出房间');
    return;
  }
  renderRoom();
  const namesKey = [...new Set(members.filter((m) => !m.is_bot).map((m) => m.name))].sort().join('|');
  if (namesKey && namesKey !== ratingsKey) {
    loadRatings().then(() => { if (session) renderRoom(); });
  }
}

async function loadRatings() {
  if (!session || !members.length) return;
  const names = [...new Set(members.map((m) => m.name))];
  const key = names.slice().sort().join('|');
  const { data, error } = await client
    .from('ratings')
    .select('name, rating')
    .in('name', names);
  if (!session) return;
  if (error) {
    ratings = new Map(names.map((name) => [name, 1500]));
    ratingsKey = key;
    return;
  }
  ratings = new Map(names.map((name) => [name, 1500]));
  (data || []).forEach((row) => ratings.set(row.name, row.rating));
  ratingsKey = key;
}

async function loadLeaderboard() {
  if (!client) return;
  els.leaderboardNote.textContent = '加载中…';
  const { data, error } = await client
    .from('ratings')
    .select('name, rating, games, wins')
    .order('rating', { ascending: false })
    .order('games', { ascending: false })
    .order('wins', { ascending: false })
    .limit(10);
  if (error) {
    leaderboardData = [];
    renderLeaderboard(true);
    return;
  }
  leaderboardData = data || [];
  renderLeaderboard();
}

function renderLeaderboard(failed = false) {
  const frag = document.createDocumentFragment();
  if (failed) {
    els.leaderboardNote.textContent = '暂不可用';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'text-center text-muted py-3';
    td.textContent = '排行榜暂不可用（先在 Supabase 运行 migration-v4.sql）';
    tr.append(td);
    frag.append(tr);
    els.leaderboardBody.replaceChildren(frag);
    return;
  }
  if (!leaderboardData.length) {
    els.leaderboardNote.textContent = '前 10 名';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'text-center text-muted py-3';
    td.textContent = '还没有对局记录，打完一局就能上榜';
    tr.append(td);
    frag.append(tr);
    els.leaderboardBody.replaceChildren(frag);
    return;
  }

  els.leaderboardNote.textContent = leaderboardData.length >= 10 ? '前 10 名' : `共 ${leaderboardData.length} 人`;
  const myName = els.nameInput.value.trim();
  leaderboardData.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (myName && row.name === myName) tr.classList.add('table-info');

    const rankTd = document.createElement('td');
    rankTd.className = `sr-rank${index < 3 ? ` sr-rank-${index + 1}` : ''}`;
    rankTd.textContent = index + 1;

    const nameTd = document.createElement('td');
    nameTd.textContent = row.name;
    if (myName && row.name === myName) {
      const me = document.createElement('span');
      me.className = 'badge badge-primary ml-2';
      me.textContent = '我';
      nameTd.append(me);
    }

    const ratingTd = document.createElement('td');
    ratingTd.className = 'text-right sr-lb-rating';
    ratingTd.textContent = row.rating;

    const gamesTd = document.createElement('td');
    gamesTd.className = 'text-right';
    gamesTd.textContent = row.games || 0;

    const rateTd = document.createElement('td');
    rateTd.className = 'text-right';
    rateTd.textContent = row.games ? `${Math.round((row.wins / row.games) * 100)}%` : '—';

    tr.append(rankTd, nameTd, ratingTd, gamesTd, rateTd);
    frag.append(tr);
  });
  els.leaderboardBody.replaceChildren(frag);
}

// ---------- 历史对局回放 ----------
function winnerTextFor(winner) {
  return winner === 'wolf' ? '狼人阵营获胜' : winner === 'lovers' ? '第三方阵营获胜' : '好人阵营获胜';
}

function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

async function loadHistory() {
  if (!client || !accountApproved()) return;
  els.historyNote.textContent = '加载中…';
  const { data, error } = await client
    .from('replays')
    .select('id, room_code, mode_name, winner, days, finished_at')
    .order('finished_at', { ascending: false })
    .limit(20);
  if (error) {
    historyRows = [];
    renderHistory(true);
    return;
  }
  historyRows = data || [];
  renderHistory();
}

function renderHistory(failed = false) {
  const frag = document.createDocumentFragment();
  const emptyRow = (text) => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'text-center text-muted py-3';
    td.textContent = text;
    tr.append(td);
    return tr;
  };
  if (failed) {
    els.historyNote.textContent = '还没有回放表：先在 Supabase SQL Editor 运行 supabase/migration-v7.sql';
    frag.append(emptyRow('历史对局暂不可用'));
    els.historyBody.replaceChildren(frag);
    return;
  }
  if (!historyRows.length) {
    els.historyNote.textContent = '打完一局后房主会自动保存回放（含全部讨论）';
    frag.append(emptyRow('还没有对局记录'));
    els.historyBody.replaceChildren(frag);
    return;
  }
  els.historyNote.textContent = `最近 ${historyRows.length} 局 · 回放包含全部发言和狼人夜间讨论`;
  historyRows.forEach((row) => {
    const tr = document.createElement('tr');
    const when = document.createElement('td');
    when.className = 'text-nowrap';
    when.textContent = formatWhen(row.finished_at);
    const mode = document.createElement('td');
    mode.textContent = row.mode_name || '—';
    const winner = document.createElement('td');
    winner.textContent = winnerTextFor(row.winner);
    const days = document.createElement('td');
    days.className = 'text-right';
    days.textContent = row.days || '—';
    const action = document.createElement('td');
    action.className = 'text-right';
    action.append(makeBtn('查看', 'btn-outline-primary', () => {
      openReplay(row.id).catch((error) => toast(friendlyError(error)));
    }));
    tr.append(when, mode, winner, days, action);
    frag.append(tr);
  });
  els.historyBody.replaceChildren(frag);
}

function showReplayView() {
  els.homeView.hidden = true;
  els.roomView.hidden = true;
  els.spectateView.hidden = true;
  els.replayView.hidden = false;
  closeAccountMenu();
  window.scrollTo(0, 0);
}

async function openReplay(id) {
  if (!guardClient()) return;
  const { data, error } = await client.from('replays').select('*').eq('id', id).maybeSingle();
  if (error) {
    toast(friendlyError(error));
    return;
  }
  if (!data) {
    toast('这条回放不存在了');
    return;
  }
  replayData = data;
  replayFilter = 'all';
  stopSpectate();
  spectate = null;
  showReplayView();
  renderReplay();
}

async function openLatestReplay(code) {
  if (!guardClient()) return;
  const { data, error } = await client
    .from('replays')
    .select('id')
    .eq('room_code', code)
    .order('finished_at', { ascending: false })
    .limit(1);
  if (error) {
    toast(friendlyError(error));
    return;
  }
  const row = (data || [])[0];
  if (!row) {
    toast('回放还没生成（需房主在线结算）或数据库未升级');
    return;
  }
  await openReplay(row.id);
}

function replaySeatText(seat, name) {
  if (seat == null) return name || '—';
  return `${pad(seat)} 号${name ? ` · ${name}` : ''}`;
}

function renderReplay() {
  const data = replayData;
  if (!data) return;
  els.replayCode.textContent = data.room_code || '------';
  els.replayWinner.className = `sr-winner ${data.winner === 'wolf' ? 'sr-winner-wolf' : data.winner === 'lovers' ? 'sr-winner-lovers' : ''}`.trim();
  els.replayWinner.textContent = `${winnerTextFor(data.winner)} · ${data.win_reason || ''}`;
  const events = data.events || [];
  const talkCount = events.filter((ev) => ev.t === 'chat' || ev.t === 'wolfchat').length;
  els.replayMeta.textContent = [
    `板子：${data.mode_name || data.mode || '未知'}`,
    `共 ${data.days || 0} 天`,
    `结束于 ${formatWhen(data.finished_at)}`,
    data.rating?.k ? `评分 K=${data.rating.k}` : '',
    `讨论 ${talkCount} 条（含狼人频道）`,
  ].filter(Boolean).join(' · ');
  renderReplayPlayers();
  renderReplayLog();
  renderReplayTimeline();
  els.replayFilters.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('btn-dark', btn.dataset.filter === replayFilter);
    btn.classList.toggle('btn-outline-dark', btn.dataset.filter !== replayFilter);
  });
}

function renderReplayPlayers() {
  const data = replayData;
  const players = (data.players || []).slice().sort((a, b) => (a.seat || 99) - (b.seat || 99));
  const detail = new Map((data.rating?.players || []).map((item) => [item.seat, item]));
  const frag = document.createDocumentFragment();
  players.forEach((player) => {
    const tr = document.createElement('tr');
    const seatTd = document.createElement('td');
    seatTd.textContent = player.seat ? pad(player.seat) : '—';
    const nameTd = document.createElement('td');
    nameTd.textContent = player.name || '';
    if (player.is_bot) {
      const bot = document.createElement('span');
      bot.className = 'badge badge-info ml-2';
      bot.textContent = '人机';
      nameTd.append(bot);
    }
    const roleTd = document.createElement('td');
    const role = ROLES[player.role];
    if (role) {
      const tag = document.createElement('span');
      tag.className = `sr-tag ${CAMPS[role.camp]?.tag || ''}`;
      tag.textContent = role.name;
      roleTd.append(tag);
    } else {
      roleTd.textContent = '—';
    }
    const deathTd = document.createElement('td');
    deathTd.className = 'text-muted';
    if (player.kicked) {
      deathTd.textContent = '被站长请离';
    } else if (player.death) {
      deathTd.textContent = `第 ${player.death.day} 天 · ${DEATH_SHORT[player.death.reason] || ''}`.trim();
    } else {
      deathTd.textContent = '存活到最后';
    }
    const ratingTd = document.createElement('td');
    ratingTd.className = 'text-right';
    const item = detail.get(player.seat);
    if (player.is_bot) {
      ratingTd.className = 'text-right text-muted';
      ratingTd.textContent = '人机不计分';
    } else if (item) {
      ratingTd.className = `text-right ${item.delta >= 0 ? 'sr-delta-up' : 'sr-delta-down'}`;
      ratingTd.textContent = `${item.before} → ${item.after}（${item.delta >= 0 ? '+' : ''}${item.delta}）`;
    } else {
      ratingTd.textContent = '—';
    }
    tr.append(seatTd, nameTd, roleTd, deathTd, ratingTd);
    frag.append(tr);
  });
  els.replayPlayers.replaceChildren(frag);
}

function renderReplayLog() {
  const entries = replayData?.log || [];
  const frag = document.createDocumentFragment();
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'text-muted small';
    empty.textContent = '没有流程记录';
    frag.append(empty);
  }
  entries.forEach((entry) => {
    const line = document.createElement('div');
    line.className = `sr-sys${entry.kind && entry.kind !== 'system' ? ` sr-sys-${entry.kind}` : ''}`;
    line.textContent = entry.text;
    frag.append(line);
  });
  els.replayLog.replaceChildren(frag);
}

function replayEventMatches(ev) {
  if (replayFilter === 'all') return true;
  if (replayFilter === 'vote') return ev.t === 'vote';
  return ev.t === replayFilter;
}

function replayNightText(ev) {
  const who = replaySeatText(ev.seat);
  const target = ev.target != null && ev.target > 0 ? `${pad(ev.target)} 号` : null;
  const payload = ev.payload || {};
  switch (ev.step) {
    case 'thief': return '盗贼换牌（底牌已选）';
    case 'cupid': return `丘比特连线：${payload.a ? `${pad(payload.a)} 号` : '?'} 与 ${payload.b ? `${pad(payload.b)} 号` : '?'}`;
    case 'guard': return `守卫 ${who} 守护 ${target || '（无）'}`;
    case 'wolves': return `狼人 ${who} 刀 ${target || '空刀'}`;
    case 'wolfbeauty': return `狼美人 ${who} 魅惑 ${target || '（无）'}`;
    case 'witch': {
      const parts = [];
      if (payload.save) parts.push('使用解药');
      if (payload.poison) parts.push(`毒 ${pad(payload.poison)} 号`);
      return `女巫 ${who} ${parts.length ? parts.join('，') : '没有用药'}`;
    }
    case 'seer': return `预言家 ${who} 查验 ${target || '（无）'}`;
    default: return `${STEP_LABEL[ev.step] || '夜间行动'}：${who}${target ? ` → ${target}` : ''}`;
  }
}

function replayEventNode(ev) {
  const line = document.createElement('div');
  const dayChip = document.createElement('span');
  dayChip.className = 'sr-ev-day';
  dayChip.textContent = ev.t === 'night' ? `第${ev.day}夜` : `第${ev.day}天`;
  let cls = 'sr-ev';
  let text = '';
  if (ev.t === 'chat') {
    text = `${replaySeatText(ev.seat, ev.name)}：${ev.text}`;
  } else if (ev.t === 'wolfchat') {
    cls += ' sr-ev-wolf';
    text = `狼人频道 · ${replaySeatText(ev.seat, ev.name)}：${ev.text}`;
  } else if (ev.t === 'night') {
    cls += ' sr-ev-night';
    text = replayNightText(ev);
  } else if (ev.t === 'vote') {
    cls += ' sr-ev-vote';
    const target = ev.target != null && ev.target > 0 ? `${pad(ev.target)} 号` : '弃权';
    text = `${ev.step === 'runoff' ? 'PK 投票' : '投票'}：${replaySeatText(ev.seat)} → ${target}`;
  } else if (ev.t === 'speech') {
    cls += ' sr-ev-muted';
    text = `${replaySeatText(ev.seat)} 结束发言`;
  } else if (ev.t === 'explode') {
    cls += ' sr-ev-warn';
    text = `${replaySeatText(ev.seat)} 自爆${ev.target ? `，带走 ${pad(ev.target)} 号` : ''}`;
  } else if (ev.t === 'kick') {
    cls += ' sr-ev-warn';
    text = `站长把 ${replaySeatText(ev.target)} 请出了房间`;
  } else {
    cls += ' sr-ev-muted';
    text = replaySeatText(ev.seat);
  }
  line.className = cls;
  line.append(dayChip, document.createTextNode(text));
  return line;
}

function renderReplayTimeline() {
  const events = (replayData?.events || []).filter(replayEventMatches);
  const frag = document.createDocumentFragment();
  if (!events.length) {
    const empty = document.createElement('div');
    empty.className = 'text-muted small';
    empty.textContent = replayFilter === 'all' ? '没有记录' : '这个分类没有记录';
    frag.append(empty);
  }
  events.forEach((ev) => frag.append(replayEventNode(ev)));
  els.replayTimeline.replaceChildren(frag);
  els.replayTimeline.scrollTop = 0;
}

// ---------- 旁观进行中的对局 ----------
async function openSpectate(code) {
  if (!guardClient()) return;
  if (session) {
    toast('你正在房间里，先点「离开房间」再旁观别的对局');
    return;
  }
  if (!accountApproved()) {
    toast('先登录并等待账号审核通过');
    openAuthModal();
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    toast('请输入 6 位数字房间码');
    return;
  }
  if (spectateBusy) return;
  spectateBusy = true;
  try {
    const { data, error } = await client
      .from('rooms')
      .select('code, options')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('房间不存在，检查一下房间码');
    if (!data.options?.g) throw new Error('这局还没开始，想玩就直接加入房间吧');
    spectate = { code, room: data, g: data.options.g, members: [], chatRows: [] };
    showSpectateView();
    await spectateLoad();
    startSpectatePoll();
  } catch (error) {
    toast(friendlyError(error));
    stopSpectate();
    spectate = null;
    showHome();
  } finally {
    spectateBusy = false;
  }
}

async function spectateLoad() {
  if (!spectate || !client) return;
  const code = spectate.code;
  const { data: roomRow, error: roomError } = await client
    .from('rooms')
    .select('code, options')
    .eq('code', code)
    .maybeSingle();
  if (!spectate) return;
  if (roomError) throw roomError;
  if (!roomRow || !roomRow.options?.g) {
    toast('这局已经结束或被关闭');
    exitSpectate();
    return;
  }
  const { data: rows, error: rowsError } = await client
    .from('players')
    .select('id, name, seat, alive, is_bot')
    .eq('room_code', code)
    .order('joined_at', { ascending: true });
  if (!spectate) return;
  if (rowsError) throw rowsError;
  const { data: chats, error: chatError } = await client
    .from('game_actions')
    .select('day, step, payload, created_at')
    .eq('room_code', code)
    .eq('step', 'chat')
    .order('created_at', { ascending: true })
    .limit(500);
  if (!spectate) return;
  if (chatError) throw chatError;
  spectate.room = roomRow;
  spectate.g = roomRow.options.g;
  spectate.members = rows || [];
  spectate.chatRows = chats || [];
  renderSpectate();
}

function startSpectatePoll() {
  stopSpectate();
  spectateTimer = setInterval(() => {
    spectateLoad().catch(() => {});
  }, 2000);
}

function stopSpectate() {
  if (spectateTimer) {
    clearInterval(spectateTimer);
    spectateTimer = null;
  }
}

function exitSpectate() {
  stopSpectate();
  spectate = null;
  showHome();
}

function showSpectateView() {
  els.homeView.hidden = true;
  els.roomView.hidden = true;
  els.replayView.hidden = true;
  els.spectateView.hidden = false;
  closeAccountMenu();
  window.scrollTo(0, 0);
}

function spectatePromptText(state) {
  if (state.phase === 'finished') return '对局已结束。点右上角「查看完整回放」查看含狼人夜聊的完整记录（需房主已保存）。';
  if (state.phase === 'night') return '夜晚行动中，具体行动保密。';
  if (state.phase === 'day') {
    const order = state.speechOrder || [];
    const speaker = order[state.speechIndex] ?? null;
    if (speaker == null) return '发言结束，马上进入投票…';
    return `${order.length > 1 ? `发言顺序：${order.map(pad).join(' → ')}。` : ''}当前 ${pad(speaker)} 号发言（第 ${state.speechIndex + 1} / ${order.length} 位）。`;
  }
  if (state.phase === 'vote' || state.phase === 'runoff') return '投票中，结果在本轮结束后公布。';
  if (state.phase === 'hunter') return '正在结算…';
  if (state.phase === 'dawn') return '天亮了，等待公布昨夜结果…';
  return '';
}

function renderSpectate() {
  const state = spectate?.g;
  if (!state) return;
  const mode = modeById(state.mode || spectate.room?.options?.mode || 'std12');
  const total = mode.roles.length;
  els.spectateCode.textContent = spectate.code;
  els.spectatePhase.textContent = phaseTextOf(state);
  els.spectateStatusBar.classList.toggle('sr-night', state.phase === 'night');
  els.spectateStatusBar.classList.toggle('sr-over', state.phase === 'finished');
  els.spectateCount.textContent = `${(state.aliveSeats || []).length} / ${total} 存活`;
  els.spectateMode.textContent = `${mode.name} · ${total} 人`;
  els.spectatePrompt.textContent = spectatePromptText(state);
  els.spectateReplayBtn.hidden = state.phase !== 'finished';
  updateSpectateClock();
  renderSpectateSeats(state, mode);
  renderSpectateChat();
  renderSpectateFeed();
}

function renderSpectateSeats(state, mode) {
  const total = mode.roles.length;
  const bySeat = new Map();
  spectate.members.forEach((member) => {
    if (member.seat) bySeat.set(member.seat, member);
  });
  const alive = new Set(state.aliveSeats || []);
  const speaker = state.phase === 'day' ? (state.speechOrder?.[state.speechIndex] ?? null) : null;
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
      name.textContent = '空座';
    } else {
      if (!alive.has(seat)) li.classList.add('sr-dead');
      if (speaker === seat) li.classList.add('sr-speaking');
      avatar.textContent = (member.name || '?').trim().charAt(0).toUpperCase();
      name.textContent = member.name;
      if (member.is_bot) {
        const bot = document.createElement('span');
        bot.className = 'badge badge-info';
        bot.textContent = '人机';
        marks.append(bot);
      }
      if ((state.kicked || []).includes(seat)) {
        const kicked = document.createElement('span');
        kicked.className = 'badge badge-danger';
        kicked.textContent = '已请离';
        marks.append(kicked);
      } else if (!alive.has(seat)) {
        const out = document.createElement('span');
        out.className = 'badge badge-secondary';
        out.textContent = '出局';
        marks.append(out);
      }
      if ((state.afk || []).includes(seat)) {
        const afk = document.createElement('span');
        afk.className = 'badge badge-warning';
        afk.textContent = '挂机';
        marks.append(afk);
      }
    }
    li.append(head, avatar, name, marks);
    frag.append(li);
  }
  els.spectateSeats.replaceChildren(frag);
}

function renderSpectateChat() {
  const frag = document.createDocumentFragment();
  if (!spectate?.chatRows.length) {
    const empty = document.createElement('div');
    empty.className = 'text-muted small';
    empty.textContent = '还没有公开发言';
    frag.append(empty);
  }
  (spectate?.chatRows || []).forEach((row) => {
    const wrap = document.createElement('div');
    wrap.className = 'sr-chat-msg';
    const who = document.createElement('span');
    who.className = 'sr-chat-who';
    who.textContent = `第${row.day}天 · ${row.payload?.name || '玩家'}`;
    const text = document.createElement('span');
    text.className = 'sr-chat-text';
    text.textContent = row.payload?.text || '';
    wrap.append(who, text);
    frag.append(wrap);
  });
  els.spectateChat.replaceChildren(frag);
  els.spectateChat.scrollTop = els.spectateChat.scrollHeight;
}

function renderSpectateFeed() {
  const entries = (spectate?.g?.log || []).slice(-120);
  const frag = document.createDocumentFragment();
  entries.forEach((entry) => {
    const line = document.createElement('div');
    line.className = `sr-sys${entry.kind && entry.kind !== 'system' ? ` sr-sys-${entry.kind}` : ''}`;
    line.textContent = entry.text;
    frag.append(line);
  });
  els.spectateFeed.replaceChildren(frag);
  els.spectateFeed.scrollTop = els.spectateFeed.scrollHeight;
}

function updateSpectateClock() {
  const state = spectate?.g;
  if (!els.spectateClock) return;
  if (!state || !state.deadline || state.phase === 'finished') {
    els.spectateClock.textContent = '';
    return;
  }
  const left = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  els.spectateClock.textContent = left > 0
    ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
    : '加时';
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
    .select('id, name, seat, role, alive, is_bot')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error) return;
  hostRoles = data || [];
}

async function loadAllRoles() {
  if (!session) return;
  const { data, error } = await client
    .from('players')
    .select('id, name, seat, role, alive, is_bot')
    .eq('room_code', session.code)
    .order('joined_at', { ascending: true });
  if (error) return;
  allRoles = (data || []).slice().sort((a, b) => (a.seat || 99) - (b.seat || 99));
  renderGameOver();
}

async function loadChat() {
  if (!session || !g) return;
  if (g.phase === 'night') {
    if (!isMyWolf()) {
      wolfChatRows = [];
      renderChat();
      return;
    }
    const { data, error } = await client
      .from('game_actions')
      .select('player_id, payload, created_at, day')
      .eq('room_code', session.code)
      .eq('day', g.day)
      .eq('step', 'wolfchat')
      .order('created_at', { ascending: true })
      .limit(120);
    if (error || !g) return;
    wolfChatRows = data || [];
    renderChat();
    return;
  }
  const { data, error } = await client
    .from('game_actions')
    .select('player_id, payload, created_at, day')
    .eq('room_code', session.code)
    .eq('step', 'chat')
    .order('created_at', { ascending: true })
    .limit(120);
  if (error || !g) return;
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

function preSpeechKey() {
  return session ? `wolf.prespeech:${session.code}:${session.playerId}` : null;
}

function loadPreSpeech() {
  preSpeech = { day: 0, msgs: [] };
  const key = preSpeechKey();
  if (!key) return;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw || !Array.isArray(raw.msgs)) return;
    preSpeech = {
      day: Number(raw.day) || 0,
      msgs: raw.msgs.filter((text) => typeof text === 'string' && text.trim()).slice(0, 12),
    };
  } catch {
    preSpeech = { day: 0, msgs: [] };
  }
}

function savePreSpeech() {
  const key = preSpeechKey();
  if (!key) return;
  if (!preSpeech.msgs.length) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(preSpeech));
}

function clearPreSpeech() {
  preSpeech = { day: 0, msgs: [] };
  savePreSpeech();
}

function pendingSpeechCount() {
  return g && preSpeech.day === g.day ? preSpeech.msgs.length : 0;
}

function canPreInput() {
  if (!g || g.phase !== 'day' || !isAliveSeat(myRow?.seat)) return false;
  const order = g.speechOrder || [];
  const myIndex = order.indexOf(myRow?.seat);
  if (myIndex < 0) return false;
  return myIndex > g.speechIndex;
}

function queueSpeech(text) {
  if (!g) return;
  if (preSpeech.day !== g.day) preSpeech = { day: g.day, msgs: [] };
  if (preSpeech.msgs.length >= 12) {
    toast('先存了 12 条，等轮到你时再接着发');
    return;
  }
  preSpeech.msgs.push(text);
  savePreSpeech();
  renderChat();
  updateChatForm();
  toast(`已排第 ${preSpeech.msgs.length} 条，轮到你时会自动发出`);
}

async function sendChatMessage(text, preinput) {
  if (!session || !g) return false;
  const name = profile?.username || session.name || '';
  const { error } = await client
    .from('game_actions')
    .insert({
      room_code: session.code,
      day: g.day,
      step: 'chat',
      player_id: session.playerId,
      target_seat: null,
      payload: { name, text, preinput: Boolean(preinput) },
    });
  if (error) {
    toast(friendlyError(error));
    return false;
  }
  return true;
}

async function flushPreSpeech() {
  if (preFlushing || !g || g.phase !== 'day') return;
  if (!preSpeech.msgs.length || preSpeech.day !== g.day) return;
  if (currentSpeaker() !== myRow?.seat) return;
  if (submitted.has(`${g.day}:speech`)) return;
  if (Date.now() - preFailedAt < 5000) return;
  preFlushing = true;
  const msgs = preSpeech.msgs.slice();
  preSpeech.msgs = [];
  savePreSpeech();
  renderChat();
  let failedIndex = -1;
  for (let i = 0; i < msgs.length; i += 1) {
    const ok = await sendChatMessage(msgs[i], true);
    if (!ok) {
      failedIndex = i;
      break;
    }
  }
  if (failedIndex >= 0) {
    preFailedAt = Date.now();
    preSpeech.msgs = msgs.slice(failedIndex).concat(preSpeech.msgs);
    savePreSpeech();
  }
  preFlushing = false;
  renderChat();
  updateChatForm();
  if (failedIndex < 0) {
    setTimeout(loadChat, 300);
    if (isHost()) setTimeout(hostTick, 250);
  }
}

function renderChat() {
  const rows = g?.phase === 'night' ? wolfChatRows : chatRows;
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
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
  if (g?.phase === 'day' && pendingSpeechCount()) {
    preSpeech.msgs.forEach((pending) => {
      const wrap = document.createElement('div');
      wrap.className = 'sr-chat-msg sr-chat-pending';
      const who = document.createElement('span');
      who.className = 'sr-chat-who';
      who.textContent = '我（待发出）';
      const text = document.createElement('span');
      text.className = 'sr-chat-text';
      text.textContent = pending;
      wrap.append(who, text);
      frag.append(wrap);
    });
  }
  els.chatFeed.replaceChildren(frag);
  els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
}

function renderRoom() {
  if (g && myRow?.seat != null && (g.kicked || []).includes(myRow.seat)) {
    exitRoomLocal('你已被站长请出房间');
    return;
  }
  const mode = currentMode();
  const total = mode.roles.length;
  const inGame = Boolean(g);

  els.chatCard.hidden = !inGame || (g.phase === 'night' && !isMyWolf());
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
  return phaseTextOf(g);
}

function phaseTextOf(state) {
  if (!state) return '等待玩家';
  if (state.phase === 'finished') return '对局结束';
  if (state.phase === 'night') return `第 ${state.day} 夜 · ${STEP_LABEL[state.step] || '夜晚'}`;
  if (state.phase === 'dawn') return `第 ${state.day} 天 · 天亮了`;
  if (state.phase === 'vote') return `第 ${state.day} 天 · 投票`;
  if (state.phase === 'runoff') return `第 ${state.day} 天 · PK 投票`;
  if (state.phase === 'hunter') return '出局结算';
  return `第 ${state.day} 天 · 讨论`;
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
    const order = g.speechOrder || [];
    const speaker = currentSpeaker();
    if (speaker == null) {
      els.statusPrompt.textContent = '发言结束，马上进入投票…';
    } else {
      const position = `第 ${g.speechIndex + 1} / ${order.length} 位`;
      const list = order.map(pad).join(' → ');
      const offline = isSeatOnline(speaker) ? '' : '，对方离线，将自动跳过';
      let hint;
      if (speaker === myRow?.seat) {
        hint = submitted.has(`${g.day}:speech`)
          ? '，你已结束发言，等待下一位'
          : '，轮到你发言，可连发多条，说完点「结束发言」';
      } else if (canPreInput()) {
        hint = '，还没轮到你，可以先在右侧打字排队';
      } else {
        hint = `，等待发言${offline}`;
      }
      els.statusPrompt.textContent = `${order.length > 1 ? `发言顺序：${list}。` : ''}当前 ${pad(speaker)} 号（${position}）${hint}。`;
    }
  } else if (g.phase === 'vote' || g.phase === 'runoff') {
    els.statusPrompt.textContent = '投票：点击座位选择目标，不能投自己，也可以弃权。';
  } else if (g.phase === 'hunter') {
    els.statusPrompt.textContent = '正在结算…';
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
  els.gameClock.textContent = left > 0
    ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
    : '加时';
}

setInterval(() => {
  updateClock();
  updateSpectateClock();
}, 500);

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
      if (inGame && currentSpeaker() === seat) li.classList.add('sr-speaking');

      if (!member.is_bot) {
        const rate = ratings.get(member.name);
        if (rate) {
          const rateTag = document.createElement('span');
          rateTag.className = 'sr-rate';
          rateTag.textContent = rate;
          marks.append(rateTag);
        }
      }

      if (member.id === hostId) {
        const host = document.createElement('span');
        host.className = 'badge badge-warning';
        host.textContent = '房主';
        head.append(host);
      }

      if (member.is_bot) {
        const bot = document.createElement('span');
        bot.className = 'badge badge-info';
        bot.textContent = '人机';
        marks.append(bot);
      }

      avatar.textContent = (member.name || '?').trim().charAt(0).toUpperCase();
      name.textContent = member.name;

      if (member.id === session.playerId) {
        const me = document.createElement('span');
        me.className = 'badge badge-primary';
        me.textContent = '我';
        marks.append(me);
      }
      if (inGame && g.kicked?.includes(seat)) {
        const kicked = document.createElement('span');
        kicked.className = 'badge badge-danger';
        kicked.textContent = '已请离';
        marks.append(kicked);
      } else if (inGame && alive && !alive.has(seat)) {
        const out = document.createElement('span');
        out.className = 'badge badge-secondary';
        out.textContent = '出局';
        marks.append(out);
      }
      if (!isPlayerOnline(member) && !member.is_bot) {
        const off = document.createElement('span');
        off.className = 'badge badge-warning';
        off.textContent = '离线';
        marks.append(off);
        li.classList.add('sr-offline');
      }
      if (inGame && isAfk(seat)) {
        const afk = document.createElement('span');
        afk.className = 'badge badge-warning';
        afk.textContent = '挂机';
        marks.append(afk);
      }
    }

    if (pick && pick.allowed.has(seat) && member && !li.classList.contains('sr-dead')) {
      li.classList.add('sr-clickable');
      if (pick.selected.includes(seat)) li.classList.add('sr-picked');
      li.addEventListener('click', () => togglePick(seat));
    }

    li.append(head, avatar, name, marks);
    if (member && canKickMember(member)) {
      const wrap = document.createElement('div');
      wrap.className = 'sr-kick';
      const stop = (event) => event.stopPropagation();
      if (kickAsked === member.id) {
        const yes = makeBtn('确认踢出', 'btn-danger', () => { kickMember(member).catch((error) => toast(friendlyError(error))); });
        const no = makeBtn('取消', 'btn-outline-secondary', () => { kickAsked = null; renderRoom(); });
        wrap.append(yes, no);
      } else {
        const btn = makeBtn('踢出', 'btn-outline-danger', () => { kickAsked = member.id; renderRoom(); });
        wrap.append(btn);
      }
      wrap.addEventListener('click', stop);
      li.append(wrap);
    }
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
  const storedStep = payload && payload.explode ? 'explode' : step;
  client
    .from('game_actions')
    .insert({
      room_code: session.code,
      day: g.day,
      step: storedStep,
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
    if (isOwnerAccount() && missing > 0) {
      els.actionArea.append(makeBtn('添加人机（占位）', 'btn-outline-primary', () => {
        addBot().catch((error) => toast(friendlyError(error)));
      }));
      els.actionArea.append(note('人机由程序行动、不会发言；座位上的「踢出」可以请走玩家或人机。'));
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
  if (isAfk(seat)) {
    els.actionArea.append(note('你已挂机：本局 60 秒局时已经用完，系统不会再多等你。'));
    els.actionArea.append(makeBtn('我回来了', 'btn-warning', () => act('afk', null, { back: true })));
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
    renderVotePanel(seat, role);
  } else if (g.phase === 'hunter') {
    els.actionArea.append(note('等待结算…'));
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
    els.actionArea.append(note(`女巫行动（${Math.round(DUR.witch / 1000)} 秒）：解药${g.potions.save ? '可用' : '已用'}，毒药${g.potions.poison ? '可用' : '已用'}，一晚最多用一瓶。`));
    if (g.kill != null) {
      els.actionArea.append(note(g.kill === seat
        ? `今晚 ${pad(g.kill)} 号被狼人袭击（就是你）。你仍然可以自救，或者放弃解药直接开毒。`
        : `今晚 ${pad(g.kill)} 号被狼人袭击。`));
      if (g.potions.save) {
        els.actionArea.append(makeBtn(`用解药救 ${pad(g.kill)} 号`, 'btn-success', () => act('witch', null, { save: true })));
      }
    } else {
      els.actionArea.append(note('今晚没有人被袭击，可以直接用毒药或跳过。'));
    }
    if (g.potions.poison) {
      if (pick && pick.kind === 'poison') {
        els.actionArea.append(note('毒药：点击一名玩家，再点「确认」才会生效。'));
        els.actionArea.append(pickButtons((sel) => act('witch', sel[0], { poison: sel[0] })));
      } else {
        els.actionArea.append(makeBtn('用毒药', 'btn-danger', () => {
          beginPick('poison', aliveSeats, 1, (sel) => act('witch', sel[0], { poison: sel[0] }));
          renderRoom();
        }));
        els.actionArea.append(note('用毒和救人二选一：选了解药这一晚就不能再毒人。'));
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

function canSelfExplode(role) {
  return role === 'werewolf' || role === 'wolfking';
}

function explodeStep() {
  return g.phase === 'day' ? 'day' : (g.step || 'day');
}

function renderExplodePick(seat, role) {
  if (!canSelfExplode(role) || !isAliveSeat(seat)) return false;
  const step = explodeStep();
  if (pick && pick.kind === 'explodeConfirm') {
    els.actionArea.append(note(role === 'wolfking'
      ? '确认白狼王自爆（不带人）：你翻牌出局，今天我不能再投票，剩余流程全部跳过，直接进入黑夜。'
      : '确认自爆：你翻牌出局，今天我不能再投票，剩余流程全部跳过，直接进入黑夜。'));
    const wrap = document.createElement('div');
    wrap.className = 'sr-act w-100';
    wrap.append(
      makeBtn('确认自爆', 'btn-danger', () => {
        pick = null;
        act(step, null, { explode: true });
      }),
      makeBtn('取消', 'btn-outline-secondary', clearPick),
    );
    els.actionArea.append(wrap);
    return true;
  }
  if (pick && pick.kind === 'explode') {
    els.actionArea.append(note('白狼王自爆带人：点击要带走的玩家，再点确认，立即进入黑夜。'));
    els.actionArea.append(pickButtons((sel) => act(step, sel[0], { explode: true, target: sel[0] })));
    return true;
  }
  return false;
}

function appendExplodeButtons(seat, role) {
  if (!canSelfExplode(role) || !isAliveSeat(seat)) return;
  const step = explodeStep();
  if (role === 'wolfking') {
    els.actionArea.append(makeBtn('自爆带人', 'btn-danger', () => {
      beginPick('explode', g.aliveSeats.filter((s) => s !== seat), 1,
        (sel) => act(step, sel[0], { explode: true, target: sel[0] }));
      renderRoom();
    }));
    els.actionArea.append(makeBtn('只自爆（不带人）', 'btn-outline-danger', () => {
      pick = { kind: 'explodeConfirm', allowed: new Set(), max: 0, selected: [] };
      renderRoom();
    }));
  } else {
    els.actionArea.append(makeBtn('自爆（立即天黑）', 'btn-outline-danger', () => {
      pick = { kind: 'explodeConfirm', allowed: new Set(), max: 0, selected: [] };
      renderRoom();
    }));
  }
  els.actionArea.append(note('自爆后你立即出局，今天的投票和剩余流程全部跳过，直接进入黑夜。'));
}

function renderDayPanel(seat, role) {
  if (!submittedHelp('day') && renderExplodePick(seat, role)) return;
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
  if (!submittedHelp('day')) appendExplodeButtons(seat, role);
  if (!els.actionArea.childElementCount) {
    const speaker = currentSpeaker();
    els.actionArea.append(note(speaker === seat
      ? '轮到你发言：在右侧输入，可连发多条，说完点「结束发言」。'
      : `按固定顺序发言，等待 ${speaker != null ? `${pad(speaker)} 号` : '下一位'}；还没轮到你时也可以先在右侧打字，轮到你自动发出。`));
  }
}

function renderVotePanel(seat, role) {
  if (submittedHelp(g.step)) {
    els.actionArea.append(note('已投票，等待其他玩家…'));
    return;
  }
  if (renderExplodePick(seat, role)) return;
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
  appendExplodeButtons(seat, role);
}

function renderHunterPanel(seat) {
  if (submittedHelp('hunter')) {
    els.actionArea.append(note('已选择，等待结算…'));
    return;
  }
  if (pick && pick.kind === 'hunter') {
    els.actionArea.append(note('已翻牌：点击要带走的玩家再确认；也可以翻牌但不开枪。'));
    els.actionArea.append(pickButtons((sel) => act('hunter', sel[0], { reveal: true })));
    els.actionArea.append(makeBtn('翻牌但不开枪', 'btn-outline-secondary', () => {
      pick = null;
      act('hunter', null, { reveal: true });
    }));
    els.actionArea.append(makeBtn('返回', 'btn-outline-secondary', () => {
      pick = null;
      renderRoom();
    }));
    return;
  }
  els.actionArea.append(note('你已出局。翻牌会公开你的猎人身份并可以带走一人；不翻牌则身份保密、不开枪。'));
  els.actionArea.append(makeBtn('翻牌（可以开枪）', 'btn-danger', () => {
    beginPick('hunter', g.aliveSeats.slice(), 1, (sel) => act('hunter', sel[0], { reveal: true }));
    renderRoom();
  }));
  els.actionArea.append(makeBtn('不翻牌（不开枪）', 'btn-outline-secondary', () => act('hunter', null, { reveal: false })));
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
  if (role.explode) {
    els.roleExplode.hidden = false;
    els.roleExplode.textContent = role.explode === '不可以'
      ? '本角色不能自爆'
      : `白天可自爆${role.explode === '可以（可带一人）' ? '（可带一人）' : ''}`;
    els.roleExplode.classList.toggle('sr-explode-no', role.explode === '不可以');
  } else {
    els.roleExplode.hidden = true;
    els.roleExplode.textContent = '';
    els.roleExplode.classList.remove('sr-explode-no');
  }
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
  els.watchReplayBtn.hidden = !show;
  if (!show) return;

  const winner = g.winner;
  const label = winner === 'wolf' ? '狼人阵营获胜' : winner === 'lovers' ? '第三方阵营获胜' : '好人阵营获胜';
  els.winnerText.className = `sr-winner ${winner === 'wolf' ? 'sr-winner-wolf' : winner === 'lovers' ? 'sr-winner-lovers' : ''}`.trim();
  els.winnerText.textContent = `${label} · ${g.winReason || ''}`;
  els.resultNote.textContent = (g.rating
    ? `共 ${g.day} 天 · 评分 K=${g.rating.k} · 按昵称永久保存，零和结算`
    : `共 ${g.day} 天 · 评分未结算（房主需运行 supabase/migration-v4.sql）`)
    + (g.replayError ? ` · 回放未保存：${g.replayError}` : '');

  const detail = new Map((g.rating?.players || []).map((item) => [item.seat, item]));
  const rows = (allRoles.length ? allRoles : members).slice();
  rows.sort((a, b) => (a.seat || 99) - (b.seat || 99));
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    const item = detail.get(row.seat);
    const tr = document.createElement('tr');
    const seatTd = document.createElement('td');
    seatTd.textContent = row.seat ? pad(row.seat) : '—';
    const nameTd = document.createElement('td');
    nameTd.textContent = row.name || '';
    if (row.is_bot) {
      const bot = document.createElement('span');
      bot.className = 'badge badge-info ml-2';
      bot.textContent = '人机';
      nameTd.append(bot);
    }
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

    const lastDeath = (g.deaths || []).filter((death) => death.seat === row.seat).slice(-1)[0];
    const death = item?.death || lastDeath || null;
    const win = item ? item.win : (row.is_bot ? didPlayerWin(row) : null);
    const resultTd = document.createElement('td');
    if (win == null) {
      resultTd.textContent = '—';
      resultTd.className = 'text-muted';
    } else {
      const tag = document.createElement('span');
      tag.className = win ? 'sr-win' : 'sr-lose';
      tag.textContent = win ? '胜利' : '失败';
      resultTd.append(tag);
    }

    const deathTd = document.createElement('td');
    deathTd.className = 'text-muted';
    deathTd.textContent = death
      ? `第 ${death.day} 天 ${DEATH_SHORT[death.reason] || ''}`.trim()
      : '存活到最后';

    const votesTd = document.createElement('td');
    votesTd.textContent = item
      ? item.votesReceived
      : (g.voteHistory || []).reduce((sum, vote) => sum + (vote.counts?.[row.seat] || 0), 0);

    const ratingTd = document.createElement('td');
    const current = ratings.get(row.name);
    if (row.is_bot) {
      ratingTd.className = 'text-muted';
      ratingTd.textContent = '人机不计分';
    } else if (item) {
      ratingTd.className = item.delta >= 0 ? 'sr-delta-up' : 'sr-delta-down';
      ratingTd.textContent = `${item.before} → ${item.after}（${item.delta >= 0 ? '+' : ''}${item.delta}）`;
    } else {
      ratingTd.textContent = current ? `${current}（本局未结算）` : '—';
    }

    tr.append(seatTd, nameTd, roleTd, resultTd, deathTd, votesTd, ratingTd);
    frag.append(tr);
  });
  els.revealBody.replaceChildren(frag);
}

function updateChatForm() {
  const alive = isAliveSeat(myRow?.seat);
  const speaker = currentSpeaker();
  if (g && preSpeech.msgs.length && preSpeech.day !== g.day) clearPreSpeech();
  const wolfNight = Boolean(g) && g.phase === 'night' && isMyWolf() && alive;
  const speechDone = Boolean(g) && submitted.has(`${g.day}:speech`);
  const myTurn = Boolean(g) && g.phase === 'day' && alive && speaker === myRow?.seat && !speechDone;
  const preTurn = Boolean(g) && g.phase === 'day' && alive && !myTurn && !speechDone && canPreInput();
  const canChat = wolfNight || myTurn || preTurn;
  const pending = myTurn ? pendingSpeechCount() : 0;
  const submitBtn = els.chatForm.querySelector('button[type="submit"]');

  els.chatInput.disabled = !canChat;
  submitBtn.disabled = !canChat;
  submitBtn.textContent = preTurn ? '排队' : '发送';
  els.chatInput.placeholder = preTurn
    ? '还没轮到你，可以先打字，轮到你时自动发出'
    : '输入发言（回车发送）';
  els.endSpeechBtn.hidden = !myTurn;
  els.endSpeechBtn.disabled = speechDone;

  if (myTurn && pending) setTimeout(flushPreSpeech, 100);

  if (!g) {
    els.chatTitle.textContent = '白天发言';
    els.chatNote.textContent = '';
    return;
  }
  if (g.phase === 'night') {
    els.chatTitle.textContent = '狼人夜间频道';
    els.chatNote.textContent = isMyWolf()
      ? (alive ? '仅狼人可见 · 可随时交流' : '仅狼人可见 · 你已出局')
      : '夜晚不能发言';
    return;
  }
  els.chatTitle.textContent = '白天发言';
  if (g.phase === 'finished') {
    els.chatNote.textContent = '对局已结束';
  } else if (g.phase === 'day') {
    if (!alive) els.chatNote.textContent = '你已出局，只能旁观';
    else if (myTurn) {
      els.chatNote.textContent = `轮到你（第 ${g.speechIndex + 1} / ${g.speechOrder?.length || 0} 位）${pending ? ` · 先发排队 ${pending} 条` : ''}`;
    } else if (speaker === myRow?.seat) els.chatNote.textContent = '已结束发言，等待下一位';
    else if (preTurn) {
      els.chatNote.textContent = `等待 ${pad(speaker)} 号发言 · 可提前打字${pendingSpeechCount() ? `，已排队 ${pendingSpeechCount()} 条` : ''}`;
    } else if (speaker != null) els.chatNote.textContent = `等待 ${pad(speaker)} 号发言`;
    else els.chatNote.textContent = '发言结束，准备投票';
  } else if (g.phase === 'vote' || g.phase === 'runoff') {
    els.chatNote.textContent = '投票中不能发言';
  } else if (g.phase === 'hunter') {
    els.chatNote.textContent = '等待结算';
  } else {
    els.chatNote.textContent = '天亮了，等待公布结果';
  }
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
    const roster = members.slice(0, total);
    for (let i = 0; i < roster.length; i += 1) {
      const { error } = await client
        .from('players')
        .update({ role: roles[i], seat: seats[i], alive: true })
        .eq('id', roster[i].id);
      if (error) throw error;
    }
    await loadHostRoles();
    if (hostRoles.length !== roster.length || hostRoles.some((row) => !row.seat || !row.role)) {
      throw new Error('座位数据没写全，请重试一次');
    }
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
      voteHistory: [],
      speechOrder: null,
      speechIndex: 0,
      deaths: [],
      kicked: [],
      bank: {},
      afk: [],
      bankMark: {},
      log: [{ day: 1, kind: 'system', text: `板子：${mode.name}，共 ${total} 人` }],
      winner: null,
      winReason: '',
      ratingApplied: false,
    };
    g.log.push({ day: 1, kind: 'night', text: '第 1 夜 · 天黑请闭眼' });
    await startNightInternal(true);
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

async function startNightInternal(first) {
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
  if (g.nightQueue.length) await enterStep(g.nightQueue[0]);
  else await finishNight();
}

async function enterStep(step) {
  g.step = step;
  g.stepStart = Date.now();
  g.deadline = Date.now() + (DUR[step] || 30000);
  await saveGame();
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
  if (expected.every((seat) => acted.has(seat))) return true;
  if (g.phase !== 'night') return false;
  // 夜晚给离线/掉线玩家留一点反应时间，避免女巫刚被判定离线就被跳过
  const started = g.stepStart || (g.deadline ? g.deadline - (DUR[step] || 30000) : Date.now());
  if (Date.now() - started < 12000) return false;
  return expected.every((seat) => acted.has(seat) || !isSeatOnline(seat));
}

// ---------- 局时：每个回合 60 秒用完后，按剩余局时继续等，迟到时间从局时里扣 ----------

function ensureBank() {
  if (!g) return;
  if (!g.bank) g.bank = {};
  if (!g.afk) g.afk = [];
  if (!g.bankMark) g.bankMark = {};
  hostRoles.forEach((row) => {
    if (typeof g.bank[row.seat] !== 'number') g.bank[row.seat] = 60000;
  });
}

function isAfk(seat) {
  return Boolean(g?.afk && g.afk.includes(seat));
}

function bankOf(seat) {
  return (g?.bank && typeof g.bank[seat] === 'number') ? g.bank[seat] : 0;
}

function markAfk(seat) {
  if (!g || isAfk(seat)) return;
  g.afk.push(seat);
  const row = rowBySeat(seat);
  g.log.push({
    day: g.day,
    kind: 'warning',
    text: `${pad(seat)} 号${row?.name ? `（${row.name}）` : ''}60 秒局时用完，进入挂机状态`,
  });
}

// 截止后才提交的玩家：把迟到的秒数从局时里扣掉（每个回合只扣一次）
function bankCharge(key, seats, actions) {
  if (!g?.bank || !g.deadline) return false;
  const now = Date.now();
  if (now <= g.deadline) return false;
  const acted = new Set(actions.map((a) => a.seat));
  let changed = false;
  seats.forEach((seat) => {
    if (!acted.has(seat) || isBotSeat(seat)) return;
    const mark = `${key}:${seat}`;
    if (g.bankMark[mark]) return;
    g.bankMark[mark] = 1;
    const used = Math.min(bankOf(seat), now - g.deadline);
    g.bank[seat] = Math.max(0, bankOf(seat) - used);
    changed = true;
    if (g.bank[seat] <= 0) markAfk(seat);
  });
  return changed;
}

// 截止后还在等的人：局时耗尽的立刻挂机
function bankTick(key, seats, actions) {
  if (!g?.bank || !g.deadline) return false;
  const now = Date.now();
  if (now <= g.deadline) return false;
  const acted = new Set(actions.map((a) => a.seat));
  let changed = false;
  seats.forEach((seat) => {
    if (acted.has(seat) || isBotSeat(seat) || !isSeatOnline(seat) || isAfk(seat)) return;
    const bank = bankOf(seat);
    if (bank > 0 && now - g.deadline >= bank) {
      g.bank[seat] = 0;
      markAfk(seat);
      changed = true;
    }
  });
  return changed;
}

// 还要额外等多久（取最长的剩余局时）
function bankExtra(seats, actions) {
  if (!g?.bank || !g.deadline) return 0;
  const acted = new Set(actions.map((a) => a.seat));
  let extra = 0;
  seats.forEach((seat) => {
    if (acted.has(seat) || isBotSeat(seat) || !isSeatOnline(seat) || isAfk(seat)) return;
    extra = Math.max(extra, bankOf(seat));
  });
  return extra;
}

async function processAfkBack() {
  if (!g || !g.afk || !g.afk.length) return;
  const rows = await fetchActions(g.day, 'afk');
  const backs = rows.filter((row) => row.payload?.back && g.afk.includes(row.seat));
  if (!backs.length) return;
  backs.forEach((row) => {
    g.afk = g.afk.filter((s) => s !== row.seat);
    g.log.push({ day: g.day, kind: 'system', text: `${pad(row.seat)} 号回来了，解除挂机` });
  });
  await saveGame();
  renderRoom();
}

async function fetchHostActions(day, step) {
  const rows = await fetchActions(day, step);
  if (step !== 'explode' && (g.phase === 'day' || g.phase === 'vote' || g.phase === 'runoff')) {
    const bombs = await fetchActions(day, 'explode');
    bombs.forEach((bomb) => rows.push(bomb));
  }
  return rows;
}

async function hostTick() {
  if (!session || !isHost() || !g || !room || g.phase === 'finished' || hostBusy) return;
  hostBusy = true;
  try {
    if (!hostRoles.length) await loadHostRoles();
    ensureBank();
    await processAfkBack();
    if (await processKickRequest()) return;
    let actions = await fetchHostActions(g.day, g.step || 'day');
    const now = Date.now();
    if (g.phase === 'night') {
      if (await fillBotActions(g.step, actions)) actions = await fetchActions(g.day, g.step);
      const seats = expectedSeats(g.step);
      const key = `n${g.day}:${g.step}`;
      const changed = bankCharge(key, seats, actions) || bankTick(key, seats, actions);
      const extra = bankExtra(seats, actions);
      if (allActed(g.step, actions) || now >= g.deadline + extra) {
        // 超时结算前再取一次，避免女巫/预言家在最后一刻提交的动作被漏掉
        const finalActions = now >= g.deadline ? await fetchActions(g.day, g.step) : actions;
        await resolveNightStep(finalActions);
      } else if (changed) {
        await saveGame();
      }
    } else if (g.phase === 'dawn') {
      if (now >= g.deadline) await startDay();
    } else if (g.phase === 'day') {
      const handled = await handleDaySpecial(actions);
      if (handled) return;
      const speaker = currentSpeaker();
      if (speaker == null) {
        await startVote();
        return;
      }
      if (!isAliveSeat(speaker)) {
        await advanceSpeech();
        return;
      }
      if (isBotSeat(speaker)) {
        g.log.push({ day: g.day, kind: 'system', text: `${pad(speaker)} 号（人机）不发言，跳过` });
        await advanceSpeech();
        return;
      }
      if (!isSeatOnline(speaker)) {
        g.log.push({ day: g.day, kind: 'system', text: `${pad(speaker)} 号离线，跳过发言` });
        await advanceSpeech();
        return;
      }
      const speechActions = await fetchActions(g.day, 'speech');
      const ended = speechActions.some(
        (row) => row.seat === speaker && Number(row.payload?.turn) === g.speechIndex
      );
      const seats = [speaker];
      const key = `s${g.day}:${g.speechIndex}`;
      const changed = bankCharge(key, seats, speechActions) || bankTick(key, seats, speechActions);
      const extra = bankExtra(seats, speechActions);
      if (ended || now >= g.deadline + extra) await advanceSpeech();
      else if (changed) await saveGame();
    } else if (g.phase === 'vote' || g.phase === 'runoff') {
      if (await fillBotActions(g.step, actions)) actions = await fetchHostActions(g.day, g.step);
      const boom = findExplodeAction(actions);
      if (boom) {
        await resolveExplode(boom);
        return;
      }
      const seats = expectedSeats(g.step);
      const key = `v${g.day}:${g.step}`;
      const changed = bankCharge(key, seats, actions) || bankTick(key, seats, actions);
      const extra = bankExtra(seats, actions);
      if (allActed(g.step, actions) || now >= g.deadline + extra) await resolveVote(actions);
      else if (changed) await saveGame();
    } else if (g.phase === 'hunter') {
      if (await fillBotActions('hunter', actions)) actions = await fetchActions(g.day, 'hunter');
      const seats = expectedSeats('hunter');
      const key = `h${g.day}`;
      const changed = bankCharge(key, seats, actions) || bankTick(key, seats, actions);
      const extra = bankExtra(seats, actions);
      if (allActed('hunter', actions) || now >= g.deadline + extra) await resolveHunter(actions);
      else if (changed) await saveGame();
    }
  } catch (error) {
    toast(`判定出错：${friendlyError(error)}`);
  } finally {
    hostBusy = false;
  }
}

// ---------- 站长踢人与人机 ----------

async function processKickRequest() {
  if (!g || !g.kicked) return false;
  const rows = await fetchActions(g.day, 'kick');
  const request = rows.find((row) => {
    if (!row.payload?.kick) return false;
    const kicker = rowBySeat(row.seat);
    if (!kicker || kicker.name !== OWNER_NAME) return false;
    const target = Number(row.target);
    return target > 0 && target !== row.seat && !g.kicked.includes(target);
  });
  if (!request) return false;
  await resolveKick(request);
  return true;
}

async function resolveKick(action) {
  const target = Number(action.target);
  const row = rowBySeat(target);
  if (!row || g.kicked.includes(target)) return;
  g.kicked.push(target);
  g.log.push({ day: g.day, kind: 'system', text: `站长把 ${pad(target)} 号请出了房间` });
  if (!isAliveSeat(target)) {
    await saveGame();
    renderRoom();
    return;
  }
  const deaths = Rules.expandDeaths([{ seat: target, reason: 'kick' }], {
    alive: aliveSet(),
    lovers: g.lovers,
    wolfbeautySeat: roleSeat('wolfbeauty'),
    charmTarget: g.charmTarget,
  });
  const outcome = await applyDeaths(deaths, 'day');
  if (outcome === 'continue') await saveGame();
  renderRoom();
}

function randomOf(list) {
  return list && list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function botNightChoice(step, seat, role) {
  const others = g.aliveSeats.filter((s) => s !== seat);
  if (step === 'thief') return { target: null, payload: { card: Math.random() < 0.5 ? 0 : 1 } };
  if (step === 'cupid') {
    const a = randomOf(g.aliveSeats);
    const rest = g.aliveSeats.filter((s) => s !== a);
    const b = randomOf(rest);
    return { target: null, payload: a != null && b != null ? { a, b } : {} };
  }
  if (step === 'guard') {
    const pool = others.filter((s) => s !== g.lastGuard);
    return { target: randomOf(pool), payload: {} };
  }
  if (step === 'wolves') {
    const good = g.aliveSeats.filter((s) => !g.teams.wolves.includes(s));
    return { target: randomOf(good.length ? good : g.aliveSeats), payload: {} };
  }
  if (step === 'wolfbeauty') {
    const pool = others.filter((s) => s !== g.lastCharm);
    return { target: randomOf(pool), payload: {} };
  }
  if (step === 'witch') {
    if (g.kill != null && g.potions.save && Math.random() < 0.5) {
      return { target: null, payload: { save: true } };
    }
    if (g.potions.poison && Math.random() < 0.3) {
      const target = randomOf(others);
      if (target != null) return { target, payload: { poison: target } };
    }
    return { target: null, payload: {} };
  }
  if (step === 'seer') {
    const checked = new Set((g.checks || []).filter((c) => c.seat === seat).map((c) => c.target));
    const fresh = others.filter((s) => !checked.has(s));
    return { target: randomOf(fresh.length ? fresh : others), payload: {} };
  }
  return null;
}

function botVoteChoice(step, seat) {
  let pool = g.aliveSeats.filter((s) => s !== seat);
  if (step === 'runoff' && g.runoffSeats) pool = pool.filter((s) => g.runoffSeats.includes(s));
  const target = randomOf(pool);
  return { target: target ?? -1, payload: {} };
}

function botHunterChoice(seat) {
  if (Math.random() < 0.6) {
    const target = Math.random() < 0.6
      ? randomOf(g.aliveSeats.filter((s) => s !== seat))
      : null;
    return { target, payload: { reveal: true } };
  }
  return { target: null, payload: { reveal: false } };
}

async function fillBotActions(step, actions) {
  const expected = expectedSeats(step);
  if (!expected.length) return false;
  const acted = new Set(actions.map((a) => a.seat));
  let added = false;
  for (const seat of expected) {
    if (acted.has(seat) || !isBotSeat(seat)) continue;
    const row = rowBySeat(seat);
    if (!row) continue;
    let choice;
    if (step === 'hunter') choice = botHunterChoice(seat);
    else if (step === 'vote' || step === 'runoff') choice = botVoteChoice(step, seat);
    else choice = botNightChoice(step, seat, row.role);
    if (!choice) continue;
    const { error } = await client.from('game_actions').insert({
      room_code: session.code,
      day: g.day,
      step,
      player_id: row.id,
      target_seat: choice.target ?? null,
      payload: choice.payload || {},
    });
    if (!error) added = true;
  }
  return added;
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

  g.log.push({ day: g.day, kind: 'dawn', text: `第 ${g.day} 天 · 天亮了` });
  const outcome = await applyDeaths(deaths, 'night');
  if (outcome !== 'continue') return;

  await startDawn(false);
}

async function applyDeaths(deaths, when) {
  if (!deaths.length && when === 'night') {
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
    return row?.role === 'hunter' && death.reason !== 'poison' && death.reason !== 'explode' && death.reason !== 'kick';
  });
  if (hunterDeath && !g.hunterUsed) {
    g.hunterUsed = true;
    g.hunterPending = hunterDeath.seat;
    g.hunterFrom = when;
    g.phase = 'hunter';
    g.step = 'hunter';
    g.deadline = Date.now() + DUR.hunter;
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

function crossLovers() {
  if (!g?.lovers) return false;
  const wolves = g.teams.wolves;
  return g.lovers.some((seat) => wolves.includes(seat)) && g.lovers.some((seat) => !wolves.includes(seat));
}

function didPlayerWin(row) {
  const wolves = g.teams.wolves;
  if (g.winner === 'lovers') {
    return (g.lovers || []).includes(row.seat) || row.seat === g.cupidSeat;
  }
  if (row.role === 'cupid') {
    if (!g.lovers) return g.winner === 'good';
    if (crossLovers()) return false;
    const loversWolf = g.lovers.every((seat) => wolves.includes(seat));
    return (g.winner === 'wolf') === loversWolf;
  }
  return g.winner === 'wolf' ? wolves.includes(row.seat) : !wolves.includes(row.seat);
}

async function applyRatings() {
  if (!isHost() || !g || g.ratingApplied || !hostRoles.length) return;
  const humans = hostRoles.filter((row) => !row.is_bot);
  if (!humans.length) return;
  const names = [...new Set(humans.map((row) => row.name))];
  const { data, error } = await client
    .from('ratings')
    .select('name, rating, games, wins')
    .in('name', names);
  if (error) {
    toast('评分表还没建好：房主先在 Supabase 运行 supabase/migration-v4.sql');
    return;
  }
  const base = new Map((data || []).map((row) => [row.name, row]));
  const entries = humans.map((row) => {
    const old = base.get(row.name) || { rating: 1500, games: 0, wins: 0 };
    return {
      seat: row.seat,
      name: row.name,
      role: row.role,
      rating: old.rating,
      games: old.games || 0,
      wins: old.wins || 0,
      win: didPlayerWin(row),
    };
  });
  const total = currentMode().roles.length;
  const k = total <= 6 ? 32 : total <= 9 ? 28 : 24;
  const calc = Rules.computeTeamElo(entries, k);
  const upserts = new Map();
  calc.forEach((player) => {
    const old = entries.find((entry) => entry.name === player.name);
    upserts.set(player.name, {
      name: player.name,
      rating: player.after,
      games: (old?.games || 0) + 1,
      wins: (old?.wins || 0) + (player.win ? 1 : 0),
      updated_at: new Date().toISOString(),
    });
  });
  const { error: saveError } = await client
    .from('ratings')
    .upsert([...upserts.values()], { onConflict: 'name' });
  if (saveError) {
    toast(`评分写入失败：${friendlyError(saveError)}`);
    return;
  }

  g.rating = {
    k,
    players: calc.map((player) => {
      const row = hostRoles.find((item) => item.seat === player.seat) || {};
      const old = base.get(row.name) || { games: 0, wins: 0 };
      const death = (g.deaths || []).filter((item) => item.seat === player.seat).slice(-1)[0] || null;
      return {
        seat: player.seat,
        name: row.name,
        role: row.role,
        win: player.win,
        alive: isAliveSeat(player.seat),
        death,
        votesReceived: (g.voteHistory || []).reduce((sum, item) => sum + (item.counts?.[player.seat] || 0), 0),
        before: player.before,
        delta: player.delta,
        after: player.after,
        games: (old.games || 0) + 1,
        wins: (old.wins || 0) + (player.win ? 1 : 0),
      };
    }),
  };
  g.ratingApplied = true;
  calc.forEach((player) => ratings.set(player.name, player.after));
}

async function saveReplay() {
  if (!g || !session || g.replaySaved) return;
  const mode = currentMode();
  try {
    const { data, error } = await client
      .from('game_actions')
      .select('day, step, player_id, target_seat, payload, created_at')
      .eq('room_code', session.code)
      .order('created_at', { ascending: true })
      .limit(3000);
    if (error) throw error;
    const seatOf = new Map(hostRoles.map((row) => [row.id, row.seat]));
    const events = [];
    (data || []).forEach((row) => {
      const seat = seatOf.get(row.player_id) ?? null;
      const payload = row.payload || {};
      if (payload.explode) {
        events.push({ t: 'explode', day: row.day, seat, target: payload.target ?? null, at: row.created_at });
      } else if (row.step === 'chat') {
        events.push({ t: 'chat', day: row.day, seat, name: payload.name || '', text: payload.text || '', at: row.created_at });
      } else if (row.step === 'wolfchat') {
        events.push({ t: 'wolfchat', day: row.day, seat, name: payload.name || '', text: payload.text || '', at: row.created_at });
      } else if (row.step === 'speech') {
        events.push({ t: 'speech', day: row.day, seat, at: row.created_at });
      } else if (row.step === 'vote' || row.step === 'runoff') {
        events.push({ t: 'vote', day: row.day, step: row.step, seat, target: row.target_seat, at: row.created_at });
      } else if (row.step === 'kick') {
        events.push({ t: 'kick', day: row.day, seat, target: row.target_seat, at: row.created_at });
      } else {
        events.push({ t: 'night', day: row.day, step: row.step, seat, target: row.target_seat, payload, at: row.created_at });
      }
    });
    const players = hostRoles.map((row) => ({
      seat: row.seat,
      name: row.name,
      role: row.role,
      is_bot: Boolean(row.is_bot),
      death: (g.deaths || []).filter((death) => death.seat === row.seat).slice(-1)[0] || null,
      kicked: (g.kicked || []).includes(row.seat),
    }));
    const { error: insertError } = await client.from('replays').insert({
      room_code: session.code,
      mode: g.mode,
      mode_name: mode.name,
      winner: g.winner,
      win_reason: g.winReason,
      days: g.day,
      players,
      log: g.log,
      events,
      rating: g.rating || null,
    });
    if (insertError) throw insertError;
    g.replaySaved = true;
  } catch (error) {
    g.replayError = friendlyError(error);
  }
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
  try {
    await applyRatings();
  } catch (error) {
    toast(`评分结算失败：${friendlyError(error)}`);
  }
  await saveReplay();
  await saveGame();
  await loadAllRoles();
  renderRoom();
  renderGameOver();
}

async function startDawn(logHeader = true) {
  g.phase = 'dawn';
  g.step = 'dawn';
  g.deadline = Date.now() + DUR.dawn;
  if (logHeader) g.log.push({ day: g.day, kind: 'dawn', text: `第 ${g.day} 天 · 天亮了` });
  await saveGame();
  renderRoom();
}

async function startDay() {
  g.phase = 'day';
  g.step = 'day';
  const alive = g.aliveSeats.filter((s) => !isBotSeat(s)).sort((a, b) => a - b);
  const hasBots = g.aliveSeats.some((s) => isBotSeat(s));
  const startIndex = alive.length ? Math.floor(Math.random() * alive.length) : 0;
  g.speechOrder = alive.slice(startIndex).concat(alive.slice(0, startIndex));
  g.speechIndex = 0;
  g.deadline = g.speechOrder.length ? Date.now() + DUR.speech : 0;
  g.log.push({
    day: g.day,
    kind: 'system',
    text: `第 ${g.day} 天讨论开始，发言顺序：${g.speechOrder.map(pad).join(' → ') || '无'}（每人 ${Math.round(DUR.speech / 1000)} 秒${hasBots ? '，人机不发言' : ''}）`,
  });
  if (!g.speechOrder.length) {
    await startVote();
    return;
  }
  await saveGame();
  renderRoom();
}

async function advanceSpeech() {
  if (!g || g.phase !== 'day') return;
  const skipped = [];
  g.speechIndex += 1;
  while (g.speechIndex < g.speechOrder.length) {
    const seat = g.speechOrder[g.speechIndex];
    if (!isAliveSeat(seat)) {
      g.speechIndex += 1;
      continue;
    }
    if (!isSeatOnline(seat)) {
      skipped.push(seat);
      g.speechIndex += 1;
      continue;
    }
    break;
  }
  if (skipped.length) {
    g.log.push({ day: g.day, kind: 'system', text: `${skipped.map(pad).join('、')} 号离线，跳过发言` });
  }
  if (g.speechIndex >= g.speechOrder.length) {
    await startVote();
    return;
  }
  g.deadline = Date.now() + DUR.speech;
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

  const boom = findExplodeAction(actions);
  if (boom) {
    await resolveExplode(boom);
    return true;
  }
  return false;
}

// 普通狼人、白狼王可自爆；狼美人不能自爆
function findExplodeAction(actions) {
  return actions.find((action) => {
    if (!action.payload?.explode) return false;
    if (!isAliveSeat(action.seat)) return false;
    const row = rowBySeat(action.seat);
    return row && canSelfExplode(row.role);
  }) || null;
}

async function resolveExplode(action) {
  const seat = action.seat;
  const row = rowBySeat(seat);
  const isKing = row?.role === 'wolfking';
  let target = isKing && action.payload.target != null ? Number(action.payload.target) : null;
  if (target != null && (!isAliveSeat(target) || target === seat)) target = null;
  g.log.push({
    day: g.day,
    kind: 'system',
    text: `${isKing ? '白狼王' : '狼人'} ${pad(seat)} 号自爆${target != null ? `，带走 ${pad(target)} 号` : ''}，今天剩余流程全部跳过，立即进入黑夜`,
  });
  const raw = [{ seat, reason: 'selfboom' }];
  if (target != null) raw.push({ seat: target, reason: 'explode' });
  const deaths = Rules.expandDeaths(raw, {
    alive: aliveSet(),
    lovers: g.lovers,
    wolfbeautySeat: roleSeat('wolfbeauty'),
    charmTarget: g.charmTarget,
  });
  const outcome = await applyDeaths(deaths, 'day');
  if (outcome === 'continue') await startNightInternal(false);
  renderRoom();
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
  g.voteHistory = g.voteHistory || [];
  g.voteHistory.push({ day: g.day, phase: g.phase, counts: { ...tally.counts } });

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
  const payload = row?.payload || {};
  // 没提交/超时默认不翻牌；旧客户端没带 reveal 字段时按“选了目标即翻牌”兼容
  const reveal = payload.reveal === true || (payload.reveal === undefined && row?.target != null);
  const target = reveal && row?.target != null ? Number(row.target) : null;
  const from = g.hunterFrom || 'night';
  g.hunterPending = null;
  g.hunterFrom = null;

  if (reveal && target && isAliveSeat(target)) {
    g.log.push({ day: g.day, kind: 'death', text: `${pad(seat)} 号翻开猎人牌，开枪带走 ${pad(target)} 号` });
    const deaths = Rules.expandDeaths([{ seat: target, reason: 'hunter' }], {
      alive: aliveSet(),
      lovers: g.lovers,
      wolfbeautySeat: roleSeat('wolfbeauty'),
      charmTarget: g.charmTarget,
    });
    const outcome = await applyDeaths(deaths, 'day');
    if (outcome !== 'continue') return;
  } else if (reveal) {
    g.log.push({ day: g.day, kind: 'system', text: `${pad(seat)} 号翻开猎人牌，没有开枪` });
    const win = checkWin();
    if (win) {
      await finishGame(win.winner, win.reason);
      return;
    }
  }

  if (from === 'night') await startDawn(false);
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

function exitRoomLocal(message) {
  if (selfExited) return;
  selfExited = true;
  clearPreSpeech();
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
  allRoles = [];
  pick = null;
  kickAsked = null;
  showHome();
  setStatus(message);
  toast(message);
  setTimeout(() => { selfExited = false; }, 2000);
}

async function leaveRoom() {
  if (g && g.phase !== 'finished' && isHost()) {
    toast('房主离开会中断整局游戏，请等本局结束');
    return;
  }
  const leaving = session;
  clearPreSpeech();
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
    const kickedSeats = g.kicked || [];
    for (const member of members) {
      if (member.seat && kickedSeats.includes(member.seat)) {
        await client.from('players').delete().eq('id', member.id);
        continue;
      }
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
    clearPreSpeech();
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
  if (/is_bot|profiles_status_check/i.test(message)) {
    return '数据库还没升级：先在 Supabase SQL Editor 运行 supabase/migration-v6.sql';
  }
  if (/replays/i.test(message)) {
    return '历史回放表还没建好：先在 Supabase SQL Editor 运行 supabase/migration-v7.sql';
  }
  if (/profiles|username_taken/i.test(message)) {
    return '账号系统还没建好，先在 Supabase SQL Editor 运行 supabase/migration-v5.sql';
  }
  if (/fetch|network|Load failed|Failed to fetch/i.test(message)) {
    return '网络连不上服务器，检查加速器后重试';
  }
  if (/ratings/i.test(message)) {
    return '评分表还没建好，先在 Supabase SQL Editor 运行 supabase/migration-v4.sql';
  }
  if (/relation .* does not exist|column .* does not exist|schema cache|42703|42P01|PGRST205/i.test(message)) {
    return '数据库还没升级，先在 Supabase SQL Editor 运行 supabase/migration-v3.sql';
  }
  if (/permission denied|row-level security/i.test(message)) {
    return '数据库权限没配好，先运行 supabase/migration-v4.sql（评分）或 migration-v3.sql';
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
  if (!g || !isAliveSeat(myRow?.seat)) return;
  const text = els.chatInput.value.trim();
  if (!text) return;
  const name = profile?.username || session.name || '';
  if (g.phase === 'night' && isMyWolf()) {
    els.chatInput.value = '';
    act('wolfchat', null, { name, text });
    setTimeout(loadChat, 300);
    return;
  }
  if (g.phase !== 'day') return;
  const speaker = currentSpeaker();
  const speechDone = submitted.has(`${g.day}:speech`);
  if (speaker === myRow?.seat && !speechDone) {
    els.chatInput.value = '';
    act('chat', null, { name, text });
    setTimeout(loadChat, 300);
    return;
  }
  if (speaker != null && canPreInput()) {
    els.chatInput.value = '';
    queueSpeech(text);
    els.chatInput.focus();
  }
});

els.endSpeechBtn.addEventListener('click', () => {
  if (!g || g.phase !== 'day' || currentSpeaker() !== myRow?.seat) return;
  els.endSpeechBtn.disabled = true;
  act('speech', null, { turn: g.speechIndex });
});

els.leaveBtn.addEventListener('click', () => {
  leaveRoom().catch((error) => toast(friendlyError(error)));
});

els.replayBtn.addEventListener('click', () => {
  replayGame().catch((error) => toast(friendlyError(error)));
});

els.watchReplayBtn.addEventListener('click', () => {
  if (session) openLatestReplay(session.code).catch((error) => toast(friendlyError(error)));
});

els.spectateBtn.addEventListener('click', () => {
  const code = els.codeInput.value.trim();
  openSpectate(code).catch((error) => toast(friendlyError(error)));
});

els.spectateExit.addEventListener('click', exitSpectate);

els.spectateReplayBtn.addEventListener('click', () => {
  if (spectate) openLatestReplay(spectate.code).catch((error) => toast(friendlyError(error)));
});

els.replayBack.addEventListener('click', () => {
  replayData = null;
  showHome();
});

els.historyRefresh.addEventListener('click', () => {
  loadHistory();
});

els.replayFilters.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-filter]');
  if (!btn) return;
  replayFilter = btn.dataset.filter;
  renderReplayTimeline();
  els.replayFilters.querySelectorAll('button').forEach((item) => {
    item.classList.toggle('btn-dark', item.dataset.filter === replayFilter);
    item.classList.toggle('btn-outline-dark', item.dataset.filter !== replayFilter);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeAccountMenu();
  if (els.authModal && !els.authModal.hidden && profile) closeAuthModal();
});

els.modeSelect.addEventListener('change', updateModeHint);

document.querySelector('#heroStart').addEventListener('click', (event) => {
  event.preventDefault();
  if (session) {
    backToRoom();
    return;
  }
  if (!accountApproved()) {
    openAuthModal();
    els.loginName.focus({ preventScroll: true });
    return;
  }
  els.startCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  els.nameInput.focus({ preventScroll: true });
});

document.querySelector('.navbar a[href="#start"]').addEventListener('click', (event) => {
  event.preventDefault();
  if (session) {
    backToRoom();
    return;
  }
  if (!accountApproved()) {
    openAuthModal();
    return;
  }
  els.startCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('.navbar a[href="#historyCard"]').addEventListener('click', (event) => {
  event.preventDefault();
  if (session) showHome();
  if (!accountApproved()) {
    openAuthModal();
    return;
  }
  loadHistory();
  els.historyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

els.backToRoomBtn.addEventListener('click', backToRoom);

els.accountBtn.addEventListener('click', () => {
  if (!profile) {
    openAuthModal();
    return;
  }
  els.accountMenu.hidden = !els.accountMenu.hidden;
});

els.accountAdminBtn.addEventListener('click', () => {
  closeAccountMenu();
  if (session) showHome();
  if (isAdminAccount()) loadAdmin();
  els.adminCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

els.accountRefreshBtn.addEventListener('click', () => {
  closeAccountMenu();
  manualRefreshAccount();
});

document.addEventListener('click', (event) => {
  if (!els.accountMenu || els.accountMenu.hidden) return;
  if (els.accountBtn.contains(event.target) || els.accountMenu.contains(event.target)) return;
  closeAccountMenu();
});

els.authClose.addEventListener('click', closeAuthModal);
els.authModal.querySelectorAll('[data-auth-close]').forEach((node) => {
  node.addEventListener('click', closeAuthModal);
});

els.authCard.querySelectorAll('[data-auth-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.authTab;
    els.authCard.querySelectorAll('[data-auth-tab]').forEach((item) => {
      item.classList.toggle('active', item === btn);
    });
    els.loginForm.hidden = tab !== 'login';
    els.registerForm.hidden = tab !== 'register';
  });
});

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (authBusy || !guardClient()) return;
  const name = els.loginName.value.trim();
  const pass = els.loginPass.value;
  if (!NAME_RE.test(name)) {
    toast('用户名是 2–12 位中文、字母、数字或下划线');
    return;
  }
  if (!pass) {
    toast('请输入密码');
    return;
  }
  authBusy = true;
  setStatus('登录中…');
  setAuthNote('登录中…');
  try {
    const email = await emailFor(name);
    const { error } = await client.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    localStorage.setItem(NAME_KEY, name);
    setAuthNote('');
    await fetchProfileAndRoute();
  } catch (error) {
    const reason = friendlyAuthError(error);
    setStatus(`登录失败 · ${reason}`);
    setAuthNote(`登录失败：${reason}`);
    toast(reason);
  } finally {
    authBusy = false;
  }
});

els.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (authBusy || !guardClient()) return;
  const name = els.regName.value.trim();
  const pass = els.regPass.value;
  const pass2 = els.regPass2.value;
  if (!NAME_RE.test(name)) {
    toast('用户名需 2–12 位中文、字母、数字或下划线');
    return;
  }
  if (pass.length < 6) {
    toast('密码至少 6 位');
    return;
  }
  if (pass !== pass2) {
    toast('两次输入的密码不一致');
    return;
  }
  authBusy = true;
  setStatus('注册中…');
  setAuthNote('注册中…');
  try {
    const email = await emailFor(name);
    const { data: taken, error: takenError } = await client.rpc('username_taken', { name });
    if (takenError) throw takenError;
    if (taken) throw new Error('这个用户名已经被注册了');
    const { data: signData, error: signError } = await client.auth.signUp({ email, password: pass });
    if (signError) throw signError;
    if (!signData.session) {
      throw new Error('注册成功但没拿到登录态：请站长先在 Supabase 关闭 Confirm email；如果这个用户名之前注册过，需要先删掉旧账号');
    }
    const { error: profileError } = await client
      .from('profiles')
      .insert({ id: signData.user.id, username: name });
    if (profileError) {
      await client.auth.signOut().catch(() => {});
      throw profileError;
    }
    localStorage.setItem(NAME_KEY, name);
    await fetchProfileAndRoute();
    toast(name === OWNER_NAME ? '站长账号已创建' : '注册成功，等待站长或管理员审核');
  } catch (error) {
    const reason = friendlyAuthError(error);
    setStatus(`注册失败 · ${reason}`);
    setAuthNote(`注册失败：${reason}`);
    toast(reason);
  } finally {
    authBusy = false;
  }
});

async function manualRefreshAccount() {
  if (!guardClient() || authBusy) return;
  authBusy = true;
  try {
    await fetchProfileAndRoute();
  } catch (error) {
    const reason = friendlyAuthError(error);
    setAuthNote(reason);
    toast(reason);
  } finally {
    authBusy = false;
  }
}

els.refreshStatusBtn.addEventListener('click', manualRefreshAccount);
els.pendingRefresh.addEventListener('click', manualRefreshAccount);
els.adminRefresh.addEventListener('click', () => {
  if (!isAdminAccount()) return;
  loadAdmin();
});

async function doLogout() {
  if (authBusy) return;
  if (session) {
    toast('对局进行中，先点「返回对局」继续；要退出请先结束或离开房间');
    return;
  }
  authBusy = true;
  try {
    stopPendingPoll();
    await client.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    showAuthScreen();
    els.loginForm.reset();
    els.registerForm.reset();
    setStatus('已退出登录 · 请重新登录');
    setAuthNote('已退出登录，请重新登录');
  } catch (error) {
    toast(friendlyError(error));
  } finally {
    authBusy = false;
  }
}

els.logoutBtn.addEventListener('click', doLogout);
els.accountLogoutBtn.addEventListener('click', () => {
  closeAccountMenu();
  doLogout();
});

els.codeInput.addEventListener('input', () => {
  els.codeInput.value = els.codeInput.value.replace(/\D/g, '').slice(0, 6);
});

els.nameInput.addEventListener('input', () => {
  if (leaderboardData.length) renderLeaderboard();
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
  if (savedName) {
    els.loginName.value = savedName;
    els.regName.value = savedName;
  }

  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('room');
  if (fromUrl && /^\d{6}$/.test(fromUrl)) els.codeInput.value = fromUrl;

  if (!client) {
    setStatus('服务器未配置 · 等待 js/config.js 填入 Supabase 地址');
    els.createBtn.disabled = true;
    els.joinBtn.disabled = true;
    return;
  }

  setStatus('服务器已连接 · 请登录或注册');
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showAuthScreen();
  });

  try {
    const { data } = await client.auth.getSession();
    if (!data?.session) {
      showAuthScreen();
      return;
    }
    const ok = await fetchProfileAndRoute();
    if (!ok) setStatus('已登录 · 账号状态异常，请查看上方提示');
  } catch (error) {
    showAuthScreen();
    toast(friendlyAuthError(error));
  }
}

boot();
