/* ============================================================
   T20 Automações — Handler: Testes Opostos (Engine Genérica)

   Engine data-driven que lê as regras de "opposedChecksData" (world setting).
   As regras são configuráveis via Settings → Configurar Testes Opostos.

   Modos de defesa:
     "choice" — GM escolhe entre skills (Enganação → Perc ou Intu)
     "fixed"  — skill fixa, GM arrasta atores no picker
     "auto"   — rola todos os tokens do canvas automaticamente
   ============================================================ */

import { buildRuntimeChecks } from "../config.mjs";
import { openActorPicker } from "../utils/actor-picker.mjs";
import { buildResultTable, postGMMessage } from "../utils/chat.mjs";
import { rollSkillCheck } from "../utils/rolls.mjs";

const MOD = "t20-zaperas-automations";

// ── Helpers ─────────────────────────────────────────────────

/**
 * Abre Dialog para GM escolher entre skills de defesa.
 * Usado pelo modo "choice" (Enganação → Percepção ou Intuição).
 */
async function promptSkillChoice(check, attackerName, attackerTotal) {
  const skillChoiceContent = await renderTemplate(
    `modules/t20-zaperas-automations/templates/opposed-checks/skill-choice.hbs`,
    { attackerName, attackLabel: check.attackLabel, attackerTotal },
  );

  return new Promise((resolve) => {
    let resolved = false;
    const buttons = {};
    for (const choice of check.defenseChoices) {
      buttons[choice.key] = {
        icon: `<i class="fas ${choice.icon}"></i>`,
        label: choice.label,
        callback: () => {
          resolved = true;
          resolve(choice);
        },
      };
    }
    buttons.cancel = {
      icon: '<i class="fas fa-times"></i>',
      label: "Ignorar",
      callback: () => {
        resolved = true;
        resolve(null);
      },
    };

    new Dialog(
      {
        title: `${check.attackLabel} de ${attackerName} (${attackerTotal})`,
        content: skillChoiceContent,
        buttons,
        default: check.defenseChoices[check.defenseChoices.length - 1]?.key,
        close: () => {
          if (!resolved) resolve(null);
        },
      },
      { width: 350, classes: ["tormenta20"] },
    ).render(true);
  });
}

/**
 * Determina se o defensor passou no teste oposto,
 * levando em conta 20 natural e 1 natural do atacante e do defensor.
 *
 * - Atacante nat 1  → defensor vence sempre, EXCETO se defensor também nat 1 (compara totais)
 * - Atacante nat 20 → atacante vence sempre, EXCETO se defensor também nat 20 (compara totais)
 * - Atacante 2–19   → defensor nat 20 vence sempre; defensor nat 1 perde sempre; senão compara totais
 * - Empate de totais → defensor vence
 */
function resolveOpposed(
  attackerTotal,
  attackerNat,
  defenderTotal,
  defenderNat,
) {
  // Atacante nat 1: defensor vence, exceto se defensor também nat 1 (compara totais)
  if (attackerNat === 1) {
    if (defenderNat === 1) return defenderTotal >= attackerTotal;
    return true;
  }
  // Atacante nat 20: atacante vence, exceto se defensor também nat 20 (compara totais)
  if (attackerNat === 20) {
    if (defenderNat === 20) return defenderTotal >= attackerTotal;
    return false;
  }
  // Atacante 2–19: nat do defensor tem prioridade sobre total
  if (defenderNat === 20) return true; // defensor nat 20 sempre vence
  if (defenderNat === 1) return false; // defensor nat 1 sempre perde
  // Comparação normal de totais (empate → defensor vence)
  return defenderTotal >= attackerTotal;
}

/**
 * Rola defesa para atores selecionados (modo "fixed" e "choice").
 */
async function rollSelectedActors(
  actorIds,
  defenseKey,
  attackerTotal,
  attackerNat,
) {
  const results = [];
  for (const id of actorIds) {
    const actor = game.actors.get(id);
    if (!actor) continue;

    const result = await rollSkillCheck(actor, defenseKey);
    if (!result) continue;

    const token = actor.getActiveTokens()[0];
    results.push({
      name: actor.name,
      actorId: actor.id,
      tokenId: token?.id ?? null,
      total: result.total,
      bonus: result.bonus,
      nat: result.nat,
      passed: resolveOpposed(
        attackerTotal,
        attackerNat,
        result.total,
        result.nat,
      ),
    });
  }
  return results;
}

/**
 * Rola defesa para todos os tokens no canvas (modo "auto").
 * Exclui o token do speaker (quem rolou o ataque).
 */
async function rollAllCanvasTokens(
  message,
  defenseKey,
  attackerTotal,
  attackerNat,
) {
  const speakerTokenId = message.speaker?.token;
  const speakerActorId = message.speaker?.actor;

  const tokens = canvas.tokens.placeables.filter((t) => {
    if (!t.actor) return false;
    if (!t.actor.system?.pericias?.[defenseKey]) return false;
    if (speakerTokenId && t.id === speakerTokenId) return false;
    if (!speakerTokenId && t.actor.id === speakerActorId) return false;
    return true;
  });

  const results = [];
  for (const token of tokens) {
    const result = await rollSkillCheck(token.actor, defenseKey);
    if (!result) continue;

    results.push({
      name: token.name,
      tokenId: token.id,
      total: result.total,
      nat: result.nat,
      passed: resolveOpposed(
        attackerTotal,
        attackerNat,
        result.total,
        result.nat,
      ),
    });
  }
  return results;
}

/**
 * Rola defesa para tokens marcados como alvo no canvas (modo "auto" com targetsOnly).
 * Itera um array pré-filtrado de tokens.
 */
async function rollTargetTokens(
  tokens,
  defenseKey,
  attackerTotal,
  attackerNat,
) {
  const results = [];
  for (const token of tokens) {
    if (!token.actor) continue;

    const result = await rollSkillCheck(token.actor, defenseKey);
    if (!result) continue;

    results.push({
      name: token.name,
      tokenId: token.id,
      total: result.total,
      nat: result.nat,
      passed: resolveOpposed(
        attackerTotal,
        attackerNat,
        result.total,
        result.nat,
      ),
    });
  }
  return results;
}

// ── Handler principal ───────────────────────────────────────

/**
 * Handler de createChatMessage para testes opostos.
 * Itera sobre buildRuntimeChecks() e processa o primeiro match.
 * GM only (guard interno).
 */
export async function handleOpposedChecks(message) {
  if (!game.user.isGM) return;
  if (!message.rolls?.length) return;

  const content = message.content ?? "";
  const gmOnly = game.settings.get(MOD, "opposedChecksGMOnly");
  const targetsOnly = game.settings.get(MOD, "opposedChecksTargetsOnly");

  for (const check of buildRuntimeChecks()) {
    const matches = check.triggers.some((t) => content.includes(t));
    if (!matches) continue;

    const attackRoll = message.rolls[0];
    const attackerTotal =
      message.getFlag("tormenta20", "rollTotal") ?? attackRoll?.total;
    if (!attackerTotal) return;

    // Extrai o valor natural do d20 do atacante
    const attackerNat =
      attackRoll?.dice?.[0]?.total ?? attackRoll?.terms?.[0]?.total ?? 0;

    const attackerName = message.speaker?.alias ?? "???";
    const speakerTokenId = message.speaker?.token;

    // Determina skill de defesa
    let defenseKey, defenseLabel, defenseAbbr;

    if (check.defenseMode === "choice") {
      const choice = await promptSkillChoice(
        check,
        attackerName,
        attackerTotal,
      );
      if (!choice) return;
      defenseKey = choice.key;
      defenseLabel = choice.label;
      defenseAbbr = choice.abbr;
    } else {
      defenseKey = check.defenseSkill.key;
      defenseLabel = check.defenseSkill.label;
      defenseAbbr = check.defenseSkill.abbr;
    }

    // Obtém defensores e rola
    let results;
    if (check.defenseMode === "auto") {
      if (targetsOnly) {
        // Rola apenas para alvos selecionados
        const targets = [...game.user.targets].filter((t) => {
          if (!t.actor) return false;
          if (!t.actor.system?.pericias?.[defenseKey]) return false;
          if (speakerTokenId && t.id === speakerTokenId) return false;
          return true;
        });
        if (!targets.length) {
          ui.notifications.warn(
            "Testes Opostos: nenhum alvo selecionado. Selecione tokens no canvas.",
          );
          return;
        }
        results = await rollTargetTokens(
          targets,
          defenseKey,
          attackerTotal,
          attackerNat,
        );
      } else {
        results = await rollAllCanvasTokens(
          message,
          defenseKey,
          attackerTotal,
          attackerNat,
        );
      }
    } else {
      // Modos "fixed" e "choice" — usar picker com pré-seleção de alvos se targetsOnly
      const preSelectedIds = targetsOnly
        ? [...game.user.targets]
            .filter((t) => t.id !== speakerTokenId && t.actor)
            .map((t) => t.actor.id)
        : [];

      const actorIds = await openActorPicker({
        title: `${defenseLabel} vs ${check.attackLabel} de ${attackerName}`,
        attackerName,
        attackerTotal,
        attackLabel: check.attackLabel,
        defenseLabel,
        defenseAbbr,
        defenseKey,
        preSelectedIds,
      });
      if (!actorIds.length) return;
      results = await rollSelectedActors(
        actorIds,
        defenseKey,
        attackerTotal,
        attackerNat,
      );
    }

    if (!results.length) return;
    results.sort((a, b) => b.total - a.total);

    // Determina se mostra coluna de bônus e qual classe CSS dos links
    const isAuto = check.defenseMode === "auto";
    const linkClass = check.tokenLinkClass ?? "t20-contest-token";
    const headerText = check.headerText(defenseAbbr);

    const html = await buildResultTable({
      headerText,
      attackerName,
      attackerTotal,
      attackerNat,
      attackLabel: check.attackLabel,
      defenseAbbr,
      showBonus: !isAuto,
      linkClass,
      results,
    });

    await postGMMessage({
      content: html,
      sourceMessage: message,
      forceGMOnly: gmOnly,
    });

    return; // Processa apenas o primeiro match
  }
}
