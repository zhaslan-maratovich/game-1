document.addEventListener('DOMContentLoaded', () => {
  // Read starting map from URL hash (#map-1, #map-2, etc.)
  const hashMatch = window.location.hash.match(/#map-(\d+)/);
  const startMap = hashMatch
    ? Math.min(Math.max(parseInt(hashMatch[1], 10) - 1, 0), CONFIG.maps.length - 1)
    : 0;

  initState(startMap);
  renderBoard();
  renderHUD();
  updateMapNavActive(startMap);
  showInitiativeScreen();

  // Map nav buttons
  document.querySelectorAll('.map-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mapIdx = parseInt(btn.dataset.map, 10);
      window.location.hash = '#map-' + (mapIdx + 1);
      switchToMap(mapIdx);
    });
  });

  window.addEventListener('hashchange', () => {
    const m = window.location.hash.match(/#map-(\d+)/);
    if (m) {
      const idx = Math.min(Math.max(parseInt(m[1], 10) - 1, 0), CONFIG.maps.length - 1);
      if (idx !== gameState.currentMapIndex) switchToMap(idx);
    }
  });

  // Debug panel toggle
  document.getElementById('debug-toggle').addEventListener('click', () => {
    document.getElementById('debug-content').classList.toggle('hidden');
  });

  // Debug: reset game
  document.getElementById('debug-reset').addEventListener('click', () => {
    document.getElementById('debug-content').classList.add('hidden');
    const mapIdx = gameState.currentMapIndex;
    gameState.characters = [];
    initState(mapIdx);
    renderBoard();
    renderHUD();
    showInitiativeScreen();
  });

  // Debug: load background image
  document.getElementById('debug-bg').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const board = document.getElementById('board');
    board.style.backgroundImage =
      `linear-gradient(rgba(255,42,42,0.06) 1px, transparent 1px),`
      + `linear-gradient(90deg, rgba(255,42,42,0.06) 1px, transparent 1px),`
      + `url(${url})`;
    board.style.backgroundSize = '64px 64px, 64px 64px, cover';
    board.style.backgroundPosition = 'center';
  });
});

function switchToMap(mapIdx) {
  gameState.characters = [];
  initState(mapIdx);
  renderBoard();
  renderHUD();
  updateMapNavActive(mapIdx);
  showInitiativeScreen();
}

function updateMapNavActive(mapIdx) {
  document.querySelectorAll('.map-nav-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.map, 10) === mapIdx);
  });
}
