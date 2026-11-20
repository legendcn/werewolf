import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jwt = (id, tag = 'signature') => [ {alg:'HS256',typ:'JWT'}, {sub:id,exp:Math.floor(Date.now()/1000)+3600}, tag ]
  .map(part => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.');

function loadApp(dom) {
  const run = code => vm.runInContext(code, dom.getInternalVMContext());
  for (const script of dom.window.document.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src').split('?')[0];
    if (!src.startsWith('vendor/') && src !== 'js/config.js') run(read(src));
  }
  run('loadHistory=loadLeaderboard=()=>{};');
  return run;
}

for (const outcome of ['approved', 'banned', 'invalid token', 'rotated token']) {
  test(`reload with a saved session reads the profile directly (${outcome})`, {timeout:5000}, async t => {
    const url = 'http://localhost', id = 'alice', token = jwt(id), replacement = jwt(id, 'replacement');
    const rotated = outcome === 'rotated token';
    const seed = new JSDOM('', {url,runScripts:'outside-only'});
    const next = new JSDOM(read('index.html'), {url,runScripts:'outside-only'});
    const requests = [], profileStarted = Promise.withResolvers(), response = Promise.withResolvers();
    t.after(async () => {
      response.resolve();
      if (run) await run('profileRead?.promise')?.catch(()=>{});
      seed.window.close(); next.window.close();
    });
    let run;
    for (const w of [seed.window,next.window]) {
      const fetch = async (input, init) => {
        const path = new URL(input.url || input).pathname;
        const bearer = new Headers(init?.headers || input.headers).get('authorization');
        if (w === next.window) {
          requests.push([path,bearer]);
          profileStarted.resolve();
          await response.promise;
        }
        if (path === '/auth/v1/user') return Response.json({id,aud:'authenticated',role:'authenticated'});
        if (path === '/rest/v1/profiles') {
          return outcome === 'invalid token' || (rotated && bearer === `Bearer ${token}`)
            ? Response.json({code:'PGRST301',message:'JWT expired'}, {status:401})
            : Response.json([{id,username:'Alice',status:rotated ? 'approved' : outcome,role:'member'}]);
        }
        throw new Error('Unexpected offline test request: ' + path);
      };
      Object.assign(w,{fetch,Headers,Request,Response,TextEncoder,TextDecoder,WebSocket,
        WOLF_CONFIG:{SUPABASE_URL:url,SUPABASE_KEY:'fixture'}});
      w.eval(read('vendor/supabase.js'));
    }
    const sdk = seed.window.supabase.createClient(url,'fixture',{auth:{autoRefreshToken:false}});
    assert.ifError((await sdk.auth.setSession({access_token:token,refresh_token:'fixture-alice'})).error);
    const copySession = () => {
      for (const key of Object.keys(seed.window.localStorage)) {
        next.window.localStorage.setItem(key,seed.window.localStorage.getItem(key));
      }
    };
    copySession();
    run = loadApp(next);
    await profileStarted.promise;
    assert.deepEqual(requests,[['/rest/v1/profiles',`Bearer ${token}`]]);
    assert.match(run('els.accountBtn.textContent'),/正在恢复登录状态/);
    assert.equal(run('profile'),null);
    assert.equal(run('els.createBtn.disabled && els.joinBtn.disabled && els.authModal.hidden'),true);
    const ready = run('profileRead.promise');
    if (rotated) {
      // A peer has refreshed the saved session while the old request was in flight.
      assert.ifError((await sdk.auth.setSession({access_token:replacement,refresh_token:'fixture-alice-new'})).error);
      copySession();
    }
    response.resolve();
    await ready;
    assert.deepEqual(requests,(rotated ? [token,replacement] : [token]).map(token => ['/rest/v1/profiles',`Bearer ${token}`]));
    assert.equal(run('els.accountBtn.disabled'),false);
    assert.equal(run('accountApproved()'),rotated || outcome === 'approved');
    assert.equal(run('els.authModal.hidden'),outcome !== 'invalid token');
    if (outcome === 'invalid token') assert.match(run('els.authStatus.textContent'),/请重新登录/);
    else assert.match(run('els.accountBtn.textContent'),/Alice/);
  });
}

// Two copies of the shipped Auth SDK share same-origin storage and use real BroadcastChannels.
// Only HTTP is faked: no hosted Auth, database or signing keys are involved.
test('SDK account replacement without SIGNED_OUT clears private state before routing the new user', {timeout:10000}, async t => {
  const a = new JSDOM(read('index.html'), {url:'http://localhost/',runScripts:'outside-only'});
  const b = new JSDOM('', {url:'http://localhost/',runScripts:'outside-only'});
  const tabs = [a.window,b.window], channels = [];
  const sessions = new Map(['alice','bob'].map(id => [id,jwt(id)]));
  const tokens = new Map(Array.from(sessions, ([id,token]) => [token,id]));
  const bobProfile = Promise.withResolvers(), bobProfileStarted = Promise.withResolvers();
  const http = async (input, init) => {
    const url = new URL(input.url || input);
    const id = tokens.get(new Headers(init?.headers || input.headers).get('authorization')?.replace(/^Bearer /i,''));
    if (url.pathname === '/auth/v1/user' && id) return Response.json({id,aud:'authenticated',role:'authenticated'});
    if (url.pathname === '/rest/v1/profiles' && id) {
      if (id === 'bob') { bobProfileStarted.resolve(); await bobProfile.promise; }
      return Response.json([{id,username:id,status:'approved',role:'member'}]);
    }
    throw new Error('Unexpected offline test request: ' + url.pathname);
  };
  t.after(() => { for (const channel of channels) channel.close(); for (const w of tabs) w.close(); });
  Object.defineProperty(b.window,'localStorage',{value:a.window.localStorage});
  for (const w of tabs) {
    Object.assign(w,{fetch:http,Headers,Request,Response,TextEncoder,TextDecoder,WebSocket,
      BroadcastChannel:class extends BroadcastChannel { constructor(name) { super(name); channels.push(this); } }});
    w.WOLF_CONFIG = {SUPABASE_URL:'http://localhost',SUPABASE_KEY:'fixture'};
    w.eval(read('vendor/supabase.js'));
  }
  const w = a.window, run = loadApp(a);
  // Observe completed UI routing, not just event delivery.
  const waitForUser = id => new Promise(resolve => {
    const check = () => { if (run('profile?.id') !== id) return; observer.disconnect(); resolve(); };
    const observer = new w.MutationObserver(check); observer.observe(w.document.body,{subtree:true,childList:true}); check();
  });
  const peer = b.window.supabase.createClient('http://localhost','fixture');
  const switchTo = async id => {
    const arrived = waitForUser(id);
    const {error} = await peer.auth.setSession({access_token:sessions.get(id),refresh_token:'fixture-'+id});
    assert.ifError(error); await arrived;
  };
  await switchTo('alice');
  run(`session={code:'123456',playerId:'seat-a'}; myRow={id:'seat-a'}; room={revision:1};
    g={phase:'night'}; els.roleName.textContent='PRIVATE_ROLE'; wolfChatRows=[{payload:{name:'狼',text:'PRIVATE_CHAT'}}]; renderChat();`);
  const epoch = run('authEpoch');
  // A repeated SIGNED_IN with the same principal must not tear down the room.
  const repeated = Promise.withResolvers();
  const observer = run('client.auth').onAuthStateChange((event, data) => {
    if (event === 'SIGNED_IN' && data.user.id === 'alice') repeated.resolve();
  });
  const again = await peer.auth.setSession({access_token:sessions.get('alice'),refresh_token:'fixture-alice'});
  assert.ifError(again.error); await repeated.promise; observer.data.subscription.unsubscribe();
  run(`onAuthChange('TOKEN_REFRESHED',{user:{id:'alice'}})`);
  assert.equal(run('authEpoch'),epoch); assert.equal(run('session.playerId'),'seat-a');
  let finish; Object.defineProperty(run('client'),'functions',{value:{invoke:() => new Promise(resolve => { finish=resolve; })}});
  const late = run(`roomCommand('snapshot')`);
  const switched = switchTo('bob');
  await bobProfileStarted.promise;
  assert.equal(run('profile'),null); // old data must be gone before the new profile arrives
  assert.ok(run('authEpoch') > epoch); assert.equal(run('session === null && myRow === null && g === null'),true);
  assert.doesNotMatch(w.document.body.textContent,/PRIVATE_ROLE|PRIVATE_CHAT/);
  finish({data:{code:'123456',revision:2}}); await assert.rejects(late,/登录状态已变化/);
  assert.equal(run('room'),null);
  bobProfile.resolve(); await switched;
  assert.equal(run('profile.id'),'bob');
});
