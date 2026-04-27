// ---- Token rendering ----

function renderBoard() {
  const board = document.getElementById('board');

  // Remove stale tokens from previous map
  const activeIds = new Set([
    ...gameState.characters.map(c => c.id),
    gameState.villain.id,
  ]);
  board.querySelectorAll('.token').forEach(t => {
    if (!activeIds.has(t.dataset.id)) t.remove();
  });

  // Update or create tokens for heroes
  gameState.characters.forEach(c => {
    let token = board.querySelector(`.token[data-id="${c.id}"]`);
    if (!token) {
      token = createToken(c, false);
      board.appendChild(token);
    }
    positionToken(token, c.x, c.y);
    updateTokenState(token, c);
  });

  // Villain token
  const v = gameState.villain;
  let vToken = board.querySelector(`.token[data-id="${v.id}"]`);
  if (!vToken) {
    vToken = createToken(v, true);
    board.appendChild(vToken);
  }
  positionToken(vToken, v.x, v.y);
  updateTokenState(vToken, v);
}

function createToken(char, isVillain) {
  const token = document.createElement('div');
  token.className = 'token' + (isVillain ? ' villain-token' : '');
  token.dataset.id = char.id;

  const svgWrapper = document.createElement('div');
  svgWrapper.style.cssText = 'width:100%;height:100%;border-radius:50%;overflow:hidden;';
  svgWrapper.innerHTML = char.portraitSvg || '';
  token.appendChild(svgWrapper);

  const label = document.createElement('div');
  label.className = 'token-label';
  label.textContent = char.name;
  token.appendChild(label);

  enableDragAndDrop(token, char);

  token.addEventListener('contextmenu', e => {
    e.preventDefault();
    showCharacterCard(char.id);
  });

  return token;
}

function positionToken(token, x, y) {
  token.style.left = x + 'px';
  token.style.top  = y + 'px';
}

function updateTokenState(token, char) {
  const isActive = gameState.initiativeOrder[gameState.currentTurnIndex] === char.id
    && gameState.phase === 'battle';

  token.classList.toggle('active-turn', isActive);
  token.classList.toggle('knocked-out', !!char.knockedOut);

  // Init badge
  let badge = token.querySelector('.token-init-badge');
  const initPos = gameState.initiativeOrder.indexOf(char.id);
  if (initPos >= 0 && gameState.phase === 'battle') {
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'token-init-badge';
      token.appendChild(badge);
    }
    badge.textContent = initPos + 1;
  } else if (badge) {
    badge.remove();
  }
}

function uiRenderInitiativeBadges() {
  const board = document.getElementById('board');
  board.querySelectorAll('.token').forEach(token => {
    const char = getCharById(token.dataset.id);
    if (char) updateTokenState(token, char);
  });
}

// ---- Drag and drop ----

function enableDragAndDrop(token, char) {
  let dragging = false;
  let startX, startY, startLeft, startTop;

  token.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX   = e.clientX;
    startY   = e.clientY;
    startLeft = char.x;
    startTop  = char.y;
    token.classList.add('dragging');
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const board = document.getElementById('board');
    const rect  = board.getBoundingClientRect();
    const newX  = Math.max(32, Math.min(rect.width  - 32, startLeft + dx));
    const newY  = Math.max(32, Math.min(rect.height - 32, startTop  + dy));
    char.x = newX;
    char.y = newY;
    positionToken(token, newX, newY);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    token.classList.remove('dragging');
  });
}

// ---- HUD ----

function renderHUD() {
  renderHeroesHp();
  renderVillainHp();
  updateTurnCounter();
  updateMapName();
}

function renderHeroesHp() {
  const list = document.getElementById('heroes-hp-list');
  if (!list) return;
  list.innerHTML = '';
  gameState.characters.forEach(c => {
    list.appendChild(buildHpEntry(c, false));
  });
}

function renderVillainHp() {
  const block = document.getElementById('villain-hp-block');
  if (!block) return;
  block.innerHTML = '';
  block.appendChild(buildHpEntry(gameState.villain, true));
}

function buildHpEntry(char, isVillain) {
  const pct  = char.maxHp > 0 ? Math.max(0, char.hp / char.maxHp) * 100 : 0;
  const cls  = pct > 50 ? '' : pct > 25 ? 'hp-medium' : 'hp-low';

  const entry = document.createElement('div');
  entry.className = 'hp-entry';
  entry.dataset.hpId = char.id;

  const row = document.createElement('div');
  row.className = 'hp-name-row';

  const nameEl = document.createElement('div');
  nameEl.className = 'hp-char-name' + (char.knockedOut ? ' knocked-out-name' : '');
  nameEl.textContent = isVillain ? char.name : (char.knockedOut ? `${char.name} ✕` : char.name);

  const valEl = document.createElement('div');
  valEl.className = 'hp-value';
  valEl.textContent = `${Math.max(0, char.hp)}/${char.maxHp}`;

  row.appendChild(nameEl);
  row.appendChild(valEl);

  const bar = document.createElement('div');
  bar.className = 'hp-bar';

  const fill = document.createElement('div');
  fill.className = `hp-bar-fill${cls ? ' ' + cls : ''}`;
  fill.style.width = pct + '%';

  bar.appendChild(fill);
  entry.appendChild(row);
  entry.appendChild(bar);

  return entry;
}

function uiUpdateHpBar(charId) {
  const char = getCharById(charId);
  if (!char) return;

  // Update in heroes list or villain block
  const entry = document.querySelector(`[data-hp-id="${charId}"]`);
  if (!entry) {
    renderHUD();
    return;
  }

  const pct  = char.maxHp > 0 ? Math.max(0, char.hp / char.maxHp) * 100 : 0;
  const cls  = pct > 50 ? '' : pct > 25 ? 'hp-medium' : 'hp-low';

  const fill = entry.querySelector('.hp-bar-fill');
  if (fill) {
    fill.style.width = pct + '%';
    fill.className = `hp-bar-fill${cls ? ' ' + cls : ''}`;
  }

  const valEl = entry.querySelector('.hp-value');
  if (valEl) valEl.textContent = `${Math.max(0, char.hp)}/${char.maxHp}`;

  const nameEl = entry.querySelector('.hp-char-name');
  if (nameEl) {
    if (char.knockedOut) {
      nameEl.classList.add('knocked-out-name');
      nameEl.textContent = `${char.name} ✕`;
    } else {
      nameEl.classList.remove('knocked-out-name');
      nameEl.textContent = char.name;
    }
  }
}

function updateTurnCounter() {
  const el = document.getElementById('turn-counter');
  if (el) {
    const total = gameState.currentTurnIndex + 1 + (gameState.currentRound - 1) * gameState.initiativeOrder.length;
    el.textContent = `Ход ${total} · Раунд ${gameState.currentRound}`;
  }
}

function updateMapName() {
  const el = document.getElementById('map-name');
  if (el && CONFIG.maps[gameState.currentMapIndex]) {
    el.textContent = CONFIG.maps[gameState.currentMapIndex].name;
  }
}

// ---- Character card ----

let _pendingBoardListener = null;

function cancelPendingTargetSelection() {
  if (_pendingBoardListener) {
    const board = document.getElementById('board');
    if (board) board.removeEventListener('click', _pendingBoardListener);
    _pendingBoardListener = null;
    document.querySelectorAll('.token.selected').forEach(t => t.classList.remove('selected'));
  }
}

function showCharacterCard(charId) {
  const char = getCharById(charId);
  if (!char) return;

  const card = document.getElementById('character-card');
  card.innerHTML = '';
  card.classList.remove('hidden', 'fade-out');

  const isVillain = !!char.isVillain;
  if (isVillain) card.classList.add('villain-card');
  else card.classList.remove('villain-card');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'card-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    const isActiveTurn = gameState.initiativeOrder[gameState.currentTurnIndex] === charId
      && gameState.phase === 'battle';
    if (!isActiveTurn) {
      hideCharacterCard();
    }
  });
  card.appendChild(closeBtn);

  // Portrait
  const portrait = document.createElement('div');
  portrait.className = 'card-portrait';
  portrait.innerHTML = char.portraitSvg || '';
  card.appendChild(portrait);

  // Name row
  const nameRow = document.createElement('div');
  nameRow.className = 'card-name-row';
  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = char.name;
  const lvlEl = document.createElement('div');
  lvlEl.className = 'card-level';
  lvlEl.textContent = isVillain ? `${char.actionsLeft ?? char.actionsPerRound}/${char.actionsPerRound} действ.` : `Ур.${char.level || 1}`;
  nameRow.appendChild(nameEl);
  nameRow.appendChild(lvlEl);
  card.appendChild(nameRow);

  // HP
  const hpEl = document.createElement('div');
  hpEl.className = 'card-hp';
  const pct = char.maxHp > 0 ? char.hp / char.maxHp : 0;
  const hpCls = pct > 0.5 ? '' : pct > 0.25 ? 'hp-medium' : 'hp-low';
  hpEl.innerHTML = `HP: <span class="card-hp-value${hpCls ? ' ' + hpCls : ''}">${char.hp}</span>/${char.maxHp}`;
  card.appendChild(hpEl);

  const abilitiesEl = document.createElement('div');
  abilitiesEl.className = 'card-abilities';

  const isActiveTurn = gameState.initiativeOrder[gameState.currentTurnIndex] === charId
    && gameState.phase === 'battle';

  if (isVillain && isActiveTurn) {
    // Villain's active turn — interactive ability buttons for Player 2
    char.abilities.forEach(ability => {
      const btn = document.createElement('button');
      btn.className = 'ability-btn';
      const cost = ability.actionCost || 1;
      if (cost > (char.actionsLeft ?? 0)) btn.disabled = true;
      const hintText = (ability.formula ? ability.formula : (ability.description || ''))
        + ` (${cost} д.)`;
      btn.innerHTML = `<span class="ability-btn-name">${ability.name}</span>`
        + `<span class="ability-dice-hint">${hintText}</span>`;
      if (!btn.disabled) {
        btn.addEventListener('click', () => handleAbilityClick(char.id, ability));
      }
      abilitiesEl.appendChild(btn);
    });

    const endBtn = document.createElement('button');
    endBtn.className = 'ability-btn';
    endBtn.style.borderColor = 'rgba(100,100,100,0.3)';
    endBtn.innerHTML = '<span class="ability-btn-name">Завершить ход</span>';
    endBtn.addEventListener('click', () => {
      hideCharacterCard();
      char.actionsLeft = 0;
      setTimeout(() => advanceTurn(), 300);
    });
    abilitiesEl.appendChild(endBtn);

  } else if (isVillain) {
    // Villain info view (not their turn)
    char.abilities.forEach(ability => {
      const row = document.createElement('div');
      row.className = 'ability-btn';
      row.style.cursor = 'default';
      row.style.opacity = '0.6';
      row.innerHTML = `<span class="ability-btn-name">${ability.name}</span>`
        + (ability.formula ? `<span class="ability-dice-hint">${ability.formula}</span>` : '');
      abilitiesEl.appendChild(row);
    });

  } else if (isActiveTurn) {
    // Hero active turn — clickable abilities
    char.abilities.forEach(ability => {
      const btn = document.createElement('button');
      btn.className = 'ability-btn';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ability-btn-name';
      nameSpan.textContent = ability.name;

      const hint = document.createElement('span');
      hint.className = 'ability-dice-hint';

      if (ability.type === 'heal' || ability.type === 'heal_all') {
        hint.textContent = `+${ability.healAmount} HP`;
      } else if (ability.formula) {
        hint.textContent = ability.formula;
      } else if (ability.buffStat) {
        hint.textContent = `${ability.buffStat} ${ability.buffAmount > 0 ? '+' : ''}${ability.buffAmount}`;
      } else {
        hint.textContent = ability.description || '';
      }

      btn.appendChild(nameSpan);
      btn.appendChild(hint);

      if (ability.oncePerRound && gameState.battleStats.usedSneakAttack[char.id]) {
        btn.disabled = true;
        hint.textContent += ' (использовано)';
      }

      btn.addEventListener('click', () => handleAbilityClick(char.id, ability));
      abilitiesEl.appendChild(btn);
    });

    const skipBtn = document.createElement('button');
    skipBtn.className = 'ability-btn';
    skipBtn.style.borderColor = 'rgba(100,100,100,0.3)';
    skipBtn.innerHTML = '<span class="ability-btn-name">Пропустить ход</span>';
    skipBtn.addEventListener('click', () => skipTurn(char.id));
    abilitiesEl.appendChild(skipBtn);

  } else {
    // Info view — show abilities as static list
    char.abilities.forEach(ability => {
      const row = document.createElement('div');
      row.className = 'ability-btn';
      row.style.cursor = 'default';
      row.style.opacity = '0.6';
      row.innerHTML = `<span class="ability-btn-name">${ability.name}</span>`
        + (ability.formula ? `<span class="ability-dice-hint">${ability.formula}</span>` : '');
      abilitiesEl.appendChild(row);
    });
  }

  card.appendChild(abilitiesEl);
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = '';

  // Position near the token
  const token = document.querySelector(`#board .token[data-id="${charId}"]`);
  if (token) {
    const rect = token.getBoundingClientRect();
    const cardW = 244;
    const cardH = 420;
    let left = rect.right + 12;
    let top  = rect.top - 20;
    if (left + cardW > window.innerWidth)  left = rect.left - cardW - 12;
    if (top + cardH > window.innerHeight)  top  = window.innerHeight - cardH - 10;
    top  = Math.max(8, top);
    left = Math.max(8, left);
    card.style.left = left + 'px';
    card.style.top  = top  + 'px';
  } else {
    card.style.left = '20px';
    card.style.top  = '80px';
  }
}

function uiRenderVillainCard() {
  const currentId = gameState.initiativeOrder[gameState.currentTurnIndex];
  if (currentId === gameState.villain.id) {
    uiUpdateHpBar(gameState.villain.id);
  }
}

function hideCharacterCard() {
  cancelPendingTargetSelection();
  const card = document.getElementById('character-card');
  if (!card || card.classList.contains('hidden')) return;
  card.classList.add('fade-out');
  setTimeout(() => {
    card.classList.add('hidden');
    card.classList.remove('fade-out');
    card.innerHTML = '';
  }, 300);
}

// ---- Ability click handler ----

function handleAbilityClick(charId, ability) {
  const char = getCharById(charId);
  if (!char) return;

  if (ability.oncePerRound) {
    gameState.battleStats.usedSneakAttack[charId] = true;
  }

  const targetType = ability.targetType;
  const isVillain = !!char.isVillain;

  if (isVillain) {
    // Villain: targeting heroes
    if (targetType === 'hero') {
      showVillainTargetSelection(charId, ability);
    } else {
      // all_heroes, self, self_buff, self_heal — no target pick needed
      performVillainAction(ability.id, null);
    }
    return;
  }

  // Hero targeting
  if (targetType === 'villain') {
    handleAbilityOnTarget(charId, gameState.villain.id, ability);
    return;
  }

  if (targetType === 'all_allies') {
    performHealAll(charId, ability);
    return;
  }

  if (targetType === 'self') {
    handleAbilityOnTarget(charId, charId, ability);
    return;
  }

  if (targetType === 'ally' || targetType === 'hero') {
    showTargetSelection(charId, ability);
    return;
  }

  handleAbilityOnTarget(charId, charId, ability);
}

function showVillainTargetSelection(sourceId, ability) {
  const card = document.getElementById('character-card');
  const existing = card.querySelector('.target-prompt');
  if (existing) existing.remove();

  const prompt = document.createElement('div');
  prompt.className = 'target-prompt';
  prompt.textContent = 'Выберите цель — кликните токен героя';
  card.appendChild(prompt);

  const board = document.getElementById('board');
  const eligible = gameState.characters.filter(c => !c.knockedOut);

  eligible.forEach(c => {
    const token = board.querySelector(`.token[data-id="${c.id}"]`);
    if (token) token.classList.add('selected');
  });

  function onTokenClick(e) {
    const token = e.target.closest('.token');
    if (!token) return;
    const targetId = token.dataset.id;
    if (!eligible.some(c => c.id === targetId)) return;

    eligible.forEach(c => {
      const t = board.querySelector(`.token[data-id="${c.id}"]`);
      if (t) t.classList.remove('selected');
    });
    board.removeEventListener('click', onTokenClick);
    _pendingBoardListener = null;
    prompt.remove();

    performVillainAction(ability.id, targetId);
  }

  _pendingBoardListener = onTokenClick;
  board.addEventListener('click', onTokenClick);
}

function handleAbilityOnTarget(sourceId, targetId, ability) {
  const type = ability.type;

  if (type === 'attack' || type === 'attack_debuff') {
    performAttack(sourceId, targetId, ability);
  } else if (type === 'attack_no_miss') {
    performAttackNoMiss(sourceId, targetId, ability);
  } else if (type === 'heal') {
    performHeal(sourceId, targetId, ability);
  } else if (type === 'heal_all') {
    performHealAll(sourceId, ability);
  } else if (type === 'buff' || type === 'self_buff') {
    performBuff(sourceId, targetId, ability);
  } else if (type === 'debuff' || type === 'debuff_bonus' || type === 'attack_debuff') {
    performDebuff(sourceId, targetId, ability);
  } else {
    // Fallback
    endAction(sourceId);
  }
}

function showTargetSelection(sourceId, ability) {
  const card = document.getElementById('character-card');
  // Add prompt
  const existing = card.querySelector('.target-prompt');
  if (existing) existing.remove();

  const prompt = document.createElement('div');
  prompt.className = 'target-prompt';
  prompt.textContent = 'Выберите цель — кликните токен';
  card.appendChild(prompt);

  // Highlight all eligible tokens
  const board = document.getElementById('board');
  const eligible = gameState.characters.filter(c => !c.knockedOut && c.id !== sourceId);

  eligible.forEach(c => {
    const token = board.querySelector(`.token[data-id="${c.id}"]`);
    if (token) token.classList.add('selected');
  });

  function onTokenClick(e) {
    const token = e.target.closest('.token');
    if (!token) return;
    const targetId = token.dataset.id;
    const isEligible = eligible.some(c => c.id === targetId);
    if (!isEligible) return;

    // Clean up
    eligible.forEach(c => {
      const t = board.querySelector(`.token[data-id="${c.id}"]`);
      if (t) t.classList.remove('selected');
    });
    board.removeEventListener('click', onTokenClick);
    _pendingBoardListener = null;
    prompt.remove();

    handleAbilityOnTarget(sourceId, targetId, ability);
  }

  _pendingBoardListener = onTokenClick;
  board.addEventListener('click', onTokenClick);
}

// ---- Damage float ----

function uiShowDamageFloat(charId, text, isHeal, isMiss) {
  const board = document.getElementById('board');
  const char  = getCharById(charId);
  if (!char || !board) return;

  const float = document.createElement('div');
  float.className = 'damage-float ' + (isMiss ? 'miss' : isHeal ? 'heal' : 'damage');
  float.textContent = text;
  float.style.left = char.x + 'px';
  float.style.top  = (char.y - 20) + 'px';
  board.appendChild(float);

  float.addEventListener('animationend', () => float.remove());
}

// ---- Token highlight ----

function uiHighlightToken(charId, type) {
  const board = document.getElementById('board');
  const token = board ? board.querySelector(`.token[data-id="${charId}"]`) : null;
  if (!token) return;

  const cls = type === 'red' ? 'flash-red' : 'flash-green';
  token.classList.remove('flash-red', 'flash-green');
  token.offsetHeight; // reflow
  token.classList.add(cls);
  setTimeout(() => token.classList.remove(cls), 600);
}

function uiReviveToken(charId) {
  const board = document.getElementById('board');
  const token = board ? board.querySelector(`.token[data-id="${charId}"]`) : null;
  if (!token) return;
  token.classList.remove('knocked-out');
  token.classList.add('flash-green');
  setTimeout(() => token.classList.remove('flash-green'), 600);
}

// ---- Log ----

function addLog(text, cssClass) {
  const logEl = document.getElementById('log');
  if (!logEl) return;

  const item = document.createElement('div');
  item.className = 'action-log-item' + (cssClass ? ' ' + cssClass : '');
  item.textContent = text;

  logEl.prepend(item);

  // Keep last 30 entries
  const items = logEl.querySelectorAll('.action-log-item');
  if (items.length > 30) {
    items[items.length - 1].remove();
  }

  gameState.log.push(text);
}

// ---- Turn management ----

function startTurn() {
  if (gameState.phase === 'battle_end' || gameState.phase === 'map_end') return;
  if (gameState.initiativeOrder.length === 0) return;

  const currentId = gameState.initiativeOrder[gameState.currentTurnIndex];
  const char      = getCharById(currentId);

  if (!char) {
    advanceTurn();
    return;
  }

  // Tick buffs/debuffs for this character
  tickBuffsForChar(char.id);

  // Update board active token
  renderBoard();
  updateTurnCounter();

  if (char.knockedOut) {
    addLog(`${char.name} в нокауте — пропускает ход.`, 'log-system');
    setTimeout(() => advanceTurn(), 400);
    return;
  }

  gameState.phase = 'battle';

  if (char.isVillain) {
    char.actionsLeft = char.actionsPerRound;
    addLog(`Ход ${char.name}.`, 'log-system');

    // Flee check
    const map = CONFIG.maps[gameState.currentMapIndex];
    const hpPct = char.hp / char.maxHp;
    if (char.canFlee && gameState.currentRound >= CONFIG.game.roundsPerBattle && hpPct <= 0.3) {
      gameState.phase = 'battle_end';
      setTimeout(() => villainFled(), 500);
      return;
    }

    showCharacterCard(char.id);
  } else {
    addLog(`Ход ${char.name}.`, 'log-system');
    showCharacterCard(char.id);
  }
}


function advanceTurn() {
  if (gameState.phase === 'battle_end' || gameState.phase === 'map_end') return;

  gameState.currentTurnIndex++;

  if (gameState.currentTurnIndex >= gameState.initiativeOrder.length) {
    // End of round
    endRound();
    return;
  }

  startTurn();
}

function endRound() {
  gameState.currentTurnIndex = 0;

  if (gameState.currentRound >= CONFIG.game.roundsPerBattle) {
    addLog(`Раунд ${gameState.currentRound} завершён. Бой окончен.`, 'log-system');
    const map = CONFIG.maps[gameState.currentMapIndex];
    if (map && !map.boss.canFlee) {
      gameState.phase = 'battle_end';
      setTimeout(() => battleDefeat(), 600);
    } else {
      gameState.phase = 'battle_end';
      setTimeout(() => villainFled(), 600);
    }
    return;
  }

  gameState.currentRound++;

  addLog(`── Раунд ${gameState.currentRound} из ${CONFIG.game.roundsPerBattle} ──`, 'log-system');

  // Award survive-round XP
  gameState.characters.forEach(c => {
    if (!c.knockedOut) {
      applyXP(c.id, CONFIG.game.xpRewards.surviveRound);
    }
  });

  // Reset villain actions for new round
  gameState.villain.actionsLeft = gameState.villain.actionsPerRound;

  // Reset sneak attack
  gameState.characters.forEach(c => {
    gameState.battleStats.usedSneakAttack[c.id] = false;
  });

  startTurn();
}
