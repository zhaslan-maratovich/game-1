function showInitiativeScreen() {
  const screen   = document.getElementById('initiative-screen');
  const list     = document.getElementById('initiative-list');
  const startBtn = document.getElementById('initiative-confirm-btn');

  gameState.phase = 'initiative';

  // Reset villain actions
  gameState.villain.actionsLeft = gameState.villain.actionsPerRound;

  // Reset sneak attack usage for new round
  gameState.characters.forEach(c => {
    gameState.battleStats.usedSneakAttack[c.id] = false;
  });

  list.innerHTML = '';

  const participants = [
    ...gameState.characters,
    gameState.villain,
  ];

  participants.forEach(p => {
    const isVillain = !!p.isVillain;
    const bonus     = isVillain ? 0 : (CONFIG.game.initiativeBonuses[p.id] || 0);
    const bonusText = bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : '+0';

    const row = document.createElement('div');
    row.className = 'initiative-row' + (isVillain ? ' villain-row' : '');
    row.dataset.id = p.id;

    const portrait = document.createElement('div');
    portrait.className = 'initiative-row-portrait';
    portrait.innerHTML = p.portraitSvg || '';

    const name = document.createElement('div');
    name.className = 'initiative-row-name';
    name.textContent = p.knockedOut ? `${p.name} (нокаут)` : p.name;

    const bonusEl = document.createElement('div');
    bonusEl.className = 'initiative-row-bonus';
    bonusEl.textContent = `d20 ${bonusText}`;

    const input = document.createElement('input');
    input.type        = 'number';
    input.min         = '1';
    input.max         = '20';
    input.className   = 'initiative-roll-input';
    input.placeholder = '—';
    input.dataset.id  = p.id;

    if (p.knockedOut) {
      input.disabled = true;
      input.value    = '0';
      input.classList.add('filled');
    }

    input.addEventListener('input', () => {
      const v = parseInt(input.value, 10);
      if (v >= 1 && v <= 20) {
        input.classList.add('filled');
      } else {
        input.classList.remove('filled');
      }
      checkAllFilled();
    });

    row.appendChild(portrait);
    row.appendChild(name);
    row.appendChild(bonusEl);
    row.appendChild(input);
    list.appendChild(row);
  });

  function checkAllFilled() {
    const inputs = list.querySelectorAll('.initiative-roll-input:not([disabled])');
    const allFilled = Array.from(inputs).every(inp => {
      const v = parseInt(inp.value, 10);
      return v >= 1 && v <= 20;
    });
    document.getElementById('initiative-confirm-btn').disabled = !allFilled;
  }

  // Remove old click listener by cloning, then wire up fresh one
  const newBtn = startBtn.cloneNode(true);
  newBtn.disabled = true;
  startBtn.parentNode.replaceChild(newBtn, startBtn);

  newBtn.addEventListener('click', () => {
    collectAndStartBattle(list, participants);
  });

  screen.classList.remove('hidden');
}

function collectAndStartBattle(list, participants) {
  const screen = document.getElementById('initiative-screen');

  const results = [];

  participants.forEach(p => {
    if (p.knockedOut) return;
    const isVillain = !!p.isVillain;
    const bonus     = isVillain ? 0 : (CONFIG.game.initiativeBonuses[p.id] || 0);
    const input     = list.querySelector(`.initiative-roll-input[data-id="${p.id}"]`);
    const roll      = parseInt(input ? input.value : '1', 10) || 1;
    results.push({ id: p.id, total: roll + bonus, roll, bonus });
  });

  // Sort descending; ties: higher roll wins; if still tied — heroes before villain
  results.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.roll  !== a.roll)  return b.roll  - a.roll;
    return 0;
  });

  gameState.initiativeOrder  = results.map(r => r.id);
  gameState.currentTurnIndex = 0;
  gameState.currentRound     = gameState.currentRound || 1;
  gameState.phase            = 'battle';

  addLog(`Инициатива: ${results.map(r => {
    const p = participants.find(p => p.id === r.id);
    return `${p ? p.name : r.id} (${r.total})`;
  }).join(', ')}`, 'log-system');

  screen.classList.add('hidden');

  uiRenderInitiativeBadges();
  renderHUD();
  startTurn();
}
