/* ============================================================
   T20 Automações — Utilitários de Rolagem
   ============================================================ */

/**
 * Rola 1d20 + bônus da perícia para um ator.
 * @param {Actor} actor
 * @param {string} skillKey  ex: "perc", "vont", "intu", "furt"
 * @returns {Promise<{roll: Roll, total: number, bonus: number, nat: number}|null>}
 */
export async function rollSkillCheck(actor, skillKey) {
  const skill = actor.system?.pericias?.[skillKey];
  if (!skill) return null;

  const bonus = skill.value ?? 0;
  const roll = await new Roll("1d20 + @bonus", { bonus }).evaluate();
  const nat = roll.dice[0]?.total ?? roll.terms[0]?.total ?? 0;

  return { roll, total: roll.total, bonus, nat };
}
