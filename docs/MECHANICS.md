# MECHANICS.md
> Читать при работе с `js/combat.js` и `js/dice.js`

---

## Формы ввода кубиков (dice.js)

`dice.js` экспортирует одну функцию: `requestDiceRoll({ label, formula, bonus, min, max, onConfirm })`.

Она показывает модальное окно и вызывает `onConfirm(value)` когда игрок ввёл число.

**Игра никогда не вызывает Math.random() для боевых бросков.**

### Когда показывается форма

| Момент                        | Кубик  | Формула в окне                              |
|-------------------------------|--------|---------------------------------------------|
| Инициатива                    | d20    | `d20 + {bonus} (бонус {name})`              |
| Атака героя (проверка попадания) | d20 | `d20 + {attackBonus} vs AC {target.ac}`     |
| Урон атаки                    | по способности | `{dice} + {bonus} урона`          |
| Урон злодея                   | по способности | `{dice} + {bonus} урона`          |
| Бафф-кубик (Вдохновение, Благословение) | d6/d4 | `+{dice} к следующей атаке`  |
| Охотничья метка (бонус урона) | d6     | `+1d6 дополнительного урона`                |

**Исключение:** Священный огонь Клирика (`ignoreAC: true`) — форма d20 для попадания не показывается, атака всегда попадает. Форма урона показывается.

---

## Боевая механика (combat.js)

### Проверка попадания
```
1. dice.js запрашивает d20
2. игрок вводит результат броска
3. итог = d20_result + character.attackBonus
         + CONFIG.game.attackBonusPerLevel * (level - 1)
         + activeBuffs (бонусы к атаке)
         - activeDebuffs (штрафы к атаке)
4. попадание = итог >= target.ac
5. промах → записать в battleStats.missCount
```

### Расчёт урона
```
1. dice.js запрашивает бросок кубика урона
2. игрок вводит результат
3. урон = dice_result
         + ability.bonus
         + CONFIG.game.damagePerLevel * (level - 1)
         + bonusDice (Охотничья метка)
         + активные бонусы баффов
4. если цель имеет damageReduction → вычесть
5. если цель имеет halfDamage → урон ÷ 2 (округлить вниз)
6. target.hp -= итоговый_урон (не ниже 0)
```

### Лечение
```
1. Никакого броска кубика — amount фиксированный
2. target.hp += ability.amount (не выше maxHp)
3. если target.hp было 0 (knocked out) → убрать класс .knocked-out
4. записать в battleStats.healingDone
```

### Баффы и дебаффы
- Добавляются в `gameState.activeBuffs` / `activeDebuffs`
- Структура: `{ targetId, type, value, turnsLeft }`
- В конце каждого хода участника — `turnsLeft--` для его баффов
- При `turnsLeft === 0` — удалить из массива

### Нокаут героя
```
if (hero.hp <= 0) {
  hero.hp = 0;
  hero.knockedOut = true;
  // ui.js добавляет .knocked-out на токен
  // герой автоматически пропускается в initiativeOrder
}
// Хил на нокаутированного:
hero.hp = healAmount;
hero.knockedOut = false;
```

### Проверка конца боя после каждого действия
```
if (villain.hp <= 0)          → endgame.js: battleVictory()
if (all heroes knockedOut)    → endgame.js: battleDefeat()
if (villain uses flee)        → endgame.js: villainFled()
```

---

## Уровни и XP

### Таблица уровней
| Уровень | XP порог | HP (Паладин→Плут)     | +Урон | +Атака |
|---------|----------|-----------------------|-------|--------|
| 1       | 0        | 30 / 22 / 26 / 24 / 20 | —    | —      |
| 2       | 200      | 35 / 27 / 31 / 29 / 25 | +1   | +1     |
| 3       | 500      | 40 / 32 / 36 / 34 / 30 | +2   | +2     |
| 4       | 900      | 45 / 37 / 41 / 39 / 35 | +3   | +3     |
| 5       | 1400     | 50 / 42 / 46 / 44 / 40 | +4   | +4     |

### Начисление XP
```
После каждого действия:
  xp += damageDealt * CONFIG.game.xp.damagePerPoint
  xp += healingDone * CONFIG.game.xp.healPerPoint

После каждого раунда (если герой жив):
  xp += CONFIG.game.xp.surviveRound

После победы (всем живым):
  xp += CONFIG.game.xp.killVillain

Затем endgame.js начисляет бонусные XP за награды
```

### Level Up
```
if (hero.xp >= CONFIG.game.xpToLevel[hero.level]) {
  hero.level++
  hero.maxHp += CONFIG.game.hpPerLevel
  hero.hp    += CONFIG.game.hpPerLevel   // текущий HP тоже растёт
  // ui.js показывает анимацию level-up над токеном
}
```

---

## Ход злодея

Злодей управляется **Игроком 2**. За один ход злодей может:
- Использовать `actionsPerRound` действий (2 или 3)
- Или потратить оба действия на `heavy` (Мощный удар, `costActions: 2`)

### Побег злодея
```
Способность flee доступна если:
  currentRound === CONFIG.game.roundsPerBattle  // последний раунд
  villain.hp / villain.maxHp <= flee.hpThreshold (0.3 = 30%)
```

После Побега → `endgame.js: villainFled()`
Карта 4: способности `flee` нет → босс не может сбежать.
