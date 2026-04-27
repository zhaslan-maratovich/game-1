# ENDGAME.md
> Читать при работе с `js/endgame.js`

---

## Условия окончания боя

После каждого действия `combat.js` вызывает `checkBattleEnd()`:

```js
function checkBattleEnd() {
  if (gameState.villain.hp <= 0)
    return endgame.battleVictory();

  const allKnockedOut = gameState.characters.every(c => c.knockedOut);
  if (allKnockedOut)
    return endgame.battleDefeat();
}

// Отдельно — когда злодей выбирает "Побег":
endgame.villainFled();

// Отдельно — когда все ходы в последнем раунде исчерпаны и злодей жив:
// (проверяется в initiative.js после завершения initiativeOrder)
if (currentRound > CONFIG.game.roundsPerBattle && villain.hp > 0)
  endgame.villainFled(); // или battleDefeat() для карты 4
```

| Условие                             | Функция              | Следующий шаг             |
|-------------------------------------|----------------------|---------------------------|
| HP злодея = 0                       | `battleVictory()`    | Экран результатов → карта+ |
| Все герои нокаутированы             | `battleDefeat()`     | Game Over экран           |
| Злодей использовал Побег            | `villainFled()`      | Экран результатов → карта+ |
| Раунды кончились, злодей жив        | `villainFled()`      | (карты 1–3)               |
| Карта 4: раунды кончились           | `battleDefeat()`     | Game Over экран           |

Сбежавший злодей: `gameState.escapedVillains.push(villain.id)` — больше не появляется.

---

## Начисление XP после боя

```js
function calculateBattleXP() {
  // 1. XP за убийство (если победа)
  if (outcome === 'victory')
    livingHeroes.forEach(h => h.xp += CONFIG.game.xp.killVillain);

  // 2. Бонусные XP за награды
  const awards = calculateAwards(); // см. ниже
  awards.forEach(({ heroId, xp }) => {
    const hero = getHero(heroId);
    if (hero) hero.xp += xp;
  });

  // 3. Проверка level up для каждого героя
  heroes.forEach(hero => checkLevelUp(hero));
}
```

---

## Система наград

```js
function calculateAwards() {
  const stats = gameState.battleStats;
  const results = [];

  // 💥 Берсерк — наибольший одиночный удар
  const berserker = maxBy(stats.maxSingleHit);
  if (berserker) results.push({ heroId: berserker, award: 'berserker', xp: 150 });

  // 💚 Ангел-хранитель — наибольший суммарный хил
  const guardian = maxBy(stats.healingDone);
  if (guardian) results.push({ heroId: guardian, award: 'guardian', xp: 120 });

  // 🏔️ Несгибаемый — получил больше всех урона и выжил
  const tankAlive = maxByAlive(stats.damageTaken);
  if (tankAlive) results.push({ heroId: tankAlive, award: 'unbreakable', xp: 100 });

  // 🤝 Душа компании — больше всех поддержки на союзников
  const support = maxBy(stats.supportActions);
  if (support) results.push({ heroId: support, award: 'teamPlayer', xp: 100 });

  // 🎯 Меткость — ни одного промаха (может несколько)
  heroes.forEach(h => {
    if (stats.missCount[h.id] === 0 && stats.hitCount[h.id] > 0)
      results.push({ heroId: h.id, award: 'precision', xp: 80 });
  });

  // 😴 Наблюдатель — 2+ пропущенных хода подряд (штраф, все виновные)
  heroes.forEach(h => {
    if (stats.idleStreak[h.id] >= 2)
      results.push({ heroId: h.id, award: 'idle', xp: -50 });
  });

  return results;
}
```

---

## Level Up

```js
function checkLevelUp(hero) {
  const thresholds = CONFIG.game.xpToLevel; // [0, 200, 500, 900, 1400]
  while (hero.level < 5 && hero.xp >= thresholds[hero.level]) {
    hero.level++;
    hero.maxHp += CONFIG.game.hpPerLevel;
    hero.hp    += CONFIG.game.hpPerLevel;
    ui.showLevelUpAnimation(hero); // анимация над токеном
  }
}
```

---

## Экран результатов

Показывается после каждого боя. `endgame.js` создаёт DOM-элемент поверх всего.

```
┌──────────────────────────────────────┐
│  КАРТА 1 — ЛЕСНАЯ ЗАСАДА             │ ← font-title, красное свечение
│  [ПОБЕДА / ЗЛОДЕЙ СБЕЖАЛ / ПОРАЖЕНИЕ]│
├──────────────────────────────────────┤
│  Статистика:                         │
│  Имя    Урон   Хил   XP итого        │
│  ...                                 │
├──────────────────────────────────────┤
│  НАГРАДЫ (анимируются по одной):     │
│  💥 Берсерк → Рейнджер   +150 XP    │ ← появляются с задержкой 600ms
│  💚 Ангел   → Клирик     +120 XP    │
│  ...                                 │
├──────────────────────────────────────┤
│  ⬆ LEVEL UP! Паладин → Уровень 2    │ ← если есть, последним
├──────────────────────────────────────┤
│           [Следующая карта]          │ ← активна только после анимаций
└──────────────────────────────────────┘
```

Стиль экрана: фон `var(--bg-modal)`, красная рамка, красные частицы по углам при победе.

---

## Переходы между картами

```js
function goToNextMap() {
  gameState.currentMapIndex++;

  if (gameState.currentMapIndex >= CONFIG.maps.length) {
    // Кампания завершена
    showFinalScreen();
    return;
  }

  // Сбросить состояние боя, сохранить уровни/XP героев
  const savedHeroes = gameState.characters.map(h => ({
    id: h.id, level: h.level, xp: h.xp,
    hp: h.maxHp, maxHp: h.maxHp,   // HP полностью восстанавливается
    knockedOut: false,
  }));

  state.resetBattle();
  gameState.characters = savedHeroes;
  gameState.villain = initVillain(CONFIG.maps[gameState.currentMapIndex].villain);

  // Перейти к экрану инициативы новой карты
  initiative.showInitiativeScreen();
}
```

---

## Definition of Done (endgame.js)

- [ ] `battleVictory()`, `battleDefeat()`, `villainFled()` реализованы
- [ ] Все 6 наград вычисляются корректно
- [ ] XP наград добавляется после battleXP
- [ ] Level up проверяется после каждого начисления XP
- [ ] Награды появляются на экране с задержкой 600ms каждая
- [ ] Кнопка «Следующая карта» активируется только после всех анимаций
- [ ] Уровни и XP героев сохраняются при переходе
- [ ] HP восстанавливается до maxHp при переходе
- [ ] После карты 4 — финальный экран
- [ ] Сбежавший злодей записывается в `escapedVillains`
