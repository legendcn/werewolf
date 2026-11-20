import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { engine, MODES } from '../supabase/functions/game/engine.mjs';
import { project } from '../supabase/functions/game/protocol.mjs';
import preview from '../server.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
async function page(t, overrides = {}) {
  const dom = new JSDOM(read('index.html'), {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const w = dom.window, ctx = dom.getInternalVMContext(), run = (s) => vm.runInContext(s, ctx);
  w.WOLF_CONFIG = { SUPABASE_URL: 'http://localhost', SUPABASE_KEY: 'fixture' };
  w.supabase = {
    createClient: () => ({
      auth: {
        onAuthStateChange(cb) { queueMicrotask(() => cb('INITIAL_SESSION', null)); },
      },
      ...overrides,
    }),
  };
  for (const el of w.document.querySelectorAll('script[src]')) {
    const src = el.getAttribute('src').split('?')[0];
    if (!src.startsWith('vendor/') && src !== 'js/config.js') {
      await new vm.Script(read(src), { filename: src }).runInContext(ctx);
    }
  }
  await Promise.resolve();
  return { w, run };
}
test('reconnect retains saved membership on error, removes it only on confirmed absence', async (t) => {
  let fail = true;
  const { run, w } = await page(t, {
    functions: { invoke: async () => fail ? { error: new Error('offline') } : { data: { gone: true } } },
  });
  const token = JSON.stringify({ code: '123456', playerId: 'p' });
  w.localStorage.setItem('wolf.session', token);
  run(`profile={username:'test',status:'approved'};loadLeaderboard=loadHistory=()=>{};`);
  await run('afterApproved()');
  assert.equal(w.localStorage.getItem('wolf.session'), token);
  fail = false;
  await run('restoreSession()');
  assert.equal(w.localStorage.getItem('wolf.session'), null);
});
for (const late of ['snapshot', 'gone']) {
  test(`old tab receiving ${late} after rejoin keeps the newer reconnect record and never adopts its snapshot`, async t => {
    let finish;
    const token = {code:'123456',playerId:'new',accountId:'alice'};
    const {run,w} = await page(t, { functions:{ invoke: (_, {body}) => body.op === 'restore'
      ? Promise.resolve({data:token}) : new Promise(resolve => {finish = resolve;}) } });
    run(`profile={id:'alice',status:'approved'}; session={code:'123456',playerId:'old'};
      room={revision:1}; myRow={id:'old'}; loadLeaderboard=loadHistory=()=>{}; showRoom();
      els.roleName.textContent='OLD_CARD'; startPolling();`);
    const pending = run(`roomCommand('snapshot')`);
    // Same-origin tab B has left and rejoined while A was awaiting its snapshot.
    const storage = w.localStorage; storage.setItem('wolf.session',JSON.stringify(token));
    finish({data:late === 'gone' ? {gone:true} : {code:token.code,revision:12,me:{id:'new',role:'witch'}}});
    await pending;
    assert.equal(run('session === null && room === null && myRow === null && pollTimer === null'),true);
    assert.equal(run('els.roleName.textContent'),'');
    assert.deepEqual(JSON.parse(storage.getItem('wolf.session')),token);
    run(`profile.id='bob'; pollOnce=startPolling=()=>{}`); await run('restoreSession()');
    assert.equal(run('session'),null); assert.deepEqual(JSON.parse(storage.getItem('wolf.session')),token);
    run(`profile.id='alice'`); await run('restoreSession()');
    assert.equal(run('session.playerId'),'new');
  });
}

test('real DOM accepts a new match and rejects delayed snapshots from the old one', async (t) => {
  const { run, w } = await page(t);
  const mode = MODES[0];
  const roster = mode.roles.map((_, i) => ({ id: 'p' + i, name: 'P' + i, is_bot: false, online: true }));
  const referee = engine({ state: null, roster, mode });
  referee.start();
  const me = roster[0];
  const data = {
    code: '123456',
    revision: 15,
    hostId: me.id,
    options: { mode: mode.id, g: project(referee.state, me) },
    me,
    members: roster.map(({ role, ...r }) => r),
    channel: 'chat',
    chat: [],
    wolfPicks: [],
    submitted: [],
  };
  w.snap = data;
  run(`session={code:'123456',playerId:'p0'};loadRatings=async()=>{};applySnapshot(snap);`);
  assert.equal(w.document.querySelectorAll('#playerList li').length, 6);
  w.next = structuredClone(data);
  w.next.revision = 17;
  w.next.options.g.matchId = crypto.randomUUID();
  run('applySnapshot(next);applySnapshot(snap)');
  assert.equal(run('g.matchId'), w.next.options.g.matchId);
  w.next = {
    ...data,
    revision: 18,
    options: { mode: mode.id, g: null },
    me: { id: me.id, role: null, seat: null },
  };
  run('applySnapshot(next)');
  assert.equal(run('g'), null);
  assert.equal(w.document.querySelector('#watchReplayBtn').hidden, true);
});
test('sending day or wolf chat never announces a submission awaiting settlement', async (t) => {
  const { w, run } = await page(t);
  const sent = [];
  w.capture = args => sent.push(args.step);
  run(`g={phase:'day',step:'day',day:1,aliveSeats:[1,2],speechOrder:[1,2],speechIndex:0};
    myRow={seat:1,role:'villager'}; roomCommand=async(op,args)=>capture(args);`);
  for (const step of ['chat', 'wolfchat']) {
    if (step === 'wolfchat') {
      run(`g.phase='night'; g.step='wolves'; myRow.role='werewolf'; submitted.add('1:wolves')`);
    }
    run(`renderActionPanel(null,true); updateChatForm(); els.chatInput.value='测试发言'; els.chatForm.requestSubmit();`);
    await Promise.resolve();
    assert.equal(sent.at(-1), step);
    assert.equal(w.document.querySelector('#toast').hidden, true);
    assert.doesNotMatch(w.document.querySelector('#actionArea').textContent, /已提交，等待结算/);
    assert.equal(w.document.querySelector('#chatInput').disabled, false);
  }
  run(`roomCommand=async()=>{throw new Error('发送失败')}; els.chatInput.value='重试'; els.chatForm.requestSubmit()`);
  await new Promise(resolve => setImmediate(resolve));
  assert.match(w.document.querySelector('#toast').textContent, /发送失败/);
});

test('candidates and last words use the public chat form; police ballots highlight eligible seats', async t => {
  const {w, run} = await page(t); const sent = [];
  w.capture = args => sent.push(args);
  run(`session={code:'123456',playerId:'p1'}; myRow={id:'p1',seat:1,role:'villager'};
    members=[1,2,3].map(seat=>({seat,id:'p'+seat,name:'P'+seat,online:true}));
    roomCommand=async(op,args)=>capture(args); g={phase:'sheriff',step:'policeVote',day:1,aliveSeats:[1,2,3],sheriffCandidates:[2,3]};
    renderActionPanel(null,true); renderSeats({roles:[1,2,3]},true);`);
  assert.equal(run('pick.allowed.has(2)&&pick.allowed.has(3)&&!pick.allowed.has(1)'),true);
  assert.equal(w.document.querySelectorAll('#playerList .sr-clickable').length,2);
  run(`Object.assign(g,{step:'policeSpeech',policeOrder:[1,2],policeIndex:0});`);
  for (const phase of ['sheriff','lastwords']) {
    if (phase === 'lastwords') run(`Object.assign(g,{phase:'lastwords',step:'lastwords',aliveSeats:[2,3],lastWordsSeat:1})`);
    run(`renderActionPanel(null,true); updateChatForm(); els.chatInput.value='测试'; els.chatForm.requestSubmit()`);
    await Promise.resolve(); assert.equal(sent.at(-1).step,'chat');
    assert.equal(w.document.querySelector('#chatInput').disabled,false);
    assert.match(w.document.querySelector('#actionArea').textContent,phase === 'lastwords' ? /说完了/ : /结束发言/);
  }
  run(`myRow.seat=2;updateChatForm()`); assert.equal(w.document.querySelector('#chatInput').disabled,true);
});

test('only the lobby owner sees appointment controls; exhausted cards are not offered', async t => {
  const { w, run } = await page(t); const sent = [];
  w.capture = (op, args) => sent.push([op,args.id,args.role]);
  run(`session={code:'123456',playerId:'p'}; members=[{id:'p',name:'Owner'},{id:'q',name:'Guest'}];
    profile={role:'owner',status:'approved'}; room={appointments:{q:'seer'}}; roomCommand=async(op,args)=>capture(op,args);
    appointId='p'; renderSeats(MODES[0],false);`);
  const select = w.document.querySelector('.sr-rolepick'); assert.ok(select);
  assert.ok(!Array.from(select.options).some(o => o.value === 'seer'));
  select.value='witch'; select.dispatchEvent(new w.Event('change'));
  assert.deepEqual(sent,[['appoint','p','witch']]);
  run(`profile.role='member'; renderSeats(MODES[0],false)`);
  assert.equal(w.document.querySelectorAll('.sr-appoint').length,0);
});

test('moderation can filter pending users and page beyond the first 200', async (t) => {
  const fetched = [];
  const { run, w } = await page(t, {
    from: () => {
      let filter = null;
      return {
        select() {
          return this;
        },
        eq(k, v) {
          filter = v;
          return this;
        },
        order() {
          return this;
        },
        async range(lo, hi) {
          fetched.push([lo, hi, filter]);
          return { data: [{ id: 'fixture', username: 'user' + lo, role: 'member', status: 'pending' }] };
        },
      };
    },
  });
  run(`profile={id:'admin',role:'admin',status:'approved'};adminPage=4;`);
  await run('loadAdmin()');
  assert.deepEqual(fetched.pop(), [200, 250, 'pending']);
  assert.match(w.document.querySelector('#adminBody').textContent, /user200/);
});
test('history retries a failed read without dropping the previous list or duplicating requests', async (t) => {
  let calls = 0, failure = null;
  const { run, w } = await page(t, { from: () => ({
    select() { return this; }, order() { return this; },
    async limit() {
      calls++;
      return failure ? { error: failure } : { data: [{ id: 42, mode_name: '保留的回放', days: 2 }] };
    },
  }) });
  w.setTimeout = fn => queueMicrotask(fn); // retry backoff without wall-clock sleeps
  run(`profile={id:'user', status:'approved'}; applyAccountUI();`);
  await run('loadHistory()');
  failure = { code: '42501', message: 'read denied' };
  await run('Promise.all([loadHistory(),loadHistory()])');
  assert.equal(calls, 4); // initial success + three attempts, not six
  assert.match(w.document.querySelector('#historyBody').textContent, /保留的回放/);
  assert.match(w.document.querySelector('#historyNote').textContent, /上次.*读取权限/);
  failure = null;
  await run('loadHistory()');
  assert.doesNotMatch(w.document.querySelector('#historyNote').textContent, /失败/);
  run('showAuthScreen()');
  assert.doesNotMatch(w.document.querySelector('#historyBody').textContent, /保留的回放/);
});

test('spectating another room keeps the seat and last frame, recovers then pauses after five failures', async (t) => {
  let fail = false, refresh, calls = 0;
  const { run, w } = await page(t, { functions: { invoke: async (_, { body }) => {
    assert.equal(body.op, 'spectate');
    assert.equal(body.code, '654321');
    calls++;
    return fail ? { error: new Error('network offline') } : { data: {
      revision: 1, options: { mode: 'std9', g: { mode: 'std9', day: 1, phase: 'night', aliveSeats: [1], log: [] } },
      members: [], chat: [{ day: 1, payload: { text: '公开发言' } }],
    } };
  } } });
  w.scrollTo = () => {};
  w.setInterval = fn => { refresh = fn; return 1; };
  w.clearInterval = () => { refresh = null; };
  run(`profile={id:'u',status:'approved'}; session={code:'123456',playerId:'p'}; applyAccountUI();`);
  assert.equal(w.document.querySelector('#activeRoomCard').hidden, false);
  assert.ok(w.document.querySelector('#activeRoomCard #otherSpectate'));
  await run(`openSpectate('654321')`);
  assert.equal(w.document.querySelector('#spectateView').hidden, false);
  assert.equal(run('session.code'), '123456');
  const note = w.document.querySelector('#spectateNote');
  fail = true;
  await refresh();
  assert.match(note.textContent, /自动重试/);
  assert.match(w.document.querySelector('#spectateChat').textContent, /公开发言/);
  fail = false; await refresh();
  assert.equal(note.hidden, true);
  fail = true;
  for (let i = 0; i < 5; i++) await refresh();
  assert.equal(refresh, null);
  assert.match(note.textContent, /已暂停/);
  await run(`openSpectate('123456')`);
  assert.equal(calls, 8);
  assert.equal(run('spectate'), null);
  assert.equal(w.document.querySelector('#roomView').hidden, false);
  assert.equal(note.hidden, true);
});

test('SIGNED_OUT purges private DOM, drafts and polling; late room and replay responses cannot restore them', async t => {
  let authChanged, finishRoom, finishReplay;
  const { run, w } = await page(t, {
    auth: { onAuthStateChange(cb) { authChanged = cb; }, async getSession() { return {data:{session:null}}; } },
    functions: { invoke: () => new Promise(resolve => { finishRoom = resolve; }) },
    from: () => ({select() { return this; }, eq() { return this; }, maybeSingle() {
      return new Promise(resolve => { finishReplay = resolve; });
    }}),
  });
  run(`profile={id:'old',status:'approved'}; session={code:'123456',playerId:'p'};
    room={revision:1}; myRow={seat:1,role:'werewolf'}; g={phase:'night'}; roleShown=true;
    wolfChatRows=[{payload:{name:'狼',text:'PRIVATE_CHAT'}}]; renderChat();
    els.roleName.textContent='PRIVATE_ROLE'; els.chatInput.value='unsent';
    preSpeech={day:1,msgs:['PRIVATE_DRAFT']}; savePreSpeech(); showRoom(); startPolling();`);
  const lateRoom = run(`roomCommand('snapshot')`), lateReplay = run(`openReplay(1)`);
  authChanged('SIGNED_OUT');
  assert.equal(run('session === null && g === null && myRow === null && !roleShown && pollTimer === null'),true);
  assert.equal(run('wolfChatRows.length + preSpeech.msgs.length'),0);
  assert.equal(w.localStorage.getItem('wolf.prespeech:123456:p'),null);
  assert.equal(w.document.querySelector('#chatInput').value,'');
  assert.equal(w.document.querySelector('#roomView').hidden,true);
  assert.doesNotMatch(w.document.body.textContent,/PRIVATE_ROLE|PRIVATE_CHAT/);
  run(`profile={id:'new',status:'approved'}`);
  finishRoom({data:{revision:10,code:'123456'}}); finishReplay({data:{room_code:'old'}});
  await assert.rejects(lateRoom,/登录状态已变化/); await lateReplay;
  assert.equal(run('room === null && replayData === null && els.replayView.hidden'),true);
});

test('kick and leave send the original member, match or waiting-room revision', async t => {
  const { run, w } = await page(t); const sent=[]; w.capture=(op,args)=>sent.push([op,JSON.parse(JSON.stringify(args))]);
  run(`session={code:'123456',playerId:'me'}; room={revision:12}; roomCommand=capture;`);
  await run(`kickMember({id:'you'})`); run(`g={matchId:'new'}`); await run(`leaveRoom()`);
  assert.deepEqual(sent,[['kick',{id:'you',playerId:'me',matchId:null,lobbyRevision:12}],['leave',{playerId:'me',matchId:'new'}]]);
});

test('manual settlement retry repeats only a confirmed rolled-back operation with its precondition', async (t) => {
  const requests = [], retry = { matchId: 'match', revision: 9 };
  const { run, w } = await page(t, { functions: { invoke: async (_, { body }) => {
    requests.push(body);
    return { data: requests.length === 1 ? { error: '事务已回滚', code: 'SETTLEMENT_RETRY', retry } : { gone: true } };
  } } });
  run(`session={code:'123456',playerId:'p'}; localStorage.setItem(SESSION_KEY,JSON.stringify(session)); g={matchId:'match'};room={revision:9};`);
  await assert.rejects(run(`leaveRoom()`), /已回滚/);
  const button = w.document.querySelector('#retrySettlement');
  assert.equal(button.hidden, false);
  assert.match(button.textContent, /重试离房/);
  await run('retrySettlement()');
  await run('retrySettlement()');
  assert.equal(requests.length, 2);
  for (const req of requests) assert.deepEqual([req.op, req.matchId, req.playerId], ['leave','match','p']);
  assert.deepEqual(JSON.parse(JSON.stringify(requests[1].retry)), retry);
  assert.equal(run('session'), null);
  assert.equal(button.hidden, true);
  assert.equal(w.localStorage.getItem('wolf.session'), null);
});

test('ordinary victim can acknowledge an actual settlement snapshot without a hunter action', async (t) => {
  const { run, w } = await page(t);
  const mode = MODES.find(m => m.id === 'std9'), roster = mode.roles.map((_, i) => ({ id: `p${i}`, online: true }));
  const ref = engine({ state: null, roster, mode });
  ref.start();
  const victim = roster.find(p => p.role === 'villager');
  Object.assign(ref.state, { phase: 'vote', step: 'vote' });
  for (const p of roster) ref.record(p.seat, 'vote', p === victim ? -1 : victim.seat);
  ref.tick();
  w.view = project(ref.state, victim);
  w.victim = victim;
  run(`g=view; myRow=victim; act=(step)=>window.clicked=step; renderActionPanel(null,true)`);
  const panel = w.document.querySelector('#actionArea');
  assert.equal(panel.querySelectorAll('button').length, 1);
  assert.match(panel.textContent, /确认出局/);
  panel.querySelector('button').click();
  assert.equal(w.clicked, 'deathConfirm');
  run(`submitted.add(g.day+':deathConfirm'); renderActionPanel(null,true)`);
  assert.equal(panel.querySelector('button'), null);
});

test('guest rulebook opens from the home page, with working anchors and the actual deals', (t) => {
  const home = new JSDOM(read('index.html'), { url: 'http://localhost/werewolf/' });
  t.after(() => home.window.close());
  for (const region of ['.navbar', '#rules', '#authModal']) {
    const link = home.window.document.querySelector(`${region} a[href$="rules.html"]`);
    assert.equal(link?.href, 'http://localhost/werewolf/rules.html', region);
  }
  const file = preview.assetPath('/rules.html');
  assert.ok(file);
  const book = new JSDOM(readFileSync(file, 'utf8'));
  t.after(() => book.window.close());
  const doc = book.window.document;
  assert.equal(doc.querySelector('script'), null); // no login, JS, or database needed
  for (const a of doc.querySelectorAll('a[href^="#"]')) {
    assert.ok(doc.getElementById(a.hash.slice(1)), a.hash);
  }
  assert.ok(doc.querySelector('a[href="./index.html"]'));
  const { ROLES } = globalThis.WOLF_MODES;
  assert.equal(doc.querySelectorAll('tr[data-mode]').length, MODES.length);
  for (const mode of MODES) {
    const row = doc.querySelector(`tr[data-mode="${mode.id}"]`);
    assert.ok(row, mode.id);
    const [name, wolves, villagers, others] = Array.from(row.cells, cell => cell.textContent);
    assert.equal(name, mode.name);
    const expected = mode.roles.map(role => ROLES[role].name).sort();
    const pack = wolves.split('、').flatMap(group => {
      const [wolf, count] = group.split('×');
      return Array(Number(count)).fill(wolf);
    });
    assert.deepEqual([...pack, ...Array(Number(villagers)).fill('平民'), ...others.split('、')].sort(), expected, mode.id);
  }
});

test('preview serves only frontend assets and rejects invalid paths in the parser', () => {
  assert.ok(preview.assetPath('/supabase/functions/_shared/modes.js?v=8'));
  assert.equal(preview.assetPath('/supabase/functions/game/index.ts'), null);
  assert.throws(() => preview.assetPath('/%'), URIError);
});
