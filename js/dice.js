function requestDiceRoll({ label, formula, bonus, diceType, min, max, hint, onConfirm }) {
  const overlay   = document.getElementById('modal-overlay');
  const modal     = document.getElementById('dice-modal');
  const iconEl    = document.getElementById('dice-modal-icon');
  const labelEl   = document.getElementById('dice-modal-label');
  const formulaEl = document.getElementById('dice-modal-formula');
  const hintEl    = document.getElementById('dice-modal-hint');
  const input     = document.getElementById('dice-input');
  const btn       = document.getElementById('dice-confirm-btn');

  const prevPhase = gameState.phase;
  gameState.phase = 'dice_input';

  // Populate
  iconEl.innerHTML   = CONFIG.diceIcons[diceType] || CONFIG.diceIcons['d20'];
  labelEl.textContent  = label || 'Бросьте кубик';
  formulaEl.textContent = formula || '';
  hintEl.textContent  = hint || (min != null ? `Допустимо: ${min}–${max}` : '');

  input.value = '';
  input.min   = min != null ? min : 1;
  input.max   = max != null ? max : 999;
  btn.disabled = true;

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  hideCharacterCard();

  setTimeout(() => input.focus(), 50);

  function validate() {
    const v = parseInt(input.value, 10);
    const lo = min != null ? min : 1;
    const hi = max != null ? max : 999;
    btn.disabled = isNaN(v) || v < lo || v > hi;
  }

  function confirm() {
    const v = parseInt(input.value, 10);
    if (isNaN(v)) return;
    cleanup();
    gameState.phase = prevPhase === 'dice_input' ? 'battle' : prevPhase;
    onConfirm(v);
  }

  function onKey(e) {
    if (e.key === 'Enter') confirm();
  }

  function cleanup() {
    input.removeEventListener('input', validate);
    btn.removeEventListener('click', confirm);
    document.removeEventListener('keydown', onKey);
    overlay.classList.add('hidden');
    modal.classList.add('hidden');
  }

  input.addEventListener('input', validate);
  btn.addEventListener('click', confirm);
  document.addEventListener('keydown', onKey);
}
