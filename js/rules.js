(function () {
  const WOLF_ROLES = ['werewolf', 'wolfking', 'wolfbeauty'];
  const GOD_ROLES = ['seer', 'witch', 'hunter', 'guard', 'idiot', 'knight', 'cupid'];

  function isWolfRole(role) {
    return WOLF_ROLES.includes(role);
  }

  function isGodRole(role) {
    return GOD_ROLES.includes(role);
  }

  function groupsFromRoles(rolesBySeat) {
    const wolves = [];
    const gods = [];
    const villagers = [];
    Object.keys(rolesBySeat).forEach((seatKey) => {
      const seat = Number(seatKey);
      const role = rolesBySeat[seatKey];
      if (isWolfRole(role)) wolves.push(seat);
      else if (isGodRole(role)) gods.push(seat);
      else if (role === 'villager') villagers.push(seat);
    });
    return { wolves, gods, villagers };
  }

  // 死亡链：情侣殉情 + 狼美人魅惑对象殉情（被骑士决斗时单死）
  function expandDeaths(initial, ctx) {
    const alive = ctx.alive;
    const deaths = new Map();
    initial.forEach((death) => {
      if (death.seat != null && alive.has(death.seat)) deaths.set(death.seat, death.reason);
    });
    let changed = true;
    while (changed) {
      changed = false;
      for (const entry of [...deaths]) {
        const seat = entry[0];
        const reason = entry[1];
        if (ctx.lovers) {
          const partner = ctx.lovers[0] === seat ? ctx.lovers[1]
            : ctx.lovers[1] === seat ? ctx.lovers[0] : null;
          if (partner != null && alive.has(partner) && !deaths.has(partner)) {
            deaths.set(partner, 'lover');
            changed = true;
          }
        }
        if (seat === ctx.wolfbeautySeat && reason !== 'duel'
          && ctx.charmTarget != null && alive.has(ctx.charmTarget) && !deaths.has(ctx.charmTarget)) {
          deaths.set(ctx.charmTarget, 'charm');
          changed = true;
        }
      }
    }
    return [...deaths.entries()].map(([seat, reason]) => ({ seat, reason }));
  }

  // 狼人各自投票，返回最高票目标（可能并列）
  function wolfKillTop(picks, wolfSeats, alive) {
    const tally = new Map();
    picks.forEach(({ seat, target }) => {
      if (!wolfSeats.includes(seat)) return;
      if (target == null || target <= 0) return;
      if (!alive.has(target)) return;
      tally.set(target, (tally.get(target) || 0) + 1);
    });
    if (!tally.size) return [];
    const max = Math.max(...tally.values());
    return [...tally.entries()].filter(([, n]) => n === max).map(([seat]) => seat);
  }

  function tallyVotes(voteRows) {
    const counts = {};
    voteRows.forEach(({ target }) => {
      if (target != null && target > 0) counts[target] = (counts[target] || 0) + 1;
    });
    let max = 0;
    Object.values(counts).forEach((n) => { if (n > max) max = n; });
    const top = Object.keys(counts).filter((key) => counts[key] === max).map(Number);
    return { counts, top: max === 0 ? [] : top, max };
  }

  // 胜负：爱神第三方 > 屠边/狼刀在先 > 好人
  function winCheck(opts) {
    const alive = opts.alive;
    const teams = opts.teams;
    const lovers = opts.lovers;
    const cupidSeat = opts.cupidSeat;
    const wolvesAlive = teams.wolves.filter((seat) => alive.has(seat));
    const godsAlive = teams.gods.filter((seat) => alive.has(seat));
    const villagersAlive = teams.villagers.filter((seat) => alive.has(seat));

    let thirdActive = false;
    if (lovers) {
      const aWolf = teams.wolves.includes(lovers[0]);
      const bWolf = teams.wolves.includes(lovers[1]);
      thirdActive = aWolf !== bWolf && alive.has(lovers[0]) && alive.has(lovers[1]);
    }

    if (thirdActive) {
      const others = [...alive].filter((seat) => !lovers.includes(seat) && seat !== cupidSeat);
      if (others.length === 0) {
        return { winner: 'lovers', reason: '人狼情侣存活到了最后，第三方阵营获胜' };
      }
    }

    const godsWiped = teams.gods.length > 0 && godsAlive.length === 0;
    const villagersWiped = teams.villagers.length > 0 && villagersAlive.length === 0;
    const wolfWin = !thirdActive && (godsWiped || villagersWiped);
    const goodWin = wolvesAlive.length === 0;

    if (wolfWin) {
      return { winner: 'wolf', reason: godsWiped ? '神职全部出局，狼人屠边获胜' : '平民全部出局，狼人屠边获胜' };
    }
    if (goodWin) {
      return { winner: 'good', reason: '所有狼人均已出局，好人阵营获胜' };
    }
    return null;
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  const api = {
    WOLF_ROLES,
    GOD_ROLES,
    isWolfRole,
    isGodRole,
    groupsFromRoles,
    expandDeaths,
    wolfKillTop,
    tallyVotes,
    winCheck,
    shuffle,
  };

  if (typeof window !== 'undefined') window.WolfRules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
