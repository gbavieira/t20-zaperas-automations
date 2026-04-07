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

import { normalizeText } from "../utils/text.mjs";

// ── Helpers específicos deste handler ────────────────────────

function parseSaveType(txt) {
	const normalized = normalizeText(txt);
	if (normalized.includes("fortitude")) return "fort";
	if (normalized.includes("reflexo")) return "refl";
	if (normalized.includes("vontade")) return "vont";
	return null;
}

function extractCD(html) {
	const match = html.match(/CD\s+(\d+)/);
	return match ? Number(match[1]) : null;
}

function extractItemName(html) {
	const div = document.createElement("div");
	div.innerHTML = html;
	return div.querySelector(".item-name")?.textContent?.trim() || "???";
}

function extractResistenciaTxt(html) {
	const div = document.createElement("div");
	div.innerHTML = html;
	const text = div.querySelector(".card-item-header")?.textContent || "";
	const match = text.match(/Resistência:\s*([^(;]+)/i);
	return match ? match[1].trim() : null;
}

function shouldCurrentUserRoll(actor) {
	const playerOwner = game.users.find((u) => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"));
	if (playerOwner) {
		return game.user.id === playerOwner.id;
	}
	return game.user.isGM;
}

async function applyEffectsToActor(actor, effects) {
	if (!effects?.length) return;

	for (const chatEffect of effects) {
		if (!chatEffect) continue;

		const effectArray = Array.isArray(chatEffect) ? chatEffect : [chatEffect];
		if (!effectArray.length) continue;

		if (effectArray[0]?.duration?.seconds) {
			effectArray[0].duration.startTime = game.time.worldTime;
		}

		await actor.createEmbeddedDocuments("ActiveEffect", [...effectArray], {
			toChat: true
		});
	}
}

/**
 * Rola o teste de resistência, compara com a CD e posta resultado no chat.
 * Reutilizável por qualquer handler (auto-save, area-save, etc.).
 */
export async function rollSaveAndReport(token, saveType, cd, spellName, casterName, originalMessage = null) {
	const actor = token.actor;
	if (!actor) return;

	const pericia = actor.system.pericias?.[saveType];
	if (!pericia) return;

	const saveLabel = pericia.label || saveType;

	const roll = await actor.rollPericia(saveType, {
		event: new Event("click"),
		message: false
	});
	if (!roll) return;

	const total = roll.total;
	const success = total >= cd;
	const rollHTML = await roll.render();

	await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor, token: token.document ?? token }),
		rolls: [roll],
		content: `
			<div class="tormenta20 chat-card item-card">
				<header class="card-header flexrow">
					<h3 class="item-name">
						<div>Teste de ${saveLabel}</div>
					</h3>
				</header>
				<div class="card-content">
					<p><b>${actor.name}</b> vs <b>${spellName}</b>
					   de <b>${casterName}</b></p>
				</div>
				<div class="roll">${rollHTML}</div>
				<div class="t20-result-banner ${success ? "success" : "failure"}">
					${success ? "✓ SUCESSO" : "✗ FALHA"} &nbsp; (${total} vs CD ${cd})
				</div>
			</div>
		`
	});

	// Em caso de FALHA: aplica efeitos automaticamente se o alvo estiver vivo
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

async function promptSaveRoll(token, saveType, cd, spellName, casterName, originalMessage) {
	const actor = token.actor;
	if (!actor) return;

	const pericia = actor.system.pericias?.[saveType];
	if (!pericia) return;

	const saveLabel = pericia.label || saveType;

	const confirmed = await foundry.applications.api.DialogV2.wait({
		window: {
			title: `Teste de Resistência — ${actor.name}`,
			icon: "fa-solid fa-shield-halved"
		},
		content: `
      <div style="margin: 8px 0; font-size: 0.95em;">
        <p><b>${casterName}</b> usou <b>${spellName}</b>!</p>
        <p><b>${actor.name}</b> precisa fazer um teste de
           <b>${saveLabel}</b> (CD ${cd}).</p>
      </div>
    `,
		buttons: [
			{
				action: "roll",
				icon: "fas fa-dice-d20",
				label: `Rolar ${saveLabel}`,
				callback: () => true
			},
			{
				action: "cancel",
				icon: "fas fa-times",
				label: "Cancelar",
				callback: () => false
			}
		]
	});

	if (!confirmed) return;

	await rollSaveAndReport(token, saveType, cd, spellName, casterName, originalMessage);
}

// ── Lógica de área (template) ──────────────────────────────

/**
 * Aguarda o template ser colocado no mapa e então rola os testes
 * de resistência para os alvos dentro da área.
 * Usa hook one-shot em createMeasuredTemplate.
 */
function waitForAreaTemplate(message, saveType, cd, spellName, casterName) {
	const authorId = message.author?.id ?? message.user;

	const hookId = Hooks.on("createMeasuredTemplate", async (templateDoc) => {
		const templateAuthor = templateDoc.author?.id ?? templateDoc.user;
		if (templateAuthor !== authorId) return;

		// Remove hook one-shot
		Hooks.off("createMeasuredTemplate", hookId);

		// Aguarda targets estarem disponíveis após posicionamento
		await new Promise((r) => setTimeout(r, 150));

		const user = game.users.get(authorId);
		const targets = [...(user?.targets ?? [])];
		if (!targets.length) return;

		for (const target of targets) {
			const actor = target.actor;
			if (!actor) continue;
			if (!shouldCurrentUserRoll(actor)) continue;
			await promptSaveRoll(target, saveType, cd, spellName, casterName, message);
		}
	});

	// Timeout: remove hook se template nunca for criado (5 min)
	setTimeout(() => Hooks.off("createMeasuredTemplate", hookId), 300000);
}

// ── Handler principal ───────────────────────────────────────

/**
 * Handler de createChatMessage para testes de resistência automáticos.
 * RODA EM TODOS OS CLIENTS — cada client processa os tokens que controla.
 *
 * Para magias de área (com template): aguarda o template ser colocado
 * antes de rolar os testes.
 */
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

	let cd = Number(itemData?.resistencia?.cd);
	if (!cd || isNaN(cd)) {
		cd = extractCD(content);
	}
	if (!cd) return;

	const authorId = message.author?.id ?? message.user;
	const author = game.users.get(authorId);
	if (!author) return;

	const spellName = extractItemName(content);
	const casterName = message.speaker?.alias || "???";

	// Se a magia tem template de área, esperar o template ser colocado
	const hasTemplate = message.getFlag("tormenta20", "template");
	if (hasTemplate) {
		waitForAreaTemplate(message, saveType, cd, spellName, casterName);
		return;
	}

	// Fluxo normal (sem área): usa targets atuais do autor
	const targets = author.targets;
	if (!targets?.size) return;

	for (const target of targets) {
		const actor = target.actor;
		if (!actor) continue;

		if (!shouldCurrentUserRoll(actor)) continue;

		await promptSaveRoll(target, saveType, cd, spellName, casterName, message);
	}
}
