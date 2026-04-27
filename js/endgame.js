// ---- XP & Leveling ----

function applyXP(charId, amount) {
  const char = gameState.characters.find(c => c.id === charId);
  if (!char || amount <= 0) return;

  char.xp = (char.xp || 0) + amount;

  const thresholds = CONFIG.game.xpThresholds;
  const maxLevel   = thresholds.length; // 5

  while ((char.level || 1) < maxLevel && char.xp >= thresholds[(char.level || 1)]) {
    levelUp(char);
  }
}

function levelUp(char) {
  char.level  = (char.level || 1) + 1;
  char.maxHp += CONFIG.game.levelBonuses.hpPerLevel;
  char.hp     = Math.min(char.maxHp, char.hp + CONFIG.game.levelBonuses.hpPerLevel);
  char.attackBonus += CONFIG.game.levelBonuses.attackPerLevel;
  char.damageMod    = (char.damageMod || 0) + CONFIG.game.levelBonuses.damagePerLevel;

  addLog(`${char.name} достигает уровня ${char.level}!`, 'log-system');

  // Visual effect on token
  const token = document.querySelector(`.token[data-id="${char.id}"]`);
  if (token) {
    token.classList.add('level-up-anim');
    setTimeout(() => token.classList.remove('level-up-anim'), 1000);
  }

  uiUpdateHpBar(char.id);
}

// ---- Awards ----

function calculateAwards() {
  const stats   = gameState.battleStats;
  const awardVals = CONFIG.game.awardValues;
  const awards  = [];

  const livingHeroes = gameState.characters.filter(c => !c.knockedOut);
  const allHeroes    = gameState.characters;

  // Berserker: highest single hit
  const berserkerHero = allHeroes.reduce((best, c) => {
    return (stats.maxSingleHit[c.id] || 0) > (stats.maxSingleHit[best.id] || 0) ? c : best;
  }, allHeroes[0]);
  if (berserkerHero && (stats.maxSingleHit[berserkerHero.id] || 0) > 0) {
    awards.push({ charId: berserkerHero.id, key: 'berserker', label: '🗡 Берсерк', xp: awardVals.berserker });
  }

  // Guardian: most healing
  const guardianHero = allHeroes.reduce((best, c) => {
    return (stats.healingDone[c.id] || 0) > (stats.healingDone[best.id] || 0) ? c : best;
  }, allHeroes[0]);
  if (guardianHero && (stats.healingDone[guardianHero.id] || 0) > 0) {
    awards.push({ charId: guardianHero.id, key: 'guardian', label: '✦ Хранитель', xp: awardVals.guardian });
  }

  // Unbreakable: most damage taken (survived)
  const unbreaHero = livingHeroes.reduce((best, c) => {
    if (!best) return c;
    return (stats.damageTaken[c.id] || 0) > (stats.damageTaken[best.id] || 0) ? c : best;
  }, livingHeroes[0]);
  if (unbreaHero && (stats.damageTaken[unbreaHero.id] || 0) > 0) {
    awards.push({ charId: unbreaHero.id, key: 'unbreakable', label: '⬡ Несломленный', xp: awardVals.unbreakable });
  }

  // Team Player: most support actions
  const teamHero = allHeroes.reduce((best, c) => {
    return (stats.supportActions[c.id] || 0) > (stats.supportActions[best.id] || 0) ? c : best;
  }, allHeroes[0]);
  if (teamHero && (stats.supportActions[teamHero.id] || 0) > 0) {
    awards.push({ charId: teamHero.id, key: 'teamPlayer', label: '◈ Командный игрок', xp: awardVals.teamPlayer });
  }

  // Precision: no misses
  allHeroes.forEach(c => {
    if ((stats.missCount[c.id] || 0) === 0 && (stats.damageDealt[c.id] || 0) > 0) {
      awards.push({ charId: c.id, key: 'precision', label: '◎ Точность', xp: awardVals.precision });
    }
  });

  // Idle penalty: 2+ skipped turns
  allHeroes.forEach(c => {
    if ((stats.idleStreak[c.id] || 0) >= 2) {
      awards.push({ charId: c.id, key: 'idlePenalty', label: '⊗ Бездействие', xp: awardVals.idlePenalty, negative: true });
    }
  });

  return awards;
}

// ---- Battle outcomes ----

function battleVictory() {
  gameState.phase = 'battle_end';
  addLog(`Победа! ${gameState.villain.name} повержен.`, 'log-system');

  // Kill XP for all living heroes
  gameState.characters.forEach(c => {
    if (!c.knockedOut) {
      applyXP(c.id, CONFIG.game.xpRewards.killVillain);
    }
  });

  const awards = calculateAwards();

  // Apply XP from damage/heal stats
  gameState.characters.forEach(c => {
    const dmgXP  = Math.floor((gameState.battleStats.damageDealt[c.id] || 0) * CONFIG.game.xpRewards.damageDealt);
    const healXP = Math.floor((gameState.battleStats.healingDone[c.id] || 0) * CONFIG.game.xpRewards.healingDone);
    applyXP(c.id, dmgXP + healXP);
  });

  awards.forEach(a => {
    if (a.xp > 0) applyXP(a.charId, a.xp);
    else if (a.xp < 0) {
      const char = gameState.characters.find(c => c.id === a.charId);
      if (char) char.xp = Math.max(0, (char.xp || 0) + a.xp);
    }
  });

  showResultsScreen('victory', awards);
}

function battleDefeat() {
  gameState.phase = 'battle_end';
  addLog(`Поражение! Вся команда выбита.`, 'log-system');
  showResultsScreen('defeat', []);
}

function villainFled() {
  gameState.phase = 'battle_end';
  gameState.escapedVillains.push(gameState.villain.id);
  addLog(`${gameState.villain.name} бежал с поля боя!`, 'log-system');

  // Partial XP still applies
  gameState.characters.forEach(c => {
    const dmgXP  = Math.floor((gameState.battleStats.damageDealt[c.id] || 0) * CONFIG.game.xpRewards.damageDealt);
    const healXP = Math.floor((gameState.battleStats.healingDone[c.id] || 0) * CONFIG.game.xpRewards.healingDone);
    applyXP(c.id, dmgXP + healXP);
  });

  const awards = calculateAwards();
  awards.forEach(a => {
    if (a.xp > 0) applyXP(a.charId, a.xp);
  });

  showResultsScreen('fled', awards);
}

// ---- Results screen ----

function showResultsScreen(outcome, awards) {
  const screen     = document.getElementById('results-screen');
  const mapNameEl  = document.getElementById('results-map-name');
  const outcomeEl  = document.getElementById('results-outcome');
  const statsEl    = document.getElementById('results-stats');
  const awardsEl   = document.getElementById('results-awards');
  const nextBtn    = document.getElementById('results-next-btn');

  const map = CONFIG.maps[gameState.currentMapIndex];
  mapNameEl.textContent = map ? map.name : '';

  const outcomeLabels = {
    victory: 'Победа!',
    defeat:  'Поражение',
    fled:    'Злодей сбежал',
  };
  outcomeEl.textContent = outcomeLabels[outcome] || outcome;
  outcomeEl.className   = 'results-outcome ' + outcome;

  // Stats table
  statsEl.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'results-stats-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Герой</th>
    <th>Урон</th>
    <th>Лечение</th>
    <th>XP</th>
    <th>Ур.</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  gameState.characters.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.name}${c.knockedOut ? ' ✕' : ''}</td>
      <td>${gameState.battleStats.damageDealt[c.id] || 0}</td>
      <td>${gameState.battleStats.healingDone[c.id] || 0}</td>
      <td>${c.xp || 0}</td>
      <td>${c.level || 1}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  statsEl.appendChild(table);

  // Awards (staggered)
  awardsEl.innerHTML = '';
  awards.forEach((award, i) => {
    const char = gameState.characters.find(c => c.id === award.charId);
    const item = document.createElement('div');
    item.className = 'award-item' + (award.negative ? ' negative' : '');
    item.innerHTML = `
      <span>${award.label}</span>
      <span style="color:var(--text-muted);font-size:14px"> — ${char ? char.name : award.charId}</span>
      <span class="award-xp">${award.xp > 0 ? '+' : ''}${award.xp} XP</span>
    `;
    item.style.animationDelay = `${i * 600}ms`;
    awardsEl.appendChild(item);
  });

  // Enable next button after all animations
  const totalDelay = awards.length * 600 + 800;
  nextBtn.disabled = true;

  // Button label
  const isLastMap = gameState.currentMapIndex >= CONFIG.maps.length - 1;
  nextBtn.textContent = outcome === 'defeat'
    ? 'Новая игра'
    : isLastMap
      ? 'Финал'
      : 'Следующая карта';

  setTimeout(() => {
    nextBtn.disabled = false;
  }, Math.max(1200, totalDelay));

  // Remove old listener
  const newBtn = nextBtn.cloneNode(true);
  nextBtn.parentNode.replaceChild(newBtn, nextBtn);
  newBtn.disabled = true;
  setTimeout(() => { newBtn.disabled = false; }, Math.max(1200, totalDelay));

  newBtn.addEventListener('click', () => {
    screen.classList.add('hidden');
    proceedAfterResults(outcome);
  });

  screen.classList.remove('hidden');
}

function proceedAfterResults(outcome) {
  if (outcome === 'defeat') {
    // New game — reinitialise from scratch
    gameState.characters = [];
    initState(0);
    renderBoard();
    renderHUD();
    showInitiativeScreen();
    return;
  }

  const nextIndex = gameState.currentMapIndex + 1;

  if (nextIndex >= CONFIG.maps.length) {
    showFinalScreen();
    return;
  }

  resetForNextMap(nextIndex);
  renderBoard();
  renderHUD();
  showInitiativeScreen();
}

function showFinalScreen() {
  const screen = document.getElementById('final-screen');
  const stats  = document.getElementById('final-stats');

  stats.innerHTML = gameState.characters.map(c =>
    `<div style="margin:6px 0">${c.name} — Уровень ${c.level || 1}, ${c.xp || 0} XP</div>`
  ).join('');

  screen.classList.remove('hidden');
}
