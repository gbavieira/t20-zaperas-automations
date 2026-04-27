/* ============================================================
   T20 Automações — Utils: Testes de Resistência

   Funções compartilhadas entre os handlers de testes de resistência
   (magias/poderes em auto-save.mjs e itens em item-auto-save.mjs).
   ============================================================ */

import { normalizeText } from "./text.mjs";

// ── Parsing / extração ──────────────────────────────────────

export function parseSaveType(txt) {
  const normalized = normalizeText(txt);
  if (normalized.includes("fortitude")) return "fort";
  if (normalized.includes("reflexo")) return "refl";
  if (normalized.includes("vontade")) return "vont";
  return null;
}

export function extractCD(html) {
  const match = html.match(/CD\s+(\d+)/);
  return match ? Number(match[1]) : null;
}

export function extractItemName(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.querySelector(".item-name")?.textContent?.trim() || "???";
}

export function extractResistenciaTxt(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = div.querySelector(".card-item-header")?.textContent || "";
  const match = text.match(/Resistência:\s*([^(;]+)/i);
  return match ? match[1].trim() : null;
}

// ── Permissões ──────────────────────────────────────────────

export function shouldCurrentUserRoll(actor) {
  const playerOwner = game.users.find(
    (u) => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"),
  );
  if (playerOwner) {
    return game.user.id === playerOwner.id;
  }
  return game.user.isGM;
}

// ── Aplicação de efeitos ────────────────────────────────────

export async function applyEffectsToActor(actor, effects) {
  if (!effects?.length) return;

  for (const chatEffect of effects) {
    if (!chatEffect) continue;

    const effectArray = Array.isArray(chatEffect) ? chatEffect : [chatEffect];
    if (!effectArray.length) continue;

    if (effectArray[0]?.duration?.seconds) {
      effectArray[0].duration.startTime = game.time.worldTime;
    }

    await actor.createEmbeddedDocuments("ActiveEffect", [...effectArray], {
      toChat: true,
    });
  }
}

// ── Rolagem e resultado ─────────────────────────────────────

/**
 * Rola o teste de resistência, compara com a CD e posta resultado no chat.
 * Aplica efeitos da mensagem original no alvo em caso de falha (se alvo vivo).
 */
export async function rollSaveAndReport(
  token,
  saveType,
  cd,
  itemName,
  casterName,
  originalMessage = null,
  showCD = true,
) {
  const actor = token.actor;
  if (!actor) return;

  const pericia = actor.system.pericias?.[saveType];
  if (!pericia) return;

  const saveLabel = pericia.label || saveType;

  const roll = await actor.rollPericia(saveType, {
    event: new Event("click"),
    message: false,
  });
  if (!roll) return;

  const total = roll.total;
  const success = total >= cd;
  const rollHTML = await roll.render();

  const content = await renderTemplate(
    `modules/t20-zaperas-automations/templates/auto-save/result.hbs`,
    {
      saveLabel,
      actorName: actor.name,
      spellName: itemName,
      casterName,
      rollHTML,
      bannerClass: success ? "success" : "failure",
      bannerIcon: success ? "✓" : "✗",
      bannerText: success ? "SUCESSO" : "FALHA",
      total,
      cd,
      showCD,
    },
  );

  const visibility = originalMessage
    ? {
        whisper: [...(originalMessage.whisper ?? [])],
        blind: originalMessage.blind ?? false,
      }
    : {};
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor, token: token.document ?? token }),
    rolls: [roll],
    content,
    ...visibility,
  });

  if (!success && originalMessage) {
    const currentPV = Number(actor.system?.attributes?.pv?.value ?? 0);
    if (currentPV > 0) {
      const effects = originalMessage.flags?.tormenta20?.effects;
      if (effects?.length) {
        await applyEffectsToActor(actor, effects);
      }
    }
  }
}

/**
 * Itera tokens-alvo, filtra por permissão e dispara o prompt de save.
 * Encapsula o loop duplicado em auto-save.mjs e item-auto-save.mjs.
 */
export async function promptSavesForTargets(
  targets,
  saveType,
  cd,
  itemName,
  casterName,
  message,
  showCD,
) {
  for (const target of targets) {
    const actor = target.actor;
    if (!actor) continue;
    if (!shouldCurrentUserRoll(actor)) continue;
    await promptSaveRoll(
      target,
      saveType,
      cd,
      itemName,
      casterName,
      message,
      showCD,
    );
  }
}

export async function promptSaveRoll(
  token,
  saveType,
  cd,
  itemName,
  casterName,
  originalMessage,
  showCD = true,
) {
  const actor = token.actor;
  if (!actor) return;

  const pericia = actor.system.pericias?.[saveType];
  if (!pericia) return;

  const saveLabel = pericia.label || saveType;

  const content = await renderTemplate(
    `modules/t20-zaperas-automations/templates/auto-save/prompt.hbs`,
    {
      casterName,
      spellName: itemName,
      actorName: actor.name,
      saveLabel,
      cd,
      showCD,
    },
  );

  const confirmed = await foundry.applications.api.DialogV2.wait({
    window: {
      title: `Teste de Resistência — ${actor.name}`,
      icon: "fa-solid fa-shield-halved",
    },
    content,
    buttons: [
      {
        action: "roll",
        icon: "fas fa-dice-d20",
        label: `Rolar ${saveLabel}`,
        callback: () => true,
      },
      {
        action: "cancel",
        icon: "fas fa-times",
        label: "Cancelar",
        callback: () => false,
      },
    ],
  });

  if (!confirmed) return;

  await rollSaveAndReport(
    token,
    saveType,
    cd,
    itemName,
    casterName,
    originalMessage,
    showCD,
  );
}

// ── Esperar template de área ────────────────────────────────

/**
 * Aguarda um template ser colocado no mapa pelo autor da mensagem e então
 * invoca `onTargets(targets, message)` com a lista de tokens alvo.
 *
 * Uso típico: handler chama esta função ao detectar `flags.tormenta20.template`
 * e o callback faz o que for específico (rolar saves, calcular CD por item, etc.).
 */
export function waitForAreaTemplate(message, onTargets) {
  const authorId = message.author?.id ?? message.user;

  const hookId = Hooks.on("createMeasuredTemplate", async (templateDoc) => {
    const templateAuthor = templateDoc.author?.id ?? templateDoc.user;
    if (templateAuthor !== authorId) return;

    Hooks.off("createMeasuredTemplate", hookId);

    await new Promise((r) => setTimeout(r, 150));

    const user = game.users.get(authorId);
    const targets = [...(user?.targets ?? [])];
    if (!targets.length) return;

    await onTargets(targets, message);
  });

  setTimeout(() => Hooks.off("createMeasuredTemplate", hookId), 300000);
}
