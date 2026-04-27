// ---- Helpers ----

function getCharById(id) {
  if (gameState.villain.id === id) return gameState.villain;
  return gameState.characters.find(c => c.id === id) || null;
}

function getActiveBuffs(charId, stat) {
  return gameState.activeBuffs
    .filter(b => b.targetId === charId && b.stat === stat)
    .reduce((sum, b) => sum + b.amount, 0);
}

function getActiveDebuffs(charId, stat) {
  return gameState.activeDebuffs
    .filter(d => d.targetId === charId && d.stat === stat)
    .reduce((sum, d) => sum + d.amount, 0);
}

function hasHalfDamageBuff(charId) {
  return gameState.activeBuffs.some(b => b.targetId === charId && b.stat === 'halfDamage');
}

function getDamageReduction(charId) {
  return gameState.activeBuffs
    .filter(b => b.targetId === charId && b.stat === 'damageReduction')
    .reduce((sum, b) => sum + b.amount, 0);
}

function getBonusDamageDebuff(targetId) {
  const entry = gameState.activeDebuffs.find(d => d.targetId === targetId && d.stat === 'bonusDamage');
  return entry || null;
}

function getLevelBonus(char, type) {
  if (char.isVillain) return 0;
  const lvl = (char.level || 1) - 1;
  const bonuses = CONFIG.game.levelBonuses;
  if (type === 'attack') return lvl * bonuses.attackPerLevel;
  if (type === 'damage') return lvl * bonuses.damagePerLevel;
  return 0;
}

function recordDamage(attackerId, amount) {
  if (!amount || amount <= 0) return;
  gameState.battleStats.damageDealt[attackerId] = (gameState.battleStats.damageDealt[attackerId] || 0) + amount;
  if (amount > (gameState.battleStats.maxSingleHit[attackerId] || 0)) {
    gameState.battleStats.maxSingleHit[attackerId] = amount;
  }
}

function recordDamageTaken(targetId, amount) {
  if (!amount || amount <= 0) return;
  gameState.battleStats.damageTaken[targetId] = (gameState.battleStats.damageTaken[targetId] || 0) + amount;
}

function recordHeal(healerId, amount) {
  if (!amount || amount <= 0) return;
  gameState.battleStats.healingDone[healerId] = (gameState.battleStats.healingDone[healerId] || 0) + amount;
}

function recordSupport(charId) {
  gameState.battleStats.supportActions[charId] = (gameState.battleStats.supportActions[charId] || 0) + 1;
}

// ---- Buff / Debuff ----

function applyBuff(targetId, stat, amount, turnsLeft, sourceId) {
  gameState.activeBuffs.push({ targetId, stat, amount, turnsLeft, sourceId });
  recordSupport(sourceId);
}

function applyDebuff(targetId, stat, amount, turnsLeft, sourceId) {
  // Remove existing same-stat debuff on target (replace)
  gameState.activeDebuffs = gameState.activeDebuffs.filter(
    d => !(d.targetId === targetId && d.stat === stat)
  );
  gameState.activeDebuffs.push({ targetId, stat, amount, turnsLeft, sourceId });
  recordSupport(sourceId);
}

function tickBuffsForChar(charId) {
  gameState.activeBuffs = gameState.activeBuffs.map(b => {
    if (b.targetId === charId) return { ...b, turnsLeft: b.turnsLeft - 1 };
    return b;
  }).filter(b => b.turnsLeft > 0);

  gameState.activeDebuffs = gameState.activeDebuffs.map(d => {
    if (d.targetId === charId) return { ...d, turnsLeft: d.turnsLeft - 1 };
    return d;
  }).filter(d => d.turnsLeft > 0);
}

// ---- Knockout ----

function checkKnockout(char) {
  if (char.hp <= 0) {
    char.hp = 0;
    char.knockedOut = true;
    addLog(`${char.name} выбит из боя!`, 'log-knockout');
    uiHighlightToken(char.id, 'red');
    return true;
  }
  return false;
}

// ---- Apply damage to target ----

function applyDamageToTarget(attacker, target, rawDamage) {
  // Level damage bonus (heroes only)
  let dmg = rawDamage + getLevelBonus(attacker, 'damage');

  // Bonus damage debuff on target (Hunter's Mark etc.)
  const bonusDebuff = getBonusDamageDebuff(target.id);
  if (bonusDebuff) {
    // Bonus dice already requested outside; bonusDebuff carries the rolled amount
    if (bonusDebuff.rolledAmount) {
      dmg += bonusDebuff.rolledAmount;
    }
    // Remove it
    gameState.activeDebuffs = gameState.activeDebuffs.filter(d => d !== bonusDebuff);
  }

  // Damage reduction buff on target
  const reduction = getDamageReduction(target.id);
  dmg = Math.max(0, dmg - reduction);

  // Half damage buff on target
  if (hasHalfDamageBuff(target.id)) {
    dmg = Math.floor(dmg / 2);
  }

  dmg = Math.max(1, dmg);
  target.hp = Math.max(0, target.hp - dmg);

  recordDamage(attacker.id, dmg);
  recordDamageTaken(target.id, dmg);

  addLog(`${attacker.name} наносит ${dmg} урона ${target.name}.`, 'log-damage');
  uiShowDamageFloat(target.id, `-${dmg}`, false);
  uiHighlightToken(target.id, 'red');
  uiUpdateHpBar(target.id);

  checkKnockout(target);

  // Check if battle is over
  checkBattleEnd();

  return dmg;
}

// ---- Attack (with hit check) ----

function performAttack(attackerId, targetId, ability) {
  const attacker = getCharById(attackerId);
  const target   = getCharById(targetId);
  if (!attacker || !target) return;
  if (target.knockedOut) return;

  const atkBonus = (attacker.attackBonus || 0)
    + getLevelBonus(attacker, 'attack')
    + getActiveBuffs(attackerId, 'attackBonus')
    + getActiveDebuffs(attackerId, 'attackBonus');

  const targetAC = (target.ac || 10)
    + getActiveBuffs(targetId, 'ac')
    + getActiveDebuffs(targetId, 'ac');

  // d20 hit check
  requestDiceRoll({
    label:    `Бросок атаки: ${attacker.name} → ${target.name}`,
    formula:  `d20 + ${atkBonus} против AC ${targetAC}`,
    diceType: 'd20',
    min: 1, max: 20,
    hint: `Нужно ${targetAC - atkBonus} или выше`,
    onConfirm(roll) {
      const total = roll + atkBonus;
      if (total < targetAC) {
        addLog(`${attacker.name} промахивается! (${roll}+${atkBonus}=${total} < AC ${targetAC})`, 'log-miss');
        gameState.battleStats.missCount[attackerId] = (gameState.battleStats.missCount[attackerId] || 0) + 1;
        uiShowDamageFloat(targetId, 'МИМО', false, true);
        endAction(attackerId);
        return;
      }

      addLog(`${attacker.name} попадает! (${roll}+${atkBonus}=${total} ≥ AC ${targetAC})`, '');

      // Damage roll
      const diceLabel = `Урон: ${ability.formula || ability.diceType}`;
      requestDiceRoll({
        label:    ability.label,
        formula:  ability.formula || ability.diceType,
        diceType: ability.diceType || 'd6',
        min: 1,
        max: (ability.diceCount || 1) * 20,
        onConfirm(dmgRoll) {
          const baseDmg = dmgRoll + (ability.bonus || 0);

          // Apply debuff if attack_debuff type
          if (ability.type === 'attack_debuff' && ability.debuffStat) {
            applyDebuff(targetId, ability.debuffStat, ability.debuffAmount, ability.debuffTurns || 1, attackerId);
            addLog(`${target.name} получает дебафф: ${ability.debuffStat} ${ability.debuffAmount} на ${ability.debuffTurns || 1} хода.`, 'log-system');
          }

          applyDamageToTarget(attacker, target, baseDmg);
          endAction(attackerId);
        },
      });
    },
  });
}

// ---- Attack (no miss check: Holy Fire etc.) ----

function performAttackNoMiss(attackerId, targetId, ability) {
  const attacker = getCharById(attackerId);
  const target   = getCharById(targetId);
  if (!attacker || !target || target.knockedOut) return;

  requestDiceRoll({
    label:    ability.label,
    formula:  ability.formula,
    diceType: ability.diceType || 'd6',
    min: 1,
    max: (ability.diceCount || 1) * 20,
    onConfirm(dmgRoll) {
      const baseDmg = dmgRoll + (ability.bonus || 0);
      addLog(`${attacker.name} использует ${ability.name} — всегда попадает!`, '');
      applyDamageToTarget(attacker, target, baseDmg);
      endAction(attackerId);
    },
  });
}

// ---- Heal ----

function performHeal(healerId, targetId, ability) {
  const healer = getCharById(healerId);
  const target = getCharById(targetId);
  if (!healer || !target) return;

  const wasKnockedOut = target.knockedOut;
  const amount = ability.healAmount || 0;
  const prev = target.hp;

  target.hp = Math.min(target.maxHp, target.hp + amount);
  target.knockedOut = false;

  const actual = target.hp - prev;
  recordHeal(healerId, actual);
  recordSupport(healerId);

  if (wasKnockedOut) {
    addLog(`${healer.name} поднимает ${target.name}! (+${actual} HP)`, 'log-heal');
  } else {
    addLog(`${healer.name} исцеляет ${target.name} на ${actual} HP.`, 'log-heal');
  }

  uiShowDamageFloat(targetId, `+${actual}`, true);
  uiHighlightToken(targetId, 'green');
  uiUpdateHpBar(targetId);

  if (wasKnockedOut) {
    uiReviveToken(targetId);
  }

  endAction(healerId);
}

// ---- Heal All Allies ----

function performHealAll(healerId, ability) {
  const healer = getCharById(healerId);
  if (!healer) return;

  gameState.characters.forEach(c => {
    if (!c.knockedOut) {
      const prev = c.hp;
      c.hp = Math.min(c.maxHp, c.hp + (ability.healAmount || 0));
      const actual = c.hp - prev;
      if (actual > 0) {
        recordHeal(healerId, actual);
        uiShowDamageFloat(c.id, `+${actual}`, true);
        uiHighlightToken(c.id, 'green');
        uiUpdateHpBar(c.id);
      }
    }
  });

  recordSupport(healerId);
  addLog(`${healer.name} использует ${ability.name} — все герои исцелены.`, 'log-heal');
  endAction(healerId);
}

// ---- Buff with roll (Inspiration / Blessing) ----

function performBuffWithRoll(sourceId, targetId, ability) {
  const source = getCharById(sourceId);
  const target = getCharById(targetId);
  if (!source || !target) return;

  requestDiceRoll({
    label:    ability.label,
    formula:  `1${ability.diceType}`,
    diceType: ability.diceType || 'd6',
    min: 1,
    max: 20,
    onConfirm(roll) {
      applyBuff(targetId, ability.buffStat, roll, ability.turnsLeft || 1, sourceId);
      addLog(`${source.name} даёт ${target.name} бонус +${roll} к ${ability.buffStat} на ${ability.turnsLeft || 1} хода.`, 'log-system');
      endAction(sourceId);
    },
  });
}

// ---- Static Buff / Debuff ----

function performBuff(sourceId, targetId, ability) {
  const source = getCharById(sourceId);
  const target = getCharById(targetId);
  if (!source || !target) return;

  if (ability.needsRoll) {
    performBuffWithRoll(sourceId, targetId, ability);
    return;
  }

  applyBuff(targetId, ability.buffStat, ability.buffAmount, ability.turnsLeft || 1, sourceId);
  addLog(`${source.name} применяет ${ability.name} к ${target.name}.`, 'log-system');
  endAction(sourceId);
}

function performDebuff(sourceId, targetId, ability) {
  const source = getCharById(sourceId);
  const target = getCharById(targetId);
  if (!source || !target) return;

  applyDebuff(targetId, ability.debuffStat, ability.debuffAmount, ability.debuffTurns || 1, sourceId);
  addLog(`${source.name} накладывает дебафф на ${target.name}: ${ability.debuffStat} ${ability.debuffAmount}.`, 'log-system');
  endAction(sourceId);
}

// ---- Villain action ----

function performVillainAction(abilityId, targetId) {
  const villain = gameState.villain;
  const ability = villain.abilities.find(a => a.id === abilityId);
  if (!ability) return;

  const cost = ability.actionCost || 1;
  if (villain.actionsLeft < cost) {
    addLog(`У ${villain.name} не хватает действий для ${ability.name}.`, 'log-miss');
    return;
  }

  villain.actionsLeft -= cost;

  const living = gameState.characters.filter(c => !c.knockedOut);
  if (living.length === 0) {
    checkBattleEnd();
    return;
  }
  const target = targetId
    ? (getCharById(targetId) || living[0])
    : living[Math.floor(Math.random() * living.length)];

  if (ability.type === 'self_buff') {
    applyBuff(villain.id, ability.buffStat, ability.buffAmount, ability.turnsLeft || 1, villain.id);
    addLog(`${villain.name} использует ${ability.name}.`, 'log-system');
    uiRenderVillainCard();
    checkNextVillainAction();
    return;
  }

  if (ability.type === 'self_heal') {
    const prev = villain.hp;
    villain.hp = Math.min(villain.maxHp, villain.hp + (ability.healAmount || 0));
    const actual = villain.hp - prev;
    recordHeal(villain.id, actual);
    addLog(`${villain.name} восстанавливает ${actual} HP.`, 'log-heal');
    uiShowDamageFloat(villain.id, `+${actual}`, true);
    uiHighlightToken(villain.id, 'green');
    uiUpdateHpBar(villain.id);
    uiRenderVillainCard();
    checkNextVillainAction();
    return;
  }

  if (ability.type === 'attack_aoe') {
    // AoE — one roll, apply to all
    const atkBonus = (villain.attackBonus || 0)
      + getActiveBuffs(villain.id, 'attackBonus')
      + getActiveDebuffs(villain.id, 'attackBonus');

    requestDiceRoll({
      label:    ability.label,
      formula:  ability.formula,
      diceType: ability.diceType || 'd6',
      min: 1,
      max: (ability.diceCount || 1) * 20,
      onConfirm(dmgRoll) {
        const baseDmg = dmgRoll + (ability.bonus || 0);
        addLog(`${villain.name} использует ${ability.name} против всех!`, 'log-damage');
        living.forEach(hero => {
          applyDamageToTarget(villain, hero, baseDmg);
        });
        uiRenderVillainCard();
        checkNextVillainAction();
      },
    });
    return;
  }

  // Standard attack
  const atkBonus = (villain.attackBonus || 0)
    + getActiveBuffs(villain.id, 'attackBonus')
    + getActiveDebuffs(villain.id, 'attackBonus');
  const targetAC = (target.ac || 10)
    + getActiveBuffs(target.id, 'ac')
    + getActiveDebuffs(target.id, 'ac');

  requestDiceRoll({
    label:    `${villain.name}: бросок атаки на ${target.name}`,
    formula:  `d20 + ${atkBonus} против AC ${targetAC}`,
    diceType: 'd20',
    min: 1, max: 20,
    hint: `Нужно ${Math.max(1, targetAC - atkBonus)} или выше`,
    onConfirm(roll) {
      const total = roll + atkBonus;
      if (total < targetAC) {
        addLog(`${villain.name} промахивается по ${target.name}! (${roll}+${atkBonus}=${total} < AC ${targetAC})`, 'log-miss');
        gameState.battleStats.missCount[villain.id] = (gameState.battleStats.missCount[villain.id] || 0) + 1;
        uiRenderVillainCard();
        checkNextVillainAction();
        return;
      }

      requestDiceRoll({
        label:    ability.label,
        formula:  ability.formula,
        diceType: ability.diceType || 'd6',
        min: 1,
        max: (ability.diceCount || 1) * 20,
        onConfirm(dmgRoll) {
          const baseDmg = dmgRoll + (ability.bonus || 0);

          if (ability.type === 'attack_heal') {
            const actualDmg = applyDamageToTarget(villain, target, baseDmg);
            if (actualDmg && !villain.knockedOut) {
              const healAmt = Math.floor(actualDmg * (ability.selfHealFraction || 0.5));
              villain.hp = Math.min(villain.maxHp, villain.hp + healAmt);
              addLog(`${villain.name} поглощает ${healAmt} HP.`, 'log-heal');
              uiShowDamageFloat(villain.id, `+${healAmt}`, true);
              uiUpdateHpBar(villain.id);
            }
          } else {
            applyDamageToTarget(villain, target, baseDmg);
          }

          uiRenderVillainCard();
          checkNextVillainAction();
        },
      });
    },
  });
}

function checkNextVillainAction() {
  const villain = gameState.villain;

  if (gameState.phase === 'battle_end' || gameState.phase === 'map_end') return;

  const living = gameState.characters.filter(c => !c.knockedOut);
  if (living.length === 0) return;

  if (villain.actionsLeft > 0) {
    // Show villain card so Player 2 can pick the next action
    showCharacterCard(villain.id);
  } else {
    hideCharacterCard();
    setTimeout(() => advanceTurn(), 300);
  }
}

// ---- Battle end check ----

function checkBattleEnd() {
  if (gameState.phase === 'battle_end' || gameState.phase === 'map_end') return;

  const allKnockedOut = gameState.characters.every(c => c.knockedOut);
  const villainDead   = gameState.villain.hp <= 0;

  if (villainDead) {
    gameState.villain.knockedOut = true;
    gameState.phase = 'battle_end';
    setTimeout(() => battleVictory(), 600);
    return;
  }

  if (allKnockedOut) {
    gameState.phase = 'battle_end';
    setTimeout(() => battleDefeat(), 600);
    return;
  }
}

// ---- End of one action (hero used ability) ----

function endAction(charId) {
  if (gameState.phase === 'battle_end' || gameState.phase === 'map_end') return;

  // Reset sneak attack flag at end of villain's turn
  if (charId !== gameState.villain.id) {
    // Track idle streak reset (they acted)
    gameState.battleStats.idleStreak[charId] = 0;
  }

  hideCharacterCard();
  setTimeout(() => advanceTurn(), 300);
}

// ---- Idle (skip turn) ----

function skipTurn(charId) {
  gameState.battleStats.idleStreak[charId] = (gameState.battleStats.idleStreak[charId] || 0) + 1;
  addLog(`${getCharById(charId).name} пропускает ход.`, 'log-system');
  endAction(charId);
}
