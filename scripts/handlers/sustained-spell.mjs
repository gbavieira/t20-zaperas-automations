/* ============================================================
   T20 Automações — Handler: Contador de Magia Sustentada

   Automatiza o ciclo de magias sustentadas:
   1. Aplica efeito de sustentação automaticamente ao lançar a magia
   2. Prompt interativo a cada turno no combate
   3. Cobrança de PM ou remoção do efeito

   Hooks:
     - createChatMessage     → cria ActiveEffect no caster
     - renderChatMessageHTML → prompt buttons
     - updateCombat          → prompt no início do turno
   ============================================================ */

// ── Constantes ───────────────────────────────────────────────

const SUSTAIN_FLAG = "sustainedSpell";
const SUSTAIN_PROMPT_FLAG = "sustainPrompt";
const SUSTAIN_PM_COST = 1;
const SUSTAIN_ICON = "systems/tormenta20/icons/conditions/sustentando.svg";
const PROMPT_CLASS = "t20-sustain-prompt";

// ── Fase 1: Aplicar efeito automaticamente ao lançar ─────────

/**
 * Detecta magias sustentadas e aplica o ActiveEffect de tracking no caster.
 * Chamado em createChatMessage.
 *
 * @param {ChatMessage} message
 */
export async function handleSustainCast(message) {
  // Só roda no client do autor (quem lançou a magia)
  const authorId = message.author?.id ?? message.user;
  if (authorId !== game.user.id) return;

  const itemData = message.flags?.tormenta20?.itemData;
  if (!itemData?.duracao || itemData.duracao.units !== "sust") return;

  const actor = game.actors.get(message.speaker?.actor);
  if (!actor) return;

  // Extrai nome do item do HTML da mensagem
  const div = document.createElement("div");
  div.innerHTML = message.content ?? "";
  const spellName =
    div.querySelector(".item-name")?.textContent?.trim() || "Magia";

  // Evita duplicar se já existe efeito para esta mensagem
  const alreadySustaining = actor.effects.some(
    (e) =>
      e.flags?.tormenta20?.[SUSTAIN_FLAG] &&
      e.flags.tormenta20.castMessageId === message.id,
  );
  if (alreadySustaining) return;

  try {
    await actor.createEmbeddedDocuments("ActiveEffect", [
      {
        name: `Sustentando: ${spellName}`,
        icon: SUSTAIN_ICON,
        flags: {
          tormenta20: {
            [SUSTAIN_FLAG]: true,
            spellName,
            pmCostPerRound: SUSTAIN_PM_COST,
            castMessageId: message.id,
          },
        },
        changes: [], // Sem modificadores — efeito puramente de rastreamento
      },
    ]);

    ui.notifications.info(
      `Sustentando: ${spellName} (${SUSTAIN_PM_COST} PM/rodada)`,
    );
  } catch (err) {
    console.error("T20 | Erro ao criar efeito de sustentação:", err);
  }
}

// ── Fase 2: Prompt no início do turno ────────────────────────

/**
 * Quando o turno muda, cria prompts para cada magia sustentada.
 * Chamado em updateCombat.
 *
 * @param {Combat} combat
 * @param {object} data
 * @param {object} options
 * @param {string} userId
 */
export async function handleSustainTurn(combat, data, options, userId) {
  // Só roda no client que triggou a mudança
  if (game.userId !== userId) return;
  if (combat.round < 1) return;
  if (!("turn" in data || "round" in data)) return;

  const combatant = combat.combatants.get(combat.current.combatantId);
  const actor = combatant?.actor;
  if (!actor) return;

  // Busca effects sustentados pelo nosso sistema
  const sustainedEffects = actor.effects.filter(
    (e) => e.flags?.tormenta20?.[SUSTAIN_FLAG],
  );
  if (!sustainedEffects.length) return;

  // Nome do token ativo ou do ator (para mensagens de chat)
  const actorToken = actor.getActiveTokens()[0];
  const actorName = actorToken?.name ?? actor.name;

  // Cria um prompt para cada magia sustentada (ou auto-encerra se PM insuficiente)
  for (const effect of sustainedEffects) {
    const flags = effect.flags.tormenta20;
    const spellName = flags.spellName || "Magia";
    const pmCost = flags.pmCostPerRound || SUSTAIN_PM_COST;

    // Re-lê PM a cada iteração (pode ter mudado por auto-encerramento anterior)
    const pm = actor.system.attributes.pm;
    const canAfford = pm.value + (pm.temp || 0) >= pmCost;

    // Se PM insuficiente, auto-encerra sem perguntar
    if (!canAfford) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
      await ChatMessage.create({
        content: `<span class="t20-status-msg ended"><i class="fas fa-times"></i> <b>${actorName}</b> encerrou a sustentação de <b>${spellName}</b> (PM insuficiente).</span>`,
        speaker: ChatMessage.getSpeaker({ actor }),
      });
      continue;
    }

    const content = await renderTemplate(
      `modules/t20-zaperas-automations/templates/sustain/prompt.hbs`,
      {
        promptClass: PROMPT_CLASS,
        spellName,
        pmCost,
        actorId: actor.id,
        effectId: effect.id,
      },
    );

    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      ...(game.settings.get("t20-zaperas-automations", "sustainedSpellPublic")
        ? {}
        : { whisper: ChatMessage.getWhisperRecipients("GM") }),
      flags: {
        tormenta20: {
          [SUSTAIN_PROMPT_FLAG]: true,
          actorId: actor.id,
          effectId: effect.id,
          spellName,
          pmCost,
        },
      },
    });
  }
}

// ── Fase 3: Handlers dos botões do prompt ────────────────────

/**
 * Registra os listeners dos botões Sim/Não nos prompts de sustentação.
 * Chamado em renderChatMessageHTML.
 *
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function renderSustainPrompt(message, html) {
  if (!message.flags?.tormenta20?.[SUSTAIN_PROMPT_FLAG]) return;

  const yesBtn = html.querySelector(".sustain-yes");
  const noBtn = html.querySelector(".sustain-no");
  if (!yesBtn && !noBtn) return;

  // GM ou dono do personagem podem interagir com o prompt
  const actorId = message.flags.tormenta20.actorId;
  const actor = game.actors.get(actorId);
  const canInteract =
    game.user.isGM || actor?.testUserPermission(game.user, "OWNER");
  if (!canInteract) {
    if (yesBtn) yesBtn.disabled = true;
    if (noBtn) noBtn.disabled = true;
    return;
  }

  function disableButtons() {
    if (yesBtn) yesBtn.disabled = true;
    if (noBtn) noBtn.disabled = true;
  }

  // Usa o nome do token ativo se existir, fallback para o nome do ator
  const actorToken = actor.getActiveTokens()[0];
  const actorName = actorToken?.name ?? actor.name;

  if (yesBtn) {
    yesBtn.addEventListener("click", async () => {
      disableButtons();
      const pmCost = Number(yesBtn.dataset.pmCost) || SUSTAIN_PM_COST;
      const spellName = yesBtn.dataset.spellName || "Magia";
      const effectId = yesBtn.dataset.effectId;

      try {
        await actor.spendMana(pmCost, 0, false);

        // Mensagem pública para todos
        await ChatMessage.create({
          content: `<span class="t20-status-msg sustaining"><i class="fas fa-magic"></i> <b>${actorName}</b> está sustentando <b>${spellName}</b>.</span>`,
          speaker: ChatMessage.getSpeaker({ actor }),
        });

        // Auto-encerrar outras sustentações que não podem mais ser pagas
        const remainingEffects = actor.effects.filter(
          (e) => e.flags?.tormenta20?.[SUSTAIN_FLAG] && e.id !== effectId,
        );
        for (const remaining of remainingEffects) {
          const currentPM = actor.system.attributes.pm;
          const cost =
            remaining.flags.tormenta20.pmCostPerRound || SUSTAIN_PM_COST;
          if (currentPM.value + (currentPM.temp || 0) < cost) {
            const name = remaining.flags.tormenta20.spellName || "Magia";
            await actor.deleteEmbeddedDocuments("ActiveEffect", [remaining.id]);
            await ChatMessage.create({
              content: `<span class="t20-status-msg ended"><i class="fas fa-times"></i> <b>${actorName}</b> encerrou a sustentação de <b>${name}</b> (PM insuficiente).</span>`,
              speaker: ChatMessage.getSpeaker({ actor }),
            });
          }
        }
      } catch (err) {
        console.error("T20 | Erro ao gastar PM:", err);
        // Erro ao gastar PM — encerra a sustentação por segurança
        const effect = actor.effects.get(effectId);
        if (effect) {
          await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
          await ChatMessage.create({
            content: `<span class="t20-status-msg ended"><i class="fas fa-times"></i> <b>${actorName}</b> encerrou a sustentação de <b>${spellName}</b> (PM insuficiente).</span>`,
            speaker: ChatMessage.getSpeaker({ actor }),
          });
        }
      }
    });
  }

  if (noBtn) {
    noBtn.addEventListener("click", async () => {
      disableButtons();
      const effectId = noBtn.dataset.effectId;
      const spellName = noBtn.dataset.spellName || "Magia";

      const effect = actor.effects.get(effectId);
      if (effect) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
        // Mensagem pública para todos
        await ChatMessage.create({
          content: `<span class="t20-status-msg ended"><i class="fas fa-times"></i> <b>${actorName}</b> encerrou a sustentação de <b>${spellName}</b>.</span>`,
          speaker: ChatMessage.getSpeaker({ actor }),
        });
      }
    });
  }
}
