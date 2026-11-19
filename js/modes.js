(function () {
  const ROLES = {
    werewolf: {
      name: '狼人', camp: 'killer', campName: '狼人阵营',
      skill: '每晚与狼同伴共同刀掉一名玩家；白天要隐藏身份，靠发言误导好人。',
    },
    wolfking: {
      name: '白狼王', camp: 'killer', campName: '狼人阵营',
      skill: '狼人阵营。白天可以自爆，公开身份并带走一名玩家，然后立即进入黑夜。',
    },
    seer: {
      name: '预言家', camp: 'police', campName: '好人阵营 · 神职',
      skill: '每晚可以查验一名玩家，法官会告诉你他是好人还是狼人。',
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
      skill: '每晚守护一名玩家，被守护者当晚不会被狼人杀害；不能连续两晚守同一个人。',
    },
    idiot: {
      name: '白痴', camp: 'police', campName: '好人阵营 · 神职',
      skill: '被投票出局时翻牌亮明身份，免于出局，但之后失去投票权，仍可能被狼人刀死。',
    },
    villager: {
      name: '平民', camp: 'civilian', campName: '好人阵营 · 平民',
      skill: '没有技能。靠听发言、分析逻辑和投票，帮助好人找出狼人。',
    },
    killer: {
      name: '杀手', camp: 'killer', campName: '杀手阵营',
      skill: '与杀手同伴互相知道身份，每晚共同刀掉一名玩家；白天隐藏身份。',
    },
    police: {
      name: '警察', camp: 'police', campName: '好人阵营 · 警察',
      skill: '与警察同伴互相知道身份，每晚共同查验一名玩家，得知其是不是杀手。',
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
      desc: '最流行的 12 人竞技板子：4 狼 4 民，预言家/女巫/猎人/守卫四神。',
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
      id: 'qoj16',
      name: '16人·QOJ杀手警察局',
      desc: 'QOJ 同款：4 杀手 4 警察 8 平民。杀手互认，警察互认，警察每晚共同验人。',
      roles: ['killer', 'killer', 'killer', 'killer',
        'police', 'police', 'police', 'police',
        'villager', 'villager', 'villager', 'villager',
        'villager', 'villager', 'villager', 'villager'],
    },
  ];

  const CAMPS = {
    killer: { tag: 'sr-tag-killer', bar: 'sr-me-killer', name: '狼人阵营' },
    police: { tag: 'sr-tag-police', bar: 'sr-me-police', name: '好人阵营 · 神职' },
    civilian: { tag: 'sr-tag-civilian', bar: '', name: '好人阵营 · 平民' },
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
