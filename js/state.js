const gameState = {
  currentMapIndex:  0,
  currentRound:     1,
  currentTurnIndex: 0,
  initiativeOrder:  [],
  phase: 'initiative',
  pendingDiceRoll:  null,
  characters:       [],
  villain:          {},
  activeBuffs:      [],
  activeDebuffs:    [],
  battleStats: {
    damageDealt:    {},
    maxSingleHit:   {},
    healingDone:    {},
    damageTaken:    {},
    supportActions: {},
    missCount:      {},
    idleStreak:     {},
    usedSneakAttack: {},
  },
  escapedVillains: [],
  log: [],
};

function initState(mapIndex) {
  const map = CONFIG.maps[mapIndex];
  gameState.currentMapIndex  = mapIndex;
  gameState.currentRound     = 1;
  gameState.currentTurnIndex = 0;
  gameState.initiativeOrder  = [];
  gameState.phase            = 'initiative';
  gameState.pendingDiceRoll  = null;
  gameState.activeBuffs      = [];
  gameState.activeDebuffs    = [];
  gameState.log              = [];

  // Init/carry heroes
  if (gameState.characters.length === 0) {
    // First map — deep clone heroes from CONFIG
    gameState.characters = CONFIG.characters.map(c => ({
      ...c,
      abilities: c.abilities.map(a => ({ ...a })),
      hp:        c.maxHp,
      maxHp:     c.maxHp,
      xp:        0,
      level:     1,
      knockedOut: false,
      damageMod: 0,
      x:         c.startX,
      y:         c.startY,
    }));
  } else {
    // Carry over heroes (resetForNextMap handles HP/knockedOut)
    gameState.characters.forEach(c => {
      c.knockedOut = false;
      c.hp = c.maxHp;
    });
  }

  // Fresh villain from map config
  const boss = map.boss;
  gameState.villain = {
    ...boss,
    abilities: boss.abilities.map(a => ({ ...a })),
    hp:        boss.maxHp,
    maxHp:     boss.maxHp,
    knockedOut: false,
    damageMod: 0,
    actionsLeft: boss.actionsPerRound,
    isVillain:   true,
    x:           boss.startX,
    y:           boss.startY,
  };

  // Reset battle stats
  const allIds = [...gameState.characters.map(c => c.id), gameState.villain.id];
  gameState.battleStats = {
    damageDealt:     Object.fromEntries(allIds.map(id => [id, 0])),
    maxSingleHit:    Object.fromEntries(allIds.map(id => [id, 0])),
    healingDone:     Object.fromEntries(allIds.map(id => [id, 0])),
    damageTaken:     Object.fromEntries(allIds.map(id => [id, 0])),
    supportActions:  Object.fromEntries(allIds.map(id => [id, 0])),
    missCount:       Object.fromEntries(allIds.map(id => [id, 0])),
    idleStreak:      Object.fromEntries(allIds.map(id => [id, 0])),
    usedSneakAttack: Object.fromEntries(allIds.map(id => [id, false])),
  };
}

function resetForNextMap(nextMapIndex) {
  // Heroes carry level, XP, maxHp — HP restored
  gameState.characters.forEach(c => {
    c.knockedOut = false;
    c.hp = c.maxHp;
  });
  initState(nextMapIndex);
}

window.gameState = gameState;
