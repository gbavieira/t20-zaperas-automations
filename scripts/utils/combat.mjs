/* ============================================================
   T20 Automações — Utils: Combate
   ============================================================ */

/**
 * Resolve o ator do turno atual em handlers de updateCombat.
 * Aplica os guards padrão (mesmo client, round válido, mudança de turno/round).
 *
 * @param {Combat} combat
 * @param {object} data    diff vindo do hook
 * @param {string} userId  id do user que originou a atualização
 * @returns {{combatant: Combatant, actor: Actor, tokenId: string}|null}
 */
export function getCurrentTurnActor(combat, data, userId) {
  if (game.userId !== userId) return null;
  if (combat.round < 1) return null;
  if (!("turn" in data || "round" in data)) return null;

  const combatant = combat.combatants.get(combat.current.combatantId);
  if (!combatant?.actor) return null;

  return { combatant, actor: combatant.actor, tokenId: combatant.tokenId };
}
