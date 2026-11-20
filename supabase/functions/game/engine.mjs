// One engine per locked room transaction. No DOM, database or module-level game state.
import { civicPhase, civicScenes, speechOrder } from './civic.mjs';
import { BANK_MS, TURN_MS, turnClock } from './turn-clock.mjs';
import '../_shared/rules.js';
import '../_shared/modes.js';
export const Rules = globalThis.WolfRules;
export const { MODES } = globalThis.WOLF_MODES;
const DAWN_MS = 6000;

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
  leave: '（离开房间）',
  kick: '（被站长请离）',
};

export function engine({ state: g, roster, mode, actions = [], clock = Date.now }) {
  const pending = [];
  const timer = turnClock(() => g, expectedSeats, fetchActions, roster, clock);
  const aliveSet = () => new Set(g.aliveSeats);
  const isAliveSeat = (seat) => g.aliveSeats.includes(seat);
  const rowBySeat = (seat) => roster.find((r) => r.seat === seat);
  const roleSeat = (role) => roster.find((r) => r.role === role)?.seat;
  const isBotSeat = (seat) => rowBySeat(seat)?.is_bot;
  const isSeatOnline = (seat) => rowBySeat(seat)?.online;
  const currentSpeaker = () => g.speechOrder?.[g.speechIndex];
  const pad = (seat) => String(seat).padStart(2, '0');
  const civic = civicScenes(() => g, {
    enterStep, startDay, isBotSeat, isSeatOnline, tallyVotes: Rules.tallyVotes, resume,
    openConfirm: openConfirmation,
  });
  function fetchActions(day, step) {
    const latest = new Map();
    for (const a of actions) {
      // Ordinary victims and the hunter share one private confirmation window.
      if (a.day === day && (a.step === step || (step === 'hunter' && a.step === 'deathConfirm'))) latest.set(a.seat, a);
    }
    return [...latest.values()];
  }
  function record(seat, step, target, payload = {}) {
    const confirmation = step === 'hunter' || step === 'deathConfirm';
    timer.charge(seat, confirmation ? 'hunter' : step);
    const phase = confirmation ? g.hunterFrom : g.phase;
    const action = { day: g.day, phase, step, seat, target, payload };
    actions.push(action);
    pending.push(action);
  }
  function start() {
    const total = mode.roles.length;
    if (g || roster.length !== total) throw new Error('未满员或对局已经开始');
    const pool = [...mode.roles];
    for (const row of roster) {
      if (row.role == null) continue;
      const i = pool.indexOf(row.role);
      if (i === -1) throw new Error('钦定身份与板子不符');
      pool.splice(i, 1);
    }
    const free = Rules.shuffle(pool);
    const seats = Rules.shuffle(roster.map((_, i) => i + 1));
    roster.forEach((row, i) => Object.assign(row, { role: row.role ?? free.pop(), seat: seats[i], alive: true }));
    const rolesBySeat = {};
    roster.forEach((row) => {
      rolesBySeat[row.seat] = row.role;
    });
    const teams = Rules.groupsFromRoles(rolesBySeat);
    const thiefSeat = roster.find((r) => r.role === 'thief')?.seat ?? null;
    const cupidSeat = roster.find((r) => r.role === 'cupid')?.seat ?? null;

    g = {
      mode: mode.id,
      phase: 'night',
      step: null,
      day: 1,
      deadline: null,
      aliveSeats: roster.map((r) => r.seat).sort((a, b) => a - b),
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
      sheriff: null,
      sheriffDone: false,
      speechDir: 'cw',
      speechOrder: null,
      speechIndex: 0,
      deaths: [],
      kicked: [],
      bank: Object.fromEntries(roster.map((p) => [p.seat, BANK_MS])),
      afk: [],
      log: [{ day: 1, kind: 'system', text: `板子：${mode.name}，共 ${total} 人` }],
      winner: null,
      winReason: '',
    };
    g.log.push({ day: 1, kind: 'night', text: '第 1 夜 · 天黑请闭眼' });
    g.matchId = crypto.randomUUID();
    startNightInternal(true);
  }

  function drawThiefCards() {
    const pool = ['villager', 'villager', 'werewolf', 'guard'];
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
    g.stepStart = clock();
    g.deadline = g.stepStart + TURN_MS;
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
    if (step === 'hunter' && g.phase === 'hunter') {
      // Old v8 rooms may already be waiting for a hunter without a batch of seats.
      return (g.deathConfirmSeats ?? [g.hunterPending]).filter(s => s != null && !rowBySeat(s)?.departed);
    }
    if (step === 'vote' || step === 'runoff') {
      return g.aliveSeats.filter((s) => !g.voteBanned.includes(s));
    }
    return civicPhase(g.phase) ? civic.expected(step) : [];
  }

  function allActed(step, actions) {
    const expected = expectedSeats(step);
    if (!expected.length) return true;
    const acted = new Set(actions.filter((a) => a.payload && !a.payload.ignore).map((a) => a.seat));
    if (expected.every((seat) => acted.has(seat))) return true;
    if (g.phase !== 'night') return false;
    // 夜晚给离线/掉线玩家留一点反应时间，避免女巫刚被判定离线就被跳过
    const started = g.stepStart ?? (g.deadline - TURN_MS);
    if (clock() - started < 12000) return false;
    return expected.every((seat) => acted.has(seat) || !isSeatOnline(seat));
  }

  function tick() {
    if (!g || g.phase === 'finished') return;
    let actions = fetchActions(g.day, g.step || 'day');
    const now = clock();
    if (['day', 'vote', 'runoff', 'sheriff', 'order', 'lastwords'].includes(g.phase)) {
      const boom = findExplodeAction(fetchActions(g.day, 'explode'));
      if (boom) {
        resolveExplode(boom);
        return;
      }
    }
    if (g.phase === 'night') {
      if (fillBotActions(g.step, actions)) actions = fetchActions(g.day, g.step);
      if (allActed(g.step, actions) || timer.expired(now)) {
        resolveNightStep(actions);
      }
    } else if (g.phase === 'dawn') {
      if (now >= g.deadline) civic.sunrise();
    } else if (civicPhase(g.phase)) {
      if (fillBotActions(g.step, actions)) actions = fetchActions(g.day, g.step);
      const solo = ['policeSpeech', 'lastwords', 'badge'].includes(g.step);
      if (allActed(g.step, actions) || now >= g.deadline ||
          (solo && !isSeatOnline(expectedSeats(g.step)[0]))) civic.resolve(actions);
    } else if (g.phase === 'day') {
      const handled = handleDaySpecial(actions);
      if (handled) return;
      const speaker = currentSpeaker();
      if (speaker == null) {
        startVote();
        return;
      }
      if (!isAliveSeat(speaker)) {
        advanceSpeech();
        return;
      }
      if (isBotSeat(speaker)) {
        g.log.push({ day: g.day, kind: 'system', text: `${pad(speaker)} 号（人机）不发言，跳过` });
        advanceSpeech();
        return;
      }
      if (!isSeatOnline(speaker)) {
        g.log.push({ day: g.day, kind: 'system', text: `${pad(speaker)} 号离线，跳过发言` });
        advanceSpeech();
        return;
      }
      const speechActions = fetchActions(g.day, 'speech');
      const ended = speechActions.some(
        (row) => row.seat === speaker && Number(row.payload?.turn) === g.speechIndex,
      );
      if (ended || timer.expired(now)) advanceSpeech();
    } else if (g.phase === 'vote' || g.phase === 'runoff') {
      if (fillBotActions(g.step, actions)) actions = fetchActions(g.day, g.step);
      const boom = findExplodeAction(actions);
      if (boom) {
        resolveExplode(boom);
        return;
      }
      if (allActed(g.step, actions) || timer.expired(now)) resolveVote(actions);
    } else if (g.phase === 'hunter') {
      if (fillBotActions('hunter', actions)) actions = fetchActions(g.day, 'hunter');
      if (allActed('hunter', actions) || timer.expired(now)) resolveHunter(actions);
    }
  }

  function depart(target, reason) {
    const row = rowBySeat(target);
    if (!row || !g || g.phase === 'finished' || g.kicked.includes(target)) return;
    if (reason === 'kick') g.kicked.push(target);
    g.log.push({
      day: g.day,
      kind: 'system',
      text: reason === 'kick'
        ? `站长把 ${pad(target)} 号请出了房间`
        : `${pad(target)} 号离开房间，按出局处理`,
    });
    if (!isAliveSeat(target)) {
      timer.interrupt([target]);
      return;
    }
    const deaths = Rules.expandDeaths([{ seat: target, reason }], {
      alive: aliveSet(),
      lovers: g.lovers,
      wolfbeautySeat: roleSeat('wolfbeauty'),
      charmTarget: g.charmTarget,
    });
    timer.interrupt(deaths.map(d => d.seat));
    // Pause, don't discard, the interrupted turn. Another departure during a
    // confirmation may add deaths but must not replace the original continuation.
    const resume = { phase: g.phase, step: g.step, stepStart: g.stepStart, deadline: g.deadline, pausedAt: clock() };
    const result = applyDeaths(deaths, g.phase === 'night' ? 'night' : 'day');
    if (result === 'pending' && resume.phase !== 'hunter') g.hunterResume = resume;
    if (result === 'continue') civic.afterDeaths(resume);
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
      if (isAliveSeat(g.kill) && g.potions.save && Math.random() < 0.5) {
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
    const reveal = Math.random() < 0.6;
    const target = reveal && Math.random() < 0.6 ? randomOf(g.aliveSeats.filter((s) => s !== seat)) : null;
    return { target, payload: { reveal } };
  }

  function fillBotActions(step, actions) {
    const expected = expectedSeats(step);
    if (!expected.length) return false;
    const acted = new Set(actions.map((a) => a.seat));
    let added = false;
    for (const seat of expected) {
      if (acted.has(seat) || !isBotSeat(seat)) continue;
      const row = rowBySeat(seat);
      if (!row) continue;
      let choice;
      if (step === 'hunter' && seat !== g.hunterPending) {
        record(seat, 'deathConfirm', null);
        added = true;
        continue;
      }
      if (step === 'hunter') choice = botHunterChoice(seat);
      else if (step === 'vote' || step === 'runoff') choice = botVoteChoice(step, seat);
      else if (step === 'policeSignup') choice = { target: null, payload: { run: false } };
      else if (step === 'policeVote' || step === 'policeRunoff') {
        const candidates = step === 'policeVote' ? g.sheriffCandidates : g.runoffSeats;
        choice = { target: randomOf(candidates.filter(isAliveSeat)) ?? -1, payload: {} };
      } else if (step === 'order' || step === 'badge') choice = null; // timeout gives the default
      else choice = botNightChoice(step, seat, row.role);
      if (!choice) continue;
      record(seat, step, choice.target, choice.payload);
      added = true;
    }
    return added;
  }

  function resolveNightStep(actions) {
    const step = g.step;
    const get = (seat) => isAliveSeat(seat) && actions.find((a) => a.seat === seat);

    if (step === 'thief' && isAliveSeat(g.thiefSeat)) {
      const row = get(g.thiefSeat);
      const index = row?.payload?.card === 1 ? 1 : 0;
      const chosen = g.thiefCards?.[index] || 'villager';
      applyThiefChoice(g.thiefSeat, chosen);
      g.nightQueue = buildNightQueue();
      g.log.push({ day: g.day, kind: 'system', text: '盗贼已经换牌' });
    } else if (step === 'cupid' && isAliveSeat(g.cupidSeat)) {
      const row = get(g.cupidSeat);
      const a = row?.payload?.a;
      const b = row?.payload?.b;
      if (a && b && a !== b && isAliveSeat(a) && isAliveSeat(b)) g.lovers = [a, b];
      g.log.push({ day: g.day, kind: 'system', text: '丘比特行动结束' });
    } else if (step === 'guard') {
      const seat = roleSeat('guard');
      const row = get(seat);
      const target = row?.target;
      if (target && target !== g.lastGuard && isAliveSeat(target)) {
        g.guarded = target;
      }
      g.lastGuard = g.guarded;
    } else if (step === 'wolves') {
      const top = Rules.wolfKillTop(actions, expectedSeats('wolves'), aliveSet());
      g.kill = top.length ? top[Math.floor(Math.random() * top.length)] : null;
    } else if (step === 'wolfbeauty') {
      const seat = roleSeat('wolfbeauty');
      const row = get(seat);
      const target = row?.target;
      if (target && target !== seat && target !== g.lastCharm && isAliveSeat(target)) {
        g.charmTarget = target;
      }
      g.lastCharm = g.charmTarget;
    } else if (step === 'witch') {
      const seat = roleSeat('witch');
      const row = get(seat);
      const payload = row?.payload || {};
      const save = Boolean(payload.save) && g.potions.save && isAliveSeat(g.kill);
      let poison = payload.poison;
      if (poison != null && (!isAliveSeat(poison) || !g.potions.poison)) poison = null;
      if (save && poison != null) poison = null;
      if (save) {
        g.saved = true;
        g.potions.save = false;
      }
      if (poison != null) {
        g.poison = poison;
        g.potions.poison = false;
      }
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
      enterStep(g.nightQueue[g.nightIndex]);
    } else {
      finishNight();
    }
  }

  function applyThiefChoice(seat, roleKey) {
    const row = roster.find((r) => r.seat === seat);
    if (!row) return;
    row.role = roleKey;
    const rolesBySeat = {};
    roster.forEach((r) => {
      rolesBySeat[r.seat] = r.role;
    });
    g.teams = Rules.groupsFromRoles(rolesBySeat);
  }

  function finishNight() {
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
    if (applyDeaths(deaths, 'night') === 'continue') civic.afterDeaths('dawn');
  }

  function markDeaths(deaths, when) {
    if (!deaths.length && when === 'night') {
      g.log.push({ day: g.day, kind: 'dawn', text: '昨夜是平安夜' });
    }
    deaths.forEach((death) => {
      g.aliveSeats = g.aliveSeats.filter((s) => s !== death.seat);
      g.deaths.push({ day: g.day, seat: death.seat, reason: death.reason });
      civic.death(death, when);
      g.log.push({
        day: g.day,
        kind: 'death',
        text: `${pad(death.seat)} 号出局${REASON_LABEL[death.reason] || ''}`,
      });
    });
    for (const death of deaths) rowBySeat(death.seat).alive = false;
    if (!isAliveSeat(g.kill)) g.kill = null;
  }

  function openConfirmation(seats, when) {
    g.deathConfirmSeats = seats;
    g.hunterPending = !g.hunterUsed ? seats.find(s => rowBySeat(s).role === 'hunter') ?? null : null;
    if (g.hunterPending != null) g.hunterUsed = true;
    g.hunterFrom = when;
    g.phase = g.step = 'hunter'; // internal v8 name; the public phase is always 'settling'
    g.deadline = clock() + TURN_MS;
  }

  function applyDeaths(deaths, when) {
    markDeaths(deaths, when);
    // Use only public facts to decide whether a confirmation window exists.
    // A hunter who concealed the card must NOT disable cover on later deaths.
    const seats = mode.roles.includes('hunter') && !g.hunterRevealed
      ? deaths.filter(d => ['wolf', 'vote', 'lover', 'charm'].includes(d.reason)).map(d => d.seat) : [];
    // A pending hunter/confirmation can still change the outcome, so victory
    // must wait for it; only settle immediately when no window is possible.
    const pendingConfirm = seats.length || g.confirmAfterWords || g.phase === 'hunter';
    if (!pendingConfirm) {
      const win = checkWin();
      if (win) {
        clearScenes();
        finishGame(win.winner, win.reason);
        return 'finished';
      }
    }
    if (g.phase === 'hunter') {
      if (seats.length) (g.queuedConfirmSeats ??= []).push(...seats);
      return 'pending';
    }
    if (seats.length) {
      if (when === 'day') {
        // 白天被放逐者先发表遗言，遗言结束后再开确认窗口（猎人先遗言后开枪）。
        const prior = g.confirmAfterWords?.seats || [];
        g.confirmAfterWords = { seats: [...prior, ...seats], when };
        return 'continue';
      }
      openConfirmation(seats, when);
      return 'pending';
    }
    return 'continue';
  }

  function clearScenes() {
    g.lastWordsQueue = [];
    g.lastWordsSeat = null;
    g.confirmAfterWords = null;
    g.badgePending = null;
  }

  function settleVictory() {
    const win = checkWin();
    if (win) {
      finishGame(win.winner, win.reason);
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

  function finishGame(winner, reason) {
    clearScenes();
    g.phase = 'finished';
    g.step = 'finished';
    g.deadline = null;
    g.winner = winner;
    g.winReason = reason;
    const label = winner === 'wolf'
      ? '狼人阵营获胜'
      : winner === 'lovers'
      ? '第三方阵营获胜'
      : '好人阵营获胜';
    g.log.push({ day: g.day, kind: 'finish', text: `游戏结束：${label}（${reason}）` });
  }

  function startDawn() {
    g.phase = 'dawn';
    g.step = 'dawn';
    g.deadline = clock() + DAWN_MS;
  }

  function startDay() {
    g.phase = 'day';
    g.step = 'day';
    const alive = g.aliveSeats.filter((s) => !isBotSeat(s)).sort((a, b) => a - b);
    const hasBots = g.aliveSeats.some((s) => isBotSeat(s));
    const deaths = g.deaths.filter(d => d.day === g.day);
    const sheriff = alive.includes(g.sheriff) && alive.length > 1;
    const start = sheriff ? g.sheriff : deaths.length ? Math.min(...deaths.map(d => d.seat)) + 1 : 1;
    g.speechDir = sheriff && g.speechDir === 'ccw' ? 'ccw' : 'cw';
    g.speechOrder = speechOrder(alive, start, g.speechDir);
    g.speechIndex = 0;
    g.deadline = g.speechOrder.length ? clock() + TURN_MS : 0;
    g.log.push({
      day: g.day,
      kind: 'system',
      text: `第 ${g.day} 天讨论开始，发言顺序：${g.speechOrder.map(pad).join(' → ') || '无'}（每人 ${
        TURN_MS / 1000
      } 秒${hasBots ? '，人机不发言' : ''}）`,
    });
    if (!g.speechOrder.length) {
      startVote();
      return;
    }
  }

  function advanceSpeech() {
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
      startVote();
      return;
    }
    g.deadline = clock() + TURN_MS;
  }

  function handleDaySpecial(actions) {
    const knightSeat = roleSeat('knight');
    const duel = knightSeat != null && !g.knightUsed
      ? actions.find((a) => isAliveSeat(knightSeat) && a.seat === knightSeat && a.payload?.duel)
      : null;
    if (duel) {
      const target = Number(duel.payload.duel);
      g.knightUsed = true;
      if (!isAliveSeat(target) || target === knightSeat) {
        return true;
      }
      if (g.teams.wolves.includes(target)) {
        timer.interrupt(); // the discussion ends immediately
        g.log.push({
          day: g.day,
          kind: 'system',
          text: `骑士 ${pad(knightSeat)} 号决斗 ${pad(target)} 号：${
            pad(target)
          } 号是狼人，立即出局，直接进入黑夜`,
        });
        const deaths = Rules.expandDeaths([{ seat: target, reason: 'duel' }], {
          alive: aliveSet(),
          lovers: g.lovers,
          wolfbeautySeat: roleSeat('wolfbeauty'),
          charmTarget: g.charmTarget,
        });
        const outcome = applyDeaths(deaths, 'day');
        if (outcome === 'continue') civic.afterDeaths('night');
      } else {
        g.log.push({
          day: g.day,
          kind: 'system',
          text: `骑士 ${pad(knightSeat)} 号决斗 ${pad(target)} 号：${
            pad(target)
          } 号是好人，骑士出局，白天继续`,
        });
        const deaths = Rules.expandDeaths([{ seat: knightSeat, reason: 'duel' }], {
          alive: aliveSet(),
          lovers: g.lovers,
          wolfbeautySeat: roleSeat('wolfbeauty'),
          charmTarget: g.charmTarget,
        });
        // Preserve the existing 15-second discussion grace after a failed duel.
        // If it resets the speaker's deadline, settle the old overtime first.
        const nextDeadline = Math.max(g.deadline, clock() + 15000);
        timer.interrupt(nextDeadline > g.deadline ? null : deaths.map(d => d.seat));
        const next = {phase:'day', step:'day', deadline:nextDeadline, pausedAt:clock()};
        const outcome = applyDeaths(deaths, 'day');
        if (outcome === 'continue') civic.afterDeaths(next);
        if (outcome === 'pending') g.hunterResume = next;
      }
      return true;
    }

    const boom = findExplodeAction(actions);
    if (boom) {
      resolveExplode(boom);
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
      return row && ['wolfking', 'werewolf'].includes(row.role);
    }) || null;
  }

  function resolveExplode(action) {
    timer.interrupt(); // before removing the speaker/voters or resetting the deadline
    const seat = action.seat;
    const row = rowBySeat(seat);
    const isKing = row?.role === 'wolfking';
    let target = isKing && action.payload.target != null ? Number(action.payload.target) : null;
    if (target != null && (!isAliveSeat(target) || target === seat)) target = null;
    // 自爆打断一切白天流程：剩余遗言/确认窗口作废；警上自爆则竞选作废、警徽流失。
    const duringElection = g.phase === 'sheriff';
    g.lastWordsQueue = [];
    g.lastWordsSeat = null;
    g.confirmAfterWords = null;
    if (duringElection) {
      g.sheriff = null;
      g.sheriffDone = true;
      g.sheriffCandidates = null;
      g.policeOrder = null;
      g.runoffSeats = null;
      g.log.push({ day: g.day, kind: 'system', text: '警长竞选被自爆打断，本局警徽流失' });
    }
    g.log.push({
      day: g.day,
      kind: 'system',
      text: `${isKing ? '白狼王' : '狼人'} ${pad(seat)} 号自爆${
        target != null ? `，带走 ${pad(target)} 号` : ''
      }，今天剩余流程全部跳过，立即进入黑夜`,
    });
    const raw = [{ seat, reason: 'selfboom' }];
    if (target != null) raw.push({ seat: target, reason: 'explode' });
    const deaths = Rules.expandDeaths(raw, {
      alive: aliveSet(),
      lovers: g.lovers,
      wolfbeautySeat: roleSeat('wolfbeauty'),
      charmTarget: g.charmTarget,
    });
    const outcome = applyDeaths(deaths, 'day');
    if (outcome === 'continue') civic.afterDeaths('night');
  }

  function startVote() {
    g.phase = 'vote';
    g.step = 'vote';
    g.deadline = clock() + TURN_MS;
    g.votes = null;
    g.runoffSeats = null;
    g.log.push({
      day: g.day,
      kind: 'vote',
      text: `投票开始（${TURN_MS / 1000} 秒），不能投自己，可以弃权`,
    });
  }

  function resolveVote(actions) {
    const eligible = g.aliveSeats.filter((s) => !g.voteBanned.includes(s));
    let rows = actions.filter((a) => eligible.includes(a.seat) && (a.target === -1 || isAliveSeat(a.target)));
    if (g.phase === 'runoff' && g.runoffSeats) {
      rows = rows.map((a) => ({ ...a, target: g.runoffSeats.includes(a.target) ? a.target : -1 }));
    }
    const voteText = rows.map((a) => `${pad(a.seat)}→${a.target > 0 ? pad(a.target) : '弃'}`).join('、');
    const tally = Rules.tallyVotes(rows, g.sheriff);
    g.votes = tally.counts;
    g.voteHistory = g.voteHistory || [];
    g.voteHistory.push({ day: g.day, phase: g.phase, counts: { ...tally.counts } });

    if (voteText) g.log.push({ day: g.day, kind: 'vote', text: `投票结果：${voteText}` });

    if (!tally.top.length) {
      g.log.push({ day: g.day, kind: 'vote', text: '无人得票，本轮无人出局' });
      startNightInternal(false);
      return;
    }

    if (tally.top.length > 1) {
      if (g.phase === 'vote') {
        g.phase = 'runoff';
        g.step = 'runoff';
        g.runoffSeats = tally.top;
        g.deadline = clock() + TURN_MS;
        g.log.push({
          day: g.day,
          kind: 'vote',
          text: `平票：${tally.top.map(pad).join('、')} 号进入 PK，请重新投票`,
        });
        return;
      }
      g.log.push({ day: g.day, kind: 'vote', text: '再次平票，本轮无人出局' });
      startNightInternal(false);
      return;
    }

    const target = tally.top[0];
    const targetRow = rowBySeat(target);
    g.log.push({ day: g.day, kind: 'vote', text: `${pad(target)} 号得票最多（${tally.counts[target]} 票）` });

    if (targetRow?.role === 'idiot') {
      if (!g.idiotRevealed.includes(target)) {
        g.idiotRevealed.push(target);
        g.voteBanned.push(target);
        g.log.push({
          day: g.day,
          kind: 'warning',
          text: `${pad(target)} 号翻开白痴牌，免于放逐，之后失去投票权`,
        });
      } else {
        g.log.push({ day: g.day, kind: 'vote', text: `${pad(target)} 号白痴已翻牌，本轮无人出局` });
      }
      startNightInternal(false);
      return;
    }

    const deaths = Rules.expandDeaths([{ seat: target, reason: 'vote' }], {
      alive: aliveSet(),
      lovers: g.lovers,
      wolfbeautySeat: roleSeat('wolfbeauty'),
      charmTarget: g.charmTarget,
    });
    const outcome = applyDeaths(deaths, 'day');
    if (outcome === 'continue') civic.afterDeaths('night');
  }

  function resolveHunter(actions) {
    const seat = g.hunterPending;
    const row = actions.find((a) => a.seat === seat);
    const reveal = row?.payload?.reveal ?? (row?.target != null);
    const target = reveal ? row?.target : null;
    const from = g.hunterFrom || 'night';
    g.hunterPending = null;
    g.hunterFrom = null;
    delete g.deathConfirmSeats;
    if (reveal) g.hunterRevealed = true;

    if (target && isAliveSeat(target)) {
      g.log.push({
        day: g.day,
        kind: 'death',
        text: `${pad(seat)} 号翻开猎人牌，开枪带走 ${pad(target)} 号`,
      });
      const deaths = Rules.expandDeaths([{ seat: target, reason: 'hunter' }], {
        alive: aliveSet(),
        lovers: g.lovers,
        wolfbeautySeat: roleSeat('wolfbeauty'),
        charmTarget: g.charmTarget,
      });
      markDeaths(deaths, from === 'night' ? 'night' : 'day');
    } else if (reveal) {
      g.log.push({ day: g.day, kind: 'system', text: `${pad(seat)} 号翻开猎人牌，没有开枪` });
    }

    const queued = g.queuedConfirmSeats;
    delete g.queuedConfirmSeats;
    if (queued?.length && !g.hunterRevealed) {
      openConfirmation(queued, from);
      return;
    }
    if (settleVictory() === 'finished') {
      delete g.hunterResume;
      return;
    }
    const next = g.hunterResume || (from === 'night' ? 'dawn' : 'night');
    delete g.hunterResume;
    civic.afterDeaths(next);
  }

  function resume(next) {
    if (typeof next === 'object') {
      const { phase, step, deadline, pausedAt } = next;
      const paused = clock() - pausedAt;
      Object.assign(g, { phase, step, deadline: deadline + paused });
      if (phase === 'night') g.stepStart = (next.stepStart ?? deadline - TURN_MS) + paused;
    } else if (next === 'dawn') startDawn();
    else startNightInternal(false);
  }

  return {
    start,
    tick,
    depart,
    expectedSeats,
    inTime: timer.inTime,
    record,
    pending,
    get state() {
      return g;
    },
  };
}
