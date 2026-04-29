/* ============================================================
   T20 Automações — Handler: Condições de Combate

   Automatiza três condições que têm efeitos no início do turno:
   - Em Chamas: pergunta se gasta ação padrão para apagar
   - Sangrando: pergunta para rolar teste de Constituição (CD 15)
   - Confuso: rola 1d6 automaticamente e aplica o efeito

   Fluxo:
     1. updateCombat → detecta condições ativas
     2. createChatMessage → cria prompts para GM
     3. renderChatMessageHTML → wira botões dos prompts
   ============================================================ */

import { MOD, CONDITION_STATUS_IDS, CONDITION_TURNS_FLAG } from "../config.mjs";
import { unwrapHtml } from "../utils/dom.mjs";
import { getCurrentTurnActor } from "../utils/combat.mjs";
import { normalizeText } from "../utils/text.mjs";

// ── Tabela de efeitos para Confuso ───────────────────────────
const CONFUSO_EFFECTS = {
  1: "Move-se para uma direção aleatória (rola 1d8: N, NE, L, SE, S, SO, O, NO)",
  2: "Não pode fazer ações, balbuciando incoerentemente",
  3: "Não pode fazer ações, balbuciando incoerentemente",
  4: "Ataca a criatura mais próxima com a arma empunhada",
  5: "Ataca a criatura mais próxima com a arma empunhada",
  6: "A confusão passou — age normalmente",
};

const DIRECTIONS_1D8 = [
  "Norte",
  "Nordeste",
  "Leste",
  "Sudeste",
  "Sul",
  "Sudoeste",
  "Oeste",
  "Noroeste",
];

// ── Fase 1: Detector de turnos com condições ─────────────────

/**
 * Verifica a cada turno se o ator tem condições que precisam de
 * ação automática (Em Chamas, Sangrando, Confuso).
 * Chamado em updateCombat.
 *
 * @param {Combat} combat
 * @param {object} data
 * @param {object} options
 * @param {string} userId
 */
export async function handleConditionTurns(combat, data, _options, userId) {
  const ctx = getCurrentTurnActor(combat, data, userId);
  if (!ctx) return;
  const { actor, tokenId } = ctx;

  const token = canvas.tokens?.get(tokenId);
  const actorName = token?.name ?? actor.name;

  // Processa cada efeito ativo, coletando por statusId
  const processedStatuses = new Set();

  for (const effect of actor.effects) {
    for (const status of effect.statuses ?? []) {
      if (status === CONDITION_STATUS_IDS.emchamas) {
        if (!processedStatuses.has(status)) {
          processedStatuses.add(status);
          await processEmChamas(actor, effect, actorName, tokenId);
        }
      } else if (status === CONDITION_STATUS_IDS.sangrando) {
        const currentPV = Number(actor.system?.attributes?.pv?.value ?? 0);
        if (currentPV <= 0) {
          // Com 0 PV: posta botão de morte uma única vez, ignora stacks adicionais
          if (!processedStatuses.has(status)) {
            processedStatuses.add(status);
            await processSangrando(actor, effect, actorName, tokenId);
          }
        } else {
          // PV normal: processa cada stack de sangrando individualmente
          await processSangrando(actor, effect, actorName, tokenId);
        }
      } else if (status === CONDITION_STATUS_IDS.confuso) {
        if (!processedStatuses.has(status)) {
          await processConfuso(actor, effect, actorName, tokenId);
          processedStatuses.add(status);
        }
      }
    }
  }
}

// ── Processadores de condições ───────────────────────────────

/**
 * Em Chamas: pergunta ao GM se vai gastar ação padrão para apagar.
 * - Sim → remove condição
 * - Não → rola 1d6 de dano de fogo
 */
async function processEmChamas(actor, effect, actorName, tokenId) {
  const token = canvas.tokens?.get(tokenId);
  if (!token) return;

  const showPublic = game.settings.get(MOD, "conditionTurnsPublic") ?? false;

  const content = await renderTemplate(
    "modules/t20-zaperas-automations/templates/condition-turns/em-chamas.hbs",
    {
      actorName,
      promptClass: "t20-em-chamas-prompt",
    },
  );

  const whisperTo = showPublic ? null : ChatMessage.getWhisperRecipients("GM");

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: whisperTo,
    flags: {
      tormenta20: {
        [CONDITION_TURNS_FLAG]: "emchamas",
        actorId: actor.id,
        tokenId,
        effectId: effect.id,
      },
    },
  });
}

/**
 * Sangrando: pergunta ao GM para rolar teste de Constituição (CD 15).
 * - Sucesso (≥15) → remove condição
 * - Falha (<15) → rola 1d6 de dano de perda
 *
 * Múltiplos stacks geram múltiplos prompts.
 */
async function processSangrando(actor, effect, actorName, tokenId) {
  const token = canvas.tokens?.get(tokenId);
  if (!token) return;

  // Com 0 PV ou menos: postar botão no chat para executar macro "Sangrando" do sistema
  const currentPV = Number(actor.system?.attributes?.pv?.value ?? 0);
  if (currentPV <= 0) {
    const showPublic = game.settings.get(MOD, "conditionTurnsPublic") ?? false;
    const deathContent = await renderTemplate(
      "modules/t20-zaperas-automations/templates/condition-turns/teste-morte.hbs",
      { actorName, actorId: actor.id, tokenId },
    );
    const whisperTo = showPublic
      ? null
      : ChatMessage.getWhisperRecipients("GM");
    await ChatMessage.create({
      content: deathContent,
      speaker: ChatMessage.getSpeaker({ actor }),
      whisper: whisperTo,
      flags: {
        tormenta20: {
          [CONDITION_TURNS_FLAG]: "testeMorte",
          actorId: actor.id,
          tokenId,
        },
      },
    });
    return;
  }

  const showPublic = game.settings.get(MOD, "conditionTurnsPublic") ?? false;

  const content = await renderTemplate(
    "modules/t20-zaperas-automations/templates/condition-turns/sangrando.hbs",
    {
      actorName,
      promptClass: "t20-sangrando-prompt",
    },
  );

  const whisperTo = showPublic ? null : ChatMessage.getWhisperRecipients("GM");

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: whisperTo,
    flags: {
      tormenta20: {
        [CONDITION_TURNS_FLAG]: "sangrando",
        actorId: actor.id,
        tokenId,
        effectId: effect.id,
      },
    },
  });
}

/**
 * Confuso: posta prompt no chat para o GM rolar 1d6 manualmente.
 * O botão executa a lógica de roll e aplica o efeito.
 */
async function processConfuso(actor, effect, actorName, tokenId) {
  const showPublic = game.settings.get(MOD, "conditionTurnsPublic") ?? false;

  const content = await renderTemplate(
    "modules/t20-zaperas-automations/templates/condition-turns/confuso-prompt.hbs",
    {
      actorName,
      promptClass: "t20-confuso-prompt",
    },
  );

  const whisperTo = showPublic ? null : ChatMessage.getWhisperRecipients("GM");

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: whisperTo,
    flags: {
      tormenta20: {
        [CONDITION_TURNS_FLAG]: "confuso",
        actorId: actor.id,
        tokenId,
        effectId: effect.id,
      },
    },
  });
}

/**
 * Executa o roll de Confusão e posta o resultado no chat.
 * Chamado pelo botão "Rolar 1d6" no prompt.
 */
async function executeConfusoRoll(actor, effect, actorName) {
  const confoRoll = new Roll("1d6");
  await confoRoll.evaluate();

  const result = confoRoll.total;
  let effectText = CONFUSO_EFFECTS[result] ?? "Efeito desconhecido";
  const rolls = [confoRoll];

  // Se resultado é 1, rola 1d8 para direção
  if (result === 1) {
    const dirRoll = new Roll("1d8");
    await dirRoll.evaluate();
    const dirIndex = Math.max(0, dirRoll.total - 1);
    const direction = DIRECTIONS_1D8[dirIndex];
    effectText = `Move-se para ${direction}`;
    rolls.push(dirRoll);
  }

  const content = await renderTemplate(
    "modules/t20-zaperas-automations/templates/condition-turns/confuso.hbs",
    { actorName, result, effectText },
  );

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls,
  });

  if (result === 6) {
    try {
      const confusoEffect = actor.effects.get(effect.id);
      if (confusoEffect) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
      }
    } catch (err) {
      console.error("T20 | Erro ao remover condição Confuso:", err);
    }
  }
}

// ── Fase 2: Handlers dos botões ──────────────────────────────

/**
 * Registra os listeners dos botões nos prompts Em Chamas e Sangrando.
 * Chamado em renderChatMessageHTML.
 *
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function renderConditionButtons(message, html) {
  const flagValue = message.flags?.tormenta20?.[CONDITION_TURNS_FLAG];
  if (!flagValue) return;

  const el = unwrapHtml(html);

  // Só o GM pode interagir
  if (!game.user.isGM) {
    const buttons = el.querySelectorAll("button[data-action]");
    buttons.forEach((btn) => {
      btn.disabled = true;
    });
    return;
  }

  if (flagValue === "emchamas") {
    renderEmChamasButtons(message, el);
  } else if (flagValue === "sangrando") {
    renderSangrandoButtons(message, el);
  } else if (flagValue === "testeMorte") {
    renderTesteMorteButton(message, el);
  } else if (flagValue === "confuso") {
    renderConfusoButtons(message, el);
  }
}

/**
 * Em Chamas: botões "Apagar" e "Não Apagar"
 */
function renderEmChamasButtons(message, html) {
  const apagarBtn = html.querySelector('[data-action="apagar-chamas"]');
  const naoApagarBtn = html.querySelector('[data-action="nao-apagar-chamas"]');

  if (!apagarBtn && !naoApagarBtn) return;

  function disableButtons() {
    if (apagarBtn) apagarBtn.disabled = true;
    if (naoApagarBtn) naoApagarBtn.disabled = true;
  }

  const effectId = message.flags.tormenta20.effectId;
  const tokenId = message.flags.tormenta20.tokenId;
  const token = canvas.tokens.get(tokenId);
  const actor = token?.actor ?? game.actors.get(message.flags.tormenta20.actorId);
  if (!actor) return;

  // Botão: Apagar (remove condição)
  if (apagarBtn) {
    apagarBtn.addEventListener("click", async () => {
      disableButtons();
      try {
        const effectStillExists = actor.effects.get(effectId);
        if (effectStillExists) {
          await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
        }

        await ChatMessage.create({
          content: `<span class="t20-status-msg success"><i class="fas fa-fire"></i> <b>${message.speaker.alias}</b> apagou as chamas!</span>`,
          speaker: ChatMessage.getSpeaker({ actor }),
        });
      } catch (err) {
        console.error("T20 | Erro ao remover Em Chamas:", err);
        ui.notifications.error(`Erro ao apagar chamas: ${err.message}`);
      }
    }, { once: true });
  }

  // Botão: Não Apagar (apenas registra que ainda está em chamas)
  if (naoApagarBtn) {
    naoApagarBtn.addEventListener("click", async () => {
      disableButtons();
      try {
        const tokenId = message.flags.tormenta20.tokenId;
        const token = canvas.tokens.get(tokenId);
        const name = token?.name ?? message.speaker.alias;

        await ChatMessage.create({
          content: `<span class="t20-status-msg damage"><i class="fas fa-fire"></i> <b>${name}</b> ainda está em chamas.</span>`,
          speaker: ChatMessage.getSpeaker({ actor }),
        });
      } catch (err) {
        console.error("T20 | Erro ao registrar chamas:", err);
        ui.notifications.error(`Erro: ${err.message}`);
      }
    }, { once: true });
  }
}

/**
 * Sangrando: botão "Rolar Teste de Constituição"
 */
function renderSangrandoButtons(message, html) {
  const testBtn = html.querySelector('[data-action="rolar-constituicao"]');
  if (!testBtn) return;

  function disableButtons() {
    testBtn.disabled = true;
  }

  const tokenId = message.flags.tormenta20.tokenId;
  const token = canvas.tokens.get(tokenId);
  const actor = token?.actor ?? game.actors.get(message.flags.tormenta20.actorId);
  if (!actor) return;

  testBtn.addEventListener("click", async () => {
    disableButtons();
    try {
      // Rola teste de Constituição (CD 15)
      const con = Number(actor.system?.atributos?.con?.value ?? 0);
      const sign = con >= 0 ? `+${con}` : `${con}`;
      const testRoll = new Roll(`1d20${sign}`);
      await testRoll.evaluate();

      const total = testRoll.total;
      const cd = 15;
      const success = total >= cd;

      if (success) {
        // Busca efeito de sangrando atual — o effectId da flag pode ter expirado
        // se o sistema T20 já processou o turno nativamente
        const sangrandoEffect = actor.effects.find((e) =>
          e.statuses?.has(CONDITION_STATUS_IDS.sangrando),
        );
        if (sangrandoEffect) {
          await actor.deleteEmbeddedDocuments("ActiveEffect", [sangrandoEffect.id]);
        }

        await ChatMessage.create({
          content: `<span class="t20-status-msg success"><i class="fas fa-heart-pulse"></i> <b>${message.speaker.alias}</b> conseguiu estancar o sangramento! (${total} vs CD ${cd})</span>`,
          speaker: ChatMessage.getSpeaker({ actor }),
          rolls: [testRoll],
        });
      } else {
        // Falha: só reporta — o sistema T20 já aplica 1d6 de perda nativamente
        await ChatMessage.create({
          content: `<span class="t20-status-msg damage"><i class="fas fa-droplet"></i> <b>${message.speaker.alias}</b> continua sangrando! (${total} vs CD ${cd})</span>`,
          speaker: ChatMessage.getSpeaker({ actor }),
          rolls: [testRoll],
        });
      }
    } catch (err) {
      console.error("T20 | Erro ao rolar teste de Constituição:", err);
      ui.notifications.error(`Erro ao rolar teste: ${err.message}`);
    }
  }, { once: true });
}

/**
 * Teste de Morte: botão que executa a macro "Sangrando" do sistema T20.
 * Aparece quando o ator está sangrando com 0 PV ou menos.
 */
function renderTesteMorteButton(message, html) {
  const btn = html.querySelector('[data-action="executar-teste-morte"]');
  if (!btn) return;

  const actorId = message.flags.tormenta20.actorId;
  const tokenId = message.flags.tormenta20.tokenId;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const token = canvas.tokens.get(tokenId);
      const actor = game.actors.get(actorId);

      // Busca macro "Sangrando" (teste de morte do sistema T20)
      const macro =
        game.macros.getName("Sangrando") ??
        game.macros.find((m) => normalizeText(m.name) === "sangrando");

      if (!macro) {
        ui.notifications.warn(
          'Macro "Sangrando" não encontrada. Execute o Teste de Morte manualmente.',
        );
        btn.disabled = false;
        return;
      }

      await macro.execute({ actor, token: token?.document ?? token });
    } catch (err) {
      console.error("T20 | Erro ao executar Teste de Morte:", err);
      ui.notifications.error(`Erro ao executar Teste de Morte: ${err.message}`);
      btn.disabled = false;
    }
  }, { once: true });
}

/**
 * Confuso: botão "Rolar 1d6 (Confusão)"
 */
function renderConfusoButtons(message, html) {
  const rolarBtn = html.querySelector('[data-action="rolar-confusao"]');
  if (!rolarBtn) return;

  const tokenId = message.flags.tormenta20.tokenId;
  const effectId = message.flags.tormenta20.effectId;
  const token = canvas.tokens.get(tokenId);
  const actor = token?.actor ?? game.actors.get(message.flags.tormenta20.actorId);
  if (!actor) return;

  const actorName = message.speaker?.alias ?? actor.name;

  rolarBtn.addEventListener("click", async () => {
    rolarBtn.disabled = true;
    try {
      await executeConfusoRoll(actor, { id: effectId }, actorName);
    } catch (err) {
      console.error("T20 | Erro ao rolar Confusão:", err);
      ui.notifications.error(`Erro ao rolar Confusão: ${err.message}`);
    }
  }, { once: true });
}
