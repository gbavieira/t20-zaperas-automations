/* ============================================================
   T20 Automações — Handler: Teste de Resistência Automático (Itens)

   Estende a automação de testes de resistência para itens alquímicos
   (bombas, fogo alquímico, venenos, etc.).

   Estrutura real das flags do sistema T20 (validada via console):
   - `flags.tormenta20.itemData.tipo === "alchemy"` → tipo do item
   - `flags.tormenta20.itemData.resistencia.atributo` → chave do atributo ("des", "int", etc.)
   - `flags.tormenta20.itemData.resistencia.txt` → texto do save ("Reflexos reduz à metade")
   - `flags.tormenta20.template` → objeto { area, alcance } se tiver área (truthy)

   Para venenos (lista configurável): resistencia.atributo e txt estão vazios,
   então usamos Fortitude + Int como regra fixa.

   CD = 10 + ⌊nível/2⌋ + modificador do atributo-chave do aplicador.

   CRÍTICO: Roda em TODOS os clients. Cada client processa apenas os
   tokens que controla.
   ============================================================ */

import { normalizeText } from "../utils/text.mjs";
import {
	parseSaveType,
	shouldCurrentUserRoll,
	promptSaveRoll,
	waitForAreaTemplate,
	extractItemName
} from "../utils/saves.mjs";

const MOD = "t20-zaperas-automations";

// ── Atributo-chave → tipo de save (fallback quando txt está vazio) ─

const SAVE_BY_ATTR = {
	for: "fort",
	con: "fort",
	des: "refl",
	int: "vont",
	sab: "vont",
	car: "vont"
};

// ── Classificação do item ───────────────────────────────────

/**
 * Determina saveType e keyAttr para este item.
 * Retorna { saveType, keyAttr } ou null se não deve automatizar.
 *
 * Prioridade:
 *   1. Lista de venenos configurada → fort + int
 *   2. itemData.resistencia.atributo preenchido → usa SAVE_BY_ATTR
 *      (txt pode confirmar o saveType via parseSaveType)
 *   3. Nenhum dos dois → null (fail-safe silencioso)
 */
function classifyItem(itemData, resolvedName) {
	const resistencia = itemData?.resistencia;

	// itemData.name não existe nas flags — usa o nome resolvido do HTML
	const poisonList = game.settings.get(MOD, "itemAutoSavePoisons") ?? [];
	const normalizedName = normalizeText(resolvedName);
	const isPoison = poisonList.some(
		(p) => normalizeText(p.name ?? p) === normalizedName
	);

	if (isPoison) {
		return { saveType: "fort", keyAttr: "int" };
	}

	// O sistema T20 preenche resistencia.atributo com a chave do atributo ("des", "int", etc.)
	const keyAttr = resistencia?.atributo?.toLowerCase();
	if (!keyAttr) return null; // fail-safe: sem atributo definido, sem prompt

	// Tenta confirmar saveType pelo texto descritivo ("Reflexos", "Fortitude", "Vontade")
	let saveType = null;
	if (resistencia?.txt) {
		saveType = parseSaveType(resistencia.txt);
	}
	// Fallback: deriva pelo atributo
	if (!saveType) {
		saveType = SAVE_BY_ATTR[keyAttr] ?? "refl";
	}

	return { saveType, keyAttr };
}

// ── Cálculo de CD ───────────────────────────────────────────

/**
 * CD = 10 + ⌊nível/2⌋ + modificador do atributo-chave do aplicador.
 * Em T20, system.atributos.[key].value já é o modificador direto.
 */
function computeCD(casterActor, keyAttr) {
	if (!casterActor) return null;

	const level = Number(casterActor.system?.attributes?.nivel?.value ?? 1);
	const attrMod = Number(casterActor.system?.atributos?.[keyAttr]?.value ?? 0);

	return 10 + Math.floor(level / 2) + attrMod;
}

// ── Resolução do ator aplicador ─────────────────────────────

function getCasterActor(message) {
	const speaker = message.speaker;
	if (speaker?.token) {
		const token = canvas.tokens?.get(speaker.token);
		if (token?.actor) return token.actor;
	}
	if (speaker?.actor) return game.actors.get(speaker.actor) ?? null;
	return null;
}

// ── Handler principal ───────────────────────────────────────

export async function handleItemAutoSave(message) {
	const flags = message.flags?.tormenta20;
	if (!flags) return;

	const itemData = flags.itemData;
	if (!itemData) return;

	// Filtra: apenas itens alquímicos (tipo "alchemy" no sistema T20)
	if (itemData.tipo !== "alchemy") return;

	// Nome vem do HTML (itemData.name não é serializado pelo sistema T20)
	const itemName = extractItemName(message.content || "") || "???";

	const classification = classifyItem(itemData, itemName);
	if (!classification) return; // fail-safe silencioso

	const { saveType, keyAttr } = classification;

	const casterActor = getCasterActor(message);
	const cd = computeCD(casterActor, keyAttr);
	if (!cd) return;

	const authorId = message.author?.id ?? message.user;
	const author = game.users.get(authorId);
	if (!author) return;
	const casterName = message.speaker?.alias || "???";
	const showCD = game.settings.get(MOD, "itemAutoSaveShowCD");

	// Template de área: flags.tormenta20.template é um objeto { area, alcance } quando presente
	const hasTemplate = flags.template;
	if (hasTemplate) {
		waitForAreaTemplate(message, async (targets) => {
			for (const target of targets) {
				const actor = target.actor;
				if (!actor) continue;
				if (!shouldCurrentUserRoll(actor)) continue;
				await promptSaveRoll(target, saveType, cd, itemName, casterName, message, showCD);
			}
		});
		return;
	}

	// Sem área: usa targets marcados no canvas
	const targets = author.targets;
	if (!targets?.size) return;

	for (const target of targets) {
		const actor = target.actor;
		if (!actor) continue;
		if (!shouldCurrentUserRoll(actor)) continue;
		await promptSaveRoll(target, saveType, cd, itemName, casterName, message, showCD);
	}
}
