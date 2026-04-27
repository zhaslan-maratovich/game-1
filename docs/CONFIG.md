# CONFIG.md
> Читать при работе с `js/config.js`

Весь объект `CONFIG` объявляется в `config.js` как `const CONFIG = { ... }` без `export`.
Доступен глобально во всех последующих скриптах.

---

## CONFIG.game

```js
game: {
  roundsPerBattle:     3,
  hpPerLevel:          5,       // +5 maxHP за каждый уровень
  damagePerLevel:      1,       // +1 к броску урона за уровень
  attackBonusPerLevel: 1,       // +1 к броску d20 за уровень
  xpToLevel: [0, 200, 500, 900, 1400],   // пороги уровней 1–5
  xp: {
    killVillain:    300,
    damagePerPoint: 1,
    healPerPoint:   1,
    surviveRound:   50,
  },
  awards: {
    berserker:    150,   // наибольший одиночный удар
    guardian:     120,   // наибольший суммарный хил
    unbreakable:  100,   // получил больше всех урона и выжил
    teamPlayer:   100,   // больше всех поддержки на союзников
    precision:     80,   // ни одного промаха за бой
    idlePenalty:  -50,   // 2+ пропущенных хода подряд (штраф)
  },
  initiativeBonus: {
    paladin: 1, bard: 3, cleric: 2, ranger: 4, rogue: 5,
  },
},
```

---

## CONFIG.characters — структура одного героя

```js
{
  id: "paladin",
  name: "Паладин",
  role: "Защитник",
  portraitSvg: `...`,         // SVG-строка, описание → docs/PORTRAITS.md
  accentColor: "#c8a000",
  hp: 30,
  ac: 18,
  attackBonus: 5,
  startX: 80, startY: 100,   // стартовая позиция на доске (px)
  abilities: {
    attack:  { name, type: "attack",  dice, bonus, ignoreAC?, oncePer?, description },
    heal:    { name, type: "heal",    amount, target, description },
    special: { name, type,            ...params, description },
    utility: { name, type,            ...params, description },  // опционально
  },
}
```

## Все 5 героев

| id       | name     | HP | AC | attackBonus | startY |
|----------|----------|----|----|-------------|--------|
| paladin  | Паладин  | 30 | 18 | 5           | 100    |
| bard     | Бард     | 22 | 13 | 3           | 220    |
| cleric   | Клирик   | 26 | 15 | 4           | 340    |
| ranger   | Рейнджер | 24 | 14 | 6           | 460    |
| rogue    | Плут     | 20 | 14 | 4           | 580    |

Все startX = 80.

## Способности героев

### Паладин
```js
attack:  { name:"Священный удар",  type:"attack",  dice:"1d8",  bonus:3 }
heal:    { name:"Возложение рук",  type:"heal",    amount:10,  target:"ally" }
special: { name:"Аура защиты",     type:"buff",    acBonus:2,  duration:1, target:"all" }
```

### Бард
```js
attack:  { name:"Острое слово",         type:"attack+debuff", dice:"1d4", bonus:1,
           debuff:{ attackPenalty:-2, duration:1 } }
heal:    { name:"Слово восстановления", type:"heal", amount:6, target:"ally" }
special: { name:"Вдохновение",          type:"buff", dicebonus:"1d6", duration:1, target:"single_ally" }
```

### Клирик
```js
attack:  { name:"Священный огонь", type:"attack", dice:"1d6", bonus:2, ignoreAC:true }
heal:    { name:"Исцеление ран",   type:"heal",   amount:14, target:"ally" }
special: { name:"Благословение",   type:"buff",   dicebonus:"1d4", duration:2, target:"all" }
```

### Рейнджер
```js
attack:  { name:"Точный выстрел",  type:"attack",  dice:"1d10", bonus:4 }
special: { name:"Охотничья метка", type:"debuff",  bonusDice:"1d6", duration:1, target:"villain" }
utility: { name:"Камуфляж",        type:"defense", damageReduction:4, duration:1, target:"self" }
```

### Плут
```js
attack:  { name:"Скрытная атака", type:"attack",  dice:"2d6", bonus:2, oncePer:"round" }
special: { name:"Уклонение",      type:"defense", halfDamage:true, duration:1, target:"self" }
utility: { name:"Слабое место",   type:"debuff",  acReduction:3, duration:1, target:"villain" }
```

---

## CONFIG.maps — структура одной карты

```js
{
  id: "map1",
  name: "Лесная засада",
  mapNumber: 1,
  boardImage: null,          // null = CSS fallback; или путь к файлу
  boardFallbackCSS: "...",   // CSS для background если boardImage === null
  villain: {
    id, name, portraitSvg, accentColor,
    hp, ac, actionsPerRound, initiativeBonus,
    startX: 820, startY: 320,
    abilities: { attack, heavy?, taunt?, curse?, aura?, flee? }
  }
}
```

## Все 4 карты

| # | Карта              | Босс            | HP  | AC | Д/раунд |
|---|--------------------|-----------------|-----|----|---------|
| 1 | Лесная засада      | Вожак бандитов  | 60  | 12 | 2       |
| 2 | Руины крепости     | Тёмный рыцарь   | 90  | 16 | 2       |
| 3 | Склеп некроманта   | Некромант       | 120 | 14 | 2       |
| 4 | Цитадель Тьмы      | Тёмный Лорд     | 160 | 18 | **3**   |

## Способности боссов

| Способность   | Карты   | Параметры                                    |
|---------------|---------|----------------------------------------------|
| Удар          | 1–4     | dice: 1d6/1d8/1d10/1d12, bonus: 2/3/4/5     |
| Мощный удар   | 1–4     | dice: 2d6/2d8/2d10/2d12, costActions: 2      |
| Запугивание   | 1–4     | attackDebuff: -2, duration: 1                |
| Проклятие     | 3–4     | acReduction: 3, duration: 2                  |
| Тёмная аура   | 4       | globalAttackDebuff: 1, duration: 3           |
| Побег         | 1–3     | availableRound: 3, hpThreshold: 0.3          |
