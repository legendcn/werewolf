(function () {
  const ROLES = {
    werewolf: {
      name: '狼人', camp: 'killer', campName: '狼人阵营',
      skill: '每晚与狼同伴共同刀掉一名玩家；白天要隐藏身份，靠发言误导好人。',
    },
    wolfking: {
      name: '白狼王', camp: 'killer', campName: '狼人阵营',
      skill: '狼人阵营。白天可自爆并带走一名玩家，立即进入黑夜。',
    },
    wolfbeauty: {
      name: '狼美人', camp: 'killer', campName: '狼人阵营',
      skill: '每晚参与袭击后可魅惑一名玩家；你出局时被魅惑者殉情（被骑士决斗除外）。不能连续两晚魅惑同一人。',
    },
    seer: {
      name: '预言家', camp: 'police', campName: '好人阵营 · 神职',
      skill: '每晚可以查验一名玩家，得知他是好人还是狼人。',
    },
    witch: {
      name: '女巫', camp: 'police', campName: '好人阵营 · 神职',
      skill: '有一瓶解药和一瓶毒药，每晚最多用一瓶：救回被刀的人，或毒死一名玩家。',
    },
    hunter: {
      name: '猎人', camp: 'police', campName: '好人阵营 · 神职',
      skill: '被狼人杀害或被投票出局时，可以开枪带走一名玩家；被女巫毒杀时不能开枪。',
    },
    guard: {
      name: '守卫', camp: 'police', campName: '好人阵营 · 神职',
      skill: '每晚守护一名玩家，被守护者当晚不会被狼刀；不能连续两晚守同一人。与女巫同时救守同一人时该玩家仍会出局（同守同救）。',
    },
    idiot: {
      name: '白痴', camp: 'police', campName: '好人阵营 · 神职',
      skill: '被投票放逐时翻牌免死，之后失去投票权，但仍可能被狼人刀死。',
    },
    knight: {
      name: '骑士', camp: 'police', campName: '好人阵营 · 神职',
      skill: '白天投票前可翻牌与一名玩家决斗：对方是狼人则立即出局并进入黑夜；对方是好人则你出局。',
    },
    villager: {
      name: '平民', camp: 'civilian', campName: '好人阵营 · 平民',
      skill: '没有技能。靠听发言、分析逻辑和投票，帮助好人找出狼人。',
    },
    cupid: {
      name: '丘比特', camp: 'neutral', campName: '特殊 · 爱神',
      skill: '第一晚选择两名玩家成为情侣（可包括自己）。若情侣分属狼人和好人，你和情侣成为第三方，目标是让其他所有人出局。',
    },
    thief: {
      name: '盗贼', camp: 'neutral', campName: '特殊 · 变动阵营',
      skill: '第一晚从两张底牌中选一张作为自己的身份，可能因此加入狼人阵营。',
    },
  };

  const MODES = [
    {
      id: 'newbie6',
      name: '6人新手局',
      desc: '第一次玩选这个：2 狼 2 民 + 预言家 + 女巫，几分钟一局。',
      roles: ['werewolf', 'werewolf', 'villager', 'villager', 'seer', 'witch'],
    },
    {
      id: 'std9',
      name: '9人标准局',
      desc: '经典 9 人局：3 狼 3 民 + 预言家、女巫、猎人。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'seer', 'witch', 'hunter'],
    },
    {
      id: 'std12',
      name: '12人标准局（预女猎守）',
      desc: '最流行的 12 人竞技板子：4 狼 4 民，预言家/女巫/猎人/守卫四神，屠边局。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'werewolf',
        'villager', 'villager', 'villager', 'villager',
        'seer', 'witch', 'hunter', 'guard'],
    },
    {
      id: 'bww12',
      name: '12人白狼王守卫局',
      desc: '狼队爆发力强：白狼王 + 3 狼 4 民，配预女猎守四神。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'wolfking',
        'villager', 'villager', 'villager', 'villager',
        'seer', 'witch', 'hunter', 'guard'],
    },
    {
      id: 'byh12',
      name: '12人预女猎白',
      desc: '预女猎白：4 狼 4 民 + 预言家、女巫、猎人、白痴。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'werewolf',
        'villager', 'villager', 'villager', 'villager',
        'seer', 'witch', 'hunter', 'idiot'],
    },
    {
      id: 'wmq12',
      name: '12人狼美人骑士局',
      desc: '官方版型：狼美人 + 3 狼 4 民，预言家/女巫/守卫/骑士四神，屠边暗牌。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'wolfbeauty',
        'villager', 'villager', 'villager', 'villager',
        'seer', 'witch', 'guard', 'knight'],
    },
    {
      id: 'qbt12',
      name: '12人丘比特局',
      desc: '爱神局：4 狼 4 民 + 预言家、女巫、猎人、丘比特。人狼情侣会组成第三方。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'werewolf',
        'villager', 'villager', 'villager', 'villager',
        'seer', 'witch', 'hunter', 'cupid'],
    },
    {
      id: 'dz12',
      name: '12人盗贼局',
      desc: '换牌局：4 狼 4 民 + 预言家、女巫、猎人、盗贼。盗贼从两张底牌里选身份，可能变狼。',
      roles: ['werewolf', 'werewolf', 'werewolf', 'werewolf',
        'villager', 'villager', 'villager', 'villager',
        'seer', 'witch', 'hunter', 'thief'],
    },
  ];

  const CAMPS = {
    killer: { tag: 'sr-tag-killer', bar: 'sr-me-killer', name: '狼人阵营' },
    police: { tag: 'sr-tag-police', bar: 'sr-me-police', name: '好人阵营 · 神职' },
    civilian: { tag: 'sr-tag-civilian', bar: '', name: '好人阵营 · 平民' },
    neutral: { tag: 'sr-tag-neutral', bar: 'sr-me-neutral', name: '特殊角色' },
  };

  function modeById(id) {
    return MODES.find((m) => m.id === id) || MODES[2];
  }

  function summary(mode) {
    const counts = {};
    const order = [];
    mode.roles.forEach((key) => {
      if (!counts[key]) { counts[key] = 0; order.push(key); }
      counts[key] += 1;
    });
    return order.map((key) => `${ROLES[key].name} ×${counts[key]}`).join(' · ');
  }

  window.WOLF_MODES = { ROLES, MODES, CAMPS, modeById, summary };
})();
