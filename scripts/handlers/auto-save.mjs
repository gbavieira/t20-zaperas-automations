/* ============================================================
   T20 Automações — Handler: Teste de Resistência Automático

   Quando uma magia/poder com teste de resistência é usada e o
   conjurador tem alvos marcados (targeted), abre automaticamente
   um prompt para o jogador (ou GM) do alvo rolar o teste.

   Para magias de ÁREA (com template): em vez de rolar imediatamente,
   aguarda o template ser colocado no mapa e então rola para os
   alvos selecionados naquele momento.

   CRÍTICO: Este handler roda em TODOS os clients (não só GM).
   Cada client processa apenas os tokens que controla.
   ============================================================ */

import {
  parseSaveType,
  extractCD,
  extractItemName,
  extractResistenciaTxt,
  promptSavesForTargets,
  waitForAreaTemplate,
} from "../utils/saves.mjs";

import { MOD } from "../config.mjs";

export async function handleAutoSave(message) {
  const itemData = message.flags?.tormenta20?.itemData;
  const content = message.content || "";

  let resistTxt = itemData?.resistencia?.txt;
  if (!resistTxt) {
    resistTxt = extractResistenciaTxt(content);
  }
  if (!resistTxt) return;

  const saveType = parseSaveType(resistTxt);
  if (!saveType) return;

  // Prioridade: CD do HTML renderizado (valor final com todos os bônus aplicados pelo sistema)
  // Fallback: CD da flag do item (valor base, pode não refletir poderes ou atributo customizado)
  let cd = extractCD(content);
  if (!cd) cd = Number(itemData?.resistencia?.cd) || null;
  if (!cd) return;

  const authorId = message.author?.id ?? message.user;
  const author = game.users.get(authorId);
  if (!author) return;

  const spellName = extractItemName(content);
  const casterName = message.speaker?.alias || "???";
  const showCD = game.settings.get(MOD, "autoSaveShowCD");

  const hasTemplate = message.getFlag("tormenta20", "template");
  if (hasTemplate) {
    waitForAreaTemplate(message, async (targets) => {
      await promptSavesForTargets(
        targets,
        saveType,
        cd,
        spellName,
        casterName,
        message,
        showCD,
      );
    });
    return;
  }

  const targets = author.targets;
  if (!targets?.size) return;

  await promptSavesForTargets(
    targets,
    saveType,
    cd,
    spellName,
    casterName,
    message,
    showCD,
  );
}
