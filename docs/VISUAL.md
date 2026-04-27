# VISUAL.md
> Читать при работе с файлами `css/`

Визуальный стиль — **Stranger Things**: Изнанка, мерцающие лампочки, красное свечение, ретро-80-е.

---

## CSS-файлы и их содержимое

| Файл            | Содержимое                                              |
|-----------------|---------------------------------------------------------|
| `base.css`      | `:root` переменные, `@import` шрифтов, body, reset     |
| `animations.css`| Все `@keyframes` — только анимации, никакого другого CSS |
| `board.css`     | `.board`, `.token`, `.token.selected`, `.token.active-turn`, `.token.knocked-out`, `.damage-float` |
| `hud.css`       | `.hud`, `.hp-bar`, `.hp-bar-fill`, `.log`, `.action-log-item` |
| `cards.css`     | `.character-card`, `.ability-btn`, `.ability-btn:disabled` |
| `modals.css`    | `.modal-overlay`, `.dice-modal`, `.initiative-screen`, `.results-screen` |

---

## base.css — переменные и шрифты

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=VT323&family=Special+Elite&display=swap');

:root {
  /* Фоны */
  --bg-deep:       #060608;
  --bg-panel:      #0d0b10;
  --bg-board:      #0a0a12;
  --bg-modal:      rgba(4, 3, 8, 0.96);

  /* Свечения Изнанки */
  --glow-red:      #ff2a2a;
  --glow-orange:   #ff6a00;
  --glow-blue:     #4fc3f7;

  /* Текст */
  --text-primary:  #e8e0d0;
  --text-muted:    #7a6e60;

  /* Рамки */
  --border-dim:    rgba(255, 42, 42, 0.2);
  --border-active: rgba(255, 42, 42, 0.7);

  /* Шрифты */
  --font-title:    'Cinzel Decorative', serif;   /* заголовки */
  --font-ui:       'VT323', monospace;           /* интерфейс, цифры */
  --font-log:      'Special Elite', cursive;     /* лог действий */
}

body {
  background: var(--bg-deep);
  background-image: radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.08) 100%);
  color: var(--text-primary);
  font-family: var(--font-ui);
  margin: 0;
  overflow: hidden;
}

/* Заголовок игры */
.game-title {
  font-family: var(--font-title);
  color: var(--glow-red);
  text-shadow: 0 0 20px #ff2a2a, 0 0 40px #ff000088;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
```

---

## board.css

```css
.board {
  position: relative;
  width: 960px;
  height: 720px;
  overflow: hidden;
  /* Fallback: Изнанка */
  background:
    radial-gradient(ellipse at 50% 30%, rgba(180,0,0,0.15) 0%, transparent 60%),
    repeating-linear-gradient(0deg,  rgba(255,0,0,0.04) 0, rgba(255,0,0,0.04) 1px, transparent 1px, transparent 80px),
    repeating-linear-gradient(90deg, rgba(255,0,0,0.04) 0, rgba(255,0,0,0.04) 1px, transparent 1px, transparent 80px),
    #0a0a12;
  box-shadow: inset 0 0 60px rgba(255,0,0,0.12);
}

.token {
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  cursor: grab;
  border: 2px solid rgba(255,255,255,0.15);
  overflow: hidden;
  transition: transform 0.1s;
  user-select: none;
}

.token-label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-ui);
  font-size: 11px;
  color: var(--text-primary);
  white-space: nowrap;
  text-shadow: 0 0 4px #000;
}

.token.selected {
  box-shadow: 0 0 0 3px gold, 0 0 12px rgba(255,215,0,0.5);
}

.token.active-turn {
  animation: flicker 1.5s ease-in-out infinite;
  z-index: 100;
}

.token.knocked-out {
  opacity: 0.4;
  filter: grayscale(1) brightness(0.6);
  cursor: not-allowed;
}

.damage-float {
  position: absolute;
  font-family: var(--font-ui);
  font-size: 22px;
  font-weight: bold;
  pointer-events: none;
  z-index: 200;
}
.damage-float.dmg  { color: #ff4444; text-shadow: 0 0 8px #ff0000; }
.damage-float.heal { color: #44ff88; text-shadow: 0 0 8px #00ff44; }
```

---

## hud.css

```css
.hud {
  width: 220px;
  background: rgba(10, 8, 12, 0.92);
  border-left: 1px solid var(--border-dim);
  box-shadow: -4px 0 20px rgba(255,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto;
}

.hud-section-title {
  font-family: var(--font-ui);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--glow-red);
  text-shadow: 0 0 8px rgba(255,42,42,0.5);
  border-bottom: 1px solid var(--border-dim);
  padding-bottom: 4px;
}

.hp-bar {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff2a2a, #ff6a00);
  box-shadow: 0 0 8px rgba(255,42,42,0.8);
  transition: width 0.4s ease;
}

.hp-bar-villain .hp-bar-fill {
  background: linear-gradient(90deg, #8b0000, #cc0000);
  box-shadow: 0 0 12px rgba(200,0,0,0.9);
}

.action-log {
  font-family: var(--font-log);
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.log-item-new { color: var(--text-primary); }
```

---

## cards.css

```css
.character-card {
  background: rgba(10, 8, 16, 0.95);
  border: 1px solid var(--border-active);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 0 25px rgba(255,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.6);
  animation: slide-up 0.3s ease forwards;
}

.character-card.hiding {
  animation: fade-out 0.2s ease forwards;
}

.card-portrait {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--border-active);
  box-shadow: 0 0 15px rgba(255,42,42,0.5);
  overflow: hidden;
}

.ability-btn {
  background: transparent;
  border: 1px solid rgba(255,42,42,0.4);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
  letter-spacing: 0.05em;
}

.ability-btn:hover:not(:disabled) {
  border-color: var(--glow-red);
  box-shadow: 0 0 10px rgba(255,42,42,0.5);
  color: #ff8888;
}

.ability-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ability-dice-hint {
  font-size: 11px;
  color: var(--glow-orange);
  font-family: var(--font-ui);
}
```

---

## modals.css

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Форма ввода кубика */
.dice-modal {
  background: var(--bg-modal);
  border: 1px solid var(--border-active);
  border-radius: 12px;
  padding: 28px 32px;
  min-width: 320px;
  box-shadow: 0 0 40px rgba(255,0,0,0.4);
  text-align: center;
}

.dice-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  animation: lamp-flicker 4s ease-in-out infinite;
}

.dice-label {
  font-family: var(--font-title);
  font-size: 15px;
  color: var(--glow-red);
  text-shadow: 0 0 10px rgba(255,42,42,0.6);
  margin-bottom: 8px;
}

.dice-formula {
  font-family: var(--font-ui);
  font-size: 18px;
  color: var(--glow-orange);
  margin-bottom: 16px;
  letter-spacing: 0.08em;
}

.dice-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-active);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 28px;
  text-align: center;
  width: 80px;
  padding: 8px;
  border-radius: 6px;
  outline: none;
}

.dice-confirm-btn {
  background: transparent;
  border: 1px solid var(--glow-red);
  color: var(--glow-red);
  font-family: var(--font-ui);
  font-size: 16px;
  padding: 8px 24px;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 16px;
  transition: all 0.2s;
}

.dice-confirm-btn:hover {
  background: rgba(255,42,42,0.15);
  box-shadow: 0 0 16px rgba(255,42,42,0.6);
}

/* Экран инициативы */
.initiative-screen {
  /* аналогичный стиль, список участников с полями ввода */
  background: var(--bg-modal);
  border: 1px solid var(--border-active);
  border-radius: 12px;
  padding: 28px 32px;
  min-width: 400px;
  box-shadow: 0 0 40px rgba(255,0,0,0.3);
}

.initiative-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,42,42,0.1);
  font-family: var(--font-ui);
}

.initiative-bonus {
  color: var(--glow-orange);
  font-size: 13px;
  min-width: 60px;
}
```

---

## animations.css — все @keyframes

```css
/* Мерцание активного токена (лампочка Джойс) */
@keyframes flicker {
  0%, 100% { box-shadow: 0 0 0 3px #ff2a2a, 0 0 15px rgba(255,42,42,0.6); }
  33%       { box-shadow: 0 0 0 3px #ff6600, 0 0 8px rgba(255,102,0,0.3); }
  66%       { box-shadow: 0 0 0 4px #ff2a2a, 0 0 25px rgba(255,42,42,0.9); }
}

/* Пепел из портала Изнанки */
@keyframes ash-fall {
  0%   { transform: translateY(-10px) translateX(0) rotate(0deg);    opacity: 0; }
  10%  { opacity: 0.6; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(100vh) translateX(30px) rotate(180deg); opacity: 0; }
}

/* Пульс красного свечения на доске */
@keyframes upside-down-pulse {
  0%, 100% { opacity: 0.08; }
  50%       { opacity: 0.15; }
}

/* Иконка кубика в форме ввода */
@keyframes lamp-flicker {
  0%, 95%, 100% { opacity: 1; }
  96%           { opacity: 0.3; }
  97%           { opacity: 1; }
  98%           { opacity: 0.1; }
  99%           { opacity: 0.8; }
}

/* Урон / хил — всплывающее число */
@keyframes damage-float {
  0%   { opacity: 1; transform: translateY(0) scale(1.4); filter: blur(0); }
  50%  { filter: blur(1px); }
  100% { opacity: 0; transform: translateY(-60px) scale(0.8); filter: blur(3px); }
}

/* Атакующий встряхивается */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%  { transform: translateX(-6px) rotate(-3deg); }
  75%  { transform: translateX(6px) rotate(3deg); }
}

/* Цель получила удар — красная вспышка */
@keyframes flash-red {
  0%, 100% { filter: none; }
  50% { filter: brightness(0.4) sepia(1) hue-rotate(-30deg) saturate(5); }
}

/* Цель получила хил — зелёная вспышка */
@keyframes flash-green {
  0%, 100% { filter: none; }
  50% { filter: brightness(1.3) saturate(2) hue-rotate(80deg); }
}

/* Level Up — над токеном */
@keyframes level-up {
  0%   { opacity: 0; transform: scale(0.5); }
  60%  { opacity: 1; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(1) translateY(-80px); }
}

/* Карточка персонажа появляется */
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* Карточка исчезает */
@keyframes fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
```
