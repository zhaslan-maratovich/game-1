# CLAUDE.md — D&D Browser Game (Top-Down)

## Project Overview

Браузерная тактическая игра для двух игроков в стиле D&D + визуальная стилистика **Stranger Things**.
Пять героев (Игрок 1) против одного босса (Игрок 2). Кампания: 4 карты, нарастающая сложность.

---

## Tech Stack

- **Vanilla HTML + CSS + JavaScript** — никаких фреймворков, сборщиков, npm
- Файлы подключаются через `<link>` и `<script>` в `index.html`
- Все кубики бросаются **физически** — игра только принимает ввод результата

---

## File Structure

```
/
├── index.html               ← HTML-скелет, подключает всё через link/script
├── CLAUDE.md
├── docs/                    ← детальные спецификации, читать по необходимости
│   ├── CONFIG.md            ← читать при работе с config.js
│   ├── MECHANICS.md         ← читать при работе с combat.js, dice.js
│   ├── VISUAL.md            ← читать при работе с css/ файлами
│   ├── PORTRAITS.md         ← читать при работе с portraitSvg в config.js
│   └── ENDGAME.md           ← читать при работе с endgame.js
├── css/
│   ├── base.css             ← CSS-переменные, сброс стилей, шрифты
│   ├── board.css            ← доска, токены, drag-and-drop состояния
│   ├── hud.css              ← правая панель, HP-бары, лог действий
│   ├── cards.css            ← карточка активного персонажа
│   ├── modals.css           ← форма ввода кубика, экран результатов, инициатива
│   └── animations.css       ← все @keyframes
└── js/
    ├── config.js            ← CONFIG (все данные: персонажи, карты, боссы)
    ├── state.js             ← gameState, инициализация, сброс
    ├── dice.js              ← UI формы ввода кубиков, валидация
    ├── combat.js            ← боевая механика: атака, хил, баффы, нокаут
    ├── initiative.js        ← экран инициативы, сортировка порядка ходов
    ├── ui.js                ← рендер токенов, HUD, карточки, лог, drag-and-drop
    ├── endgame.js           ← конец боя, награды, экран результатов, level up
    └── main.js              ← точка входа, bootstrap, глобальные события
```

### Порядок подключения в index.html
```html
<!-- CSS — в <head> -->
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/animations.css">
<link rel="stylesheet" href="css/board.css">
<link rel="stylesheet" href="css/hud.css">
<link rel="stylesheet" href="css/cards.css">
<link rel="stylesheet" href="css/modals.css">

<!-- JS — перед </body>, строго в этом порядке -->
<script src="js/config.js"></script>
<script src="js/state.js"></script>
<script src="js/dice.js"></script>
<script src="js/combat.js"></script>
<script src="js/initiative.js"></script>
<script src="js/ui.js"></script>
<script src="js/endgame.js"></script>
<script src="js/main.js"></script>
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА

### 1. Никаких баннеров о раундах
«Раунд» — только внутренний счётчик. **Никаких оверлеев, задержек, сообщений** между ходами.
Единственный индикатор — строка в HUD: `Ход 7`.
После того как все участники сходили — сразу открывается новый экран инициативы.

### 2. Все кубики бросаются вживую — только ввод
Игра **никогда** не вызывает `Math.random()` для боевых бросков.
Каждый бросок = модальная форма с иконкой кубика, формулой и полем ввода.
Форма блокирует UI до подтверждения. Подробнее → `docs/MECHANICS.md`

### 3. Портреты — SVG-иллюстрации в config.js
Никаких emoji-кружков, никаких внешних URL.
Каждый персонаж имеет `portraitSvg` — SVG-строку в `config.js`.
Подробное описание внешности → `docs/PORTRAITS.md`

### 4. Карточка активного персонажа
При каждом ходу в правой панели появляется карточка с портретом, HP, способностями.
Анимация slide-up при появлении, fade-out после действия.
Подробнее → `docs/VISUAL.md`

### 5. Чёткие подписи кубика в каждой форме
Везде указывать тип (`d20`, `1d8`, `2d6`) + бонус + формула итога.
Пример: `"Бросьте 1d10 + 4 — урон Точного выстрела"`

---

## Game State

Хранится в `state.js`, доступен глобально как `window.gameState`.

```js
const gameState = {
  currentMapIndex:  0,
  currentRound:     1,          // 1–3, только внутренняя логика
  currentTurnIndex: 0,
  initiativeOrder:  [],         // ["paladin","villain","ranger",...]
  phase: "initiative",          // "initiative"|"battle"|"dice_input"|"battle_end"|"map_end"
  pendingDiceRoll:  null,       // { label, formula, bonus, onConfirm }
  characters:       [],
  villain:          {},
  activeBuffs:      [],
  activeDebuffs:    [],
  battleStats: {
    damageDealt: {}, maxSingleHit: {}, healingDone: {},
    damageTaken: {}, supportActions: {}, missCount: {}, idleStreak: {},
  },
  escapedVillains: [],
  log: [],
};
```

---

## Ответственность каждого JS-файла

| Файл             | Отвечает за                                              | НЕ должен                        |
|------------------|----------------------------------------------------------|----------------------------------|
| `config.js`      | Только данные и константы                                | Трогать DOM, менять state        |
| `state.js`       | gameState, init(), reset()                               | Рендерить, считать урон          |
| `dice.js`        | Показать форму кубика, вернуть введённое число           | Считать урон, менять HP          |
| `combat.js`      | Логика атаки, хила, баффов, нокаута                      | Трогать DOM напрямую             |
| `initiative.js`  | Экран инициативы, заполнить initiativeOrder              | Ничего кроме инициативы          |
| `ui.js`          | Рендер всего: токены, HUD, карточка, лог, drag-and-drop  | Содержать игровую логику         |
| `endgame.js`     | Конец боя, подсчёт наград, level up, переход карты       | Рендерить игровое поле           |
| `main.js`        | Точка входа, слушатели событий, связывание модулей       | Содержать бизнес-логику          |

---

## Структура одного хода

1. Токен активного → `.active-turn` (pulse анимация)
2. В правой панели появляется **карточка персонажа** с кнопками способностей
3. Игрок выбирает действие → `dice.js` показывает форму ввода кубика
4. Ввод результата → `combat.js` считает итог → `ui.js` показывает анимацию
5. Карточка скрывается, ход передаётся следующему в `initiativeOrder`

Детальные формулы → `docs/MECHANICS.md`

---

## Out of Scope
- Звуки и музыка
- Мобильная версия / touch events
- Сохранение прогресса (localStorage)
- Онлайн-мультиплеер
- AI для злодея (злодеем управляет Игрок 2)
