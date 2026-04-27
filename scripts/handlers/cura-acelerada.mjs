/* ============================================================
   T20 Automações — Handler: Cura Acelerada

   Detecta "cura acelerada X" no texto de resistências de
   ameaças (NPCs) e oferece ao GM opção de regeneração a cada
   turno durante o combate.

   Fluxo:
     1. updateCombat  → detecta NPC com cura acelerada
     2. createChatMessage → cria prompt whisper para GM
     3. renderChatMessageHTML → wira botões Sim/Não
   ============================================================ */

// ── Constantes ───────────────────────────────────────────────

const CURA_ACELERADA_PROMPT_FLAG = "curaAceleradaPrompt";
const PROMPT_CLASS = "t20-cura-acelerada-prompt";

// ── Fase 1: Detectar e oferecer cura no turno ────────────────

/**
 * Verifica a cada turno se o ator é uma ameaça com "cura acelerada".
 * Se sim, cria um prompt whisper para o GM.
 * Chamado em updateCombat.
 *
 * @param {Combat} combat
 * @param {object} data
 * @param {object} options
 * @param {string} userId
 */
export async function handleCuraAceleradaTurn(combat, data, options, userId) {
  // Só roda no client que triggou a mudança
  if (game.userId !== userId) return;
  if (combat.round < 1) return;
  if (!("turn" in data || "round" in data)) return;

  const combatant = combat.combatants.get(combat.current.combatantId);
  const actor = combatant?.actor;
  if (!actor) return;

  // Só ameaças têm cura acelerada (não PCs)
  if (actor.type !== "npc") return;

  // Extrai valor de cura acelerada do campo de resistências
  const resistenciasTexto = actor.system.detalhes?.resistencias ?? "";
  const match = resistenciasTexto.match(/cura\s+acelerada\s+(\d+)/i);
  if (!match) return;

  const healAmount = Number(match[1]);
  const tokenId = combatant.tokenId;
  const actorToken = actor.getActiveTokens()[0];
  const actorName = actorToken?.name ?? actor.name;

  const content = await renderTemplate(
    `modules/t20-zaperas-automations/templates/cura-acelerada/prompt.hbs`,
    {
      promptClass: PROMPT_CLASS,
      actorName,
      healAmount,
      actorId: actor.id,
      tokenId,
    },
  );

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM"),
    flags: {
      tormenta20: {
        [CURA_ACELERADA_PROMPT_FLAG]: true,
        actorId: actor.id,
        tokenId,
        healAmount,
      },
    },
  });
}

// ── Fase 2: Handlers dos botões ──────────────────────────────

/**
 * Registra os listeners dos botões Sim/Não nos prompts.
 * Chamado em renderChatMessageHTML.
 *
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function renderCuraAceleradaPrompt(message, html) {
  if (!message.flags?.tormenta20?.[CURA_ACELERADA_PROMPT_FLAG]) return;

  const el = html instanceof HTMLElement ? html : (html[0] ?? html);
  const yesBtn = el.querySelector(".sustain-yes");
  const noBtn = el.querySelector(".sustain-no");
  if (!yesBtn && !noBtn) return;

  // Só o GM pode interagir com o prompt
  if (!game.user.isGM) {
    if (yesBtn) yesBtn.disabled = true;
    if (noBtn) noBtn.disabled = true;
    return;
  }

  function disableButtons() {
    if (yesBtn) yesBtn.disabled = true;
    if (noBtn) noBtn.disabled = true;
  }

  const actorId = message.flags.tormenta20.actorId;
  const actor = game.actors.get(actorId);
  if (!actor) return;

  if (yesBtn) {
    yesBtn.addEventListener("click", async () => {
      disableButtons();
      const healAmount = Number(yesBtn.dataset.healAmount);

      try {
        // Resolver o token via tokenId salvo nas flags (evita ambiguidade com múltiplos tokens)
        const tokenId = message.flags.tormenta20.tokenId;
        const token = canvas.tokens.get(tokenId);
        if (!token) {
          ui.notifications.error("Token não encontrado no mapa.");
          return;
        }

        // Atualizar o ator via token (funciona com tokens não-linkedados)
        const pv = token.actor.system.attributes.pv;
        const novoPV = Math.min(pv.value + healAmount, pv.max);

        await token.actor.update({ "system.attributes.pv.value": novoPV });

        // Mensagem pública para todos
        await ChatMessage.create({
          content: `<span class="t20-status-msg healing"><i class="fas fa-heart"></i> <b>${token.name}</b> se regenera <b>${healAmount} PV</b> (Cura Acelerada).</span>`,
          speaker: ChatMessage.getSpeaker({ actor: token.actor }),
        });
      } catch (err) {
        console.error("T20 | Erro ao aplicar cura acelerada:", err);
        ui.notifications.error(`Erro ao aplicar cura: ${err.message}`);
      }
    });
  }

  if (noBtn) {
    noBtn.addEventListener("click", async () => {
      disableButtons();
    });
  }
}
