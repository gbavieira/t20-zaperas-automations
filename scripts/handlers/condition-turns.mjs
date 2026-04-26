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

import { ZERO_PV_CONDITIONS } from "../config.mjs";

const MOD = "t20-zaperas-automations";
const CONDITION_TURNS_FLAG = "conditionTurnsPrompt";

// ── Mapeamento de statusIds (verificar nomes exatos em CONFIG.T20.conditions) ─

const CONDITION_STATUS_IDS = {
	emChamas: "emChamas", // TODO: verificar nome exato em runtime
	sangrando: "sangrando",
	confuso: "confuso" // TODO: verificar nome exato em runtime
};

// ── Tabela de efeitos para Confuso ───────────────────────────

const CONFUSO_EFFECTS = {
	1: "Move-se para uma direção aleatória (rola 1d8: N, NE, L, SE, S, SO, O, NO)",
	2: "Não pode fazer ações, balbuciando incoerentemente",
	3: "Não pode fazer ações, balbuciando incoerentemente",
	4: "Ataca a criatura mais próxima com a arma empunhada",
	5: "Ataca a criatura mais próxima com a arma empunhada",
	6: "A confusão passou — age normalmente"
};

const DIRECTIONS_1D8 = [
	"Norte",
	"Nordeste",
	"Leste",
	"Sudeste",
	"Sul",
	"Sudoeste",
	"Oeste",
	"Noroeste"
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
	if (game.userId !== userId) return;
	if (combat.round < 1) return;
	if (!("turn" in data || "round" in data)) return;

	const combatant = combat.combatants.get(combat.current.combatantId);
	const actor = combatant?.actor;
	if (!actor) return;

	const tokenId = combatant.tokenId;
	const token = canvas.tokens?.get(tokenId);
	const actorName = token?.name ?? actor.name;

	// Processa cada efeito ativo, coletando por statusId
	const processedStatuses = new Set();

	for (const effect of [...actor.effects]) {
		for (const status of effect.statuses ?? []) {
			// Evita processar a mesma condição múltiplas vezes por rodada
			if (processedStatuses.has(status) && status === CONDITION_STATUS_IDS.confuso) {
				continue;
			}

			if (status === CONDITION_STATUS_IDS.emChamas) {
				await processEmChamas(actor, effect, actorName, tokenId);
			} else if (status === CONDITION_STATUS_IDS.sangrando) {
				// Sangrando pode ter múltiplos stacks — processa cada um
				await processSangrando(actor, effect, actorName, tokenId);
			} else if (status === CONDITION_STATUS_IDS.confuso) {
				if (!processedStatuses.has(status)) {
					await processConfuso(actor, effect, actorName);
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
			promptClass: "t20-em-chamas-prompt"
		}
	);

	const whisperTo = showPublic ? null : ChatMessage.getWhisperRecipients("GM");

	await ChatMessage.create({
		content,
		speaker: ChatMessage.getSpeaker({ actor }),
		whisper: whisperTo,
		flags: {
			tormenta20: {
				[CONDITION_TURNS_FLAG]: "emChamas",
				actorId: actor.id,
				tokenId,
				effectId: effect.id
			}
		}
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

	const showPublic = game.settings.get(MOD, "conditionTurnsPublic") ?? false;

	const content = await renderTemplate(
		"modules/t20-zaperas-automations/templates/condition-turns/sangrando.hbs",
		{
			actorName,
			promptClass: "t20-sangrando-prompt"
		}
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
				effectId: effect.id
			}
		}
	});
}

/**
 * Confuso: rola 1d6 automaticamente no início do turno.
 * - 1: movimento aleatório (1d8 para direção)
 * - 2–3: não pode agir
 * - 4–5: ataca criatura mais próxima
 * - 6: remove condição
 */
async function processConfuso(actor, effect, actorName) {
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
		{
			actorName,
			result,
			effectText
		}
	);

	const msg = await ChatMessage.create({
		content,
		speaker: ChatMessage.getSpeaker({ actor }),
		rolls,
		flags: {
			tormenta20: {
				[CONDITION_TURNS_FLAG]: "confuso",
				actorId: actor.id,
				effectId: effect.id,
				result
			}
		}
	});

	// Se resultado é 6, remove a condição automaticamente
	if (result === 6) {
		try {
			await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
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

	const el = html instanceof HTMLElement ? html : (html[0] ?? html);

	// Só o GM pode interagir
	if (!game.user.isGM) {
		const buttons = el.querySelectorAll("button[data-action]");
		buttons.forEach((btn) => {
			btn.disabled = true;
		});
		return;
	}

	if (flagValue === "emChamas") {
		renderEmChamasButtons(message, el);
	} else if (flagValue === "sangrando") {
		renderSangrandoButtons(message, el);
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

	const actorId = message.flags.tormenta20.actorId;
	const effectId = message.flags.tormenta20.effectId;
	const actor = game.actors.get(actorId);
	if (!actor) return;

	// Botão: Apagar (remove condição)
	if (apagarBtn) {
		apagarBtn.addEventListener("click", async () => {
			disableButtons();
			try {
				await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);

				await ChatMessage.create({
					content: `<span class="t20-status-msg success"><i class="fas fa-fire"></i> <b>${message.speaker.alias}</b> apagou as chamas!</span>`,
					speaker: ChatMessage.getSpeaker({ actor })
				});
			} catch (err) {
				console.error("T20 | Erro ao remover Em Chamas:", err);
				ui.notifications.error(`Erro ao apagar chamas: ${err.message}`);
			}
		});
	}

	// Botão: Não Apagar (rola dano)
	if (naoApagarBtn) {
		naoApagarBtn.addEventListener("click", async () => {
			disableButtons();
			try {
				const dmgRoll = new Roll("1d6[fogo]");
				await dmgRoll.evaluate();

				// Aplica dano via token (evita ambiguidade com múltiplos tokens)
				const tokenId = message.flags.tormenta20.tokenId;
				const token = canvas.tokens.get(tokenId);
				if (!token) {
					ui.notifications.error("Token não encontrado no mapa.");
					return;
				}

				// Aplicar dano
				if (typeof token.actor.applyDamageV2 === "function") {
					await token.actor.applyDamageV2(dmgRoll, 1);
				} else if (typeof token.actor.applyDamage === "function") {
					await token.actor.applyDamage(dmgRoll.total, 1, true);
				}

				// Mensagem pública com o roll
				await ChatMessage.create({
					content: `<span class="t20-status-msg damage"><i class="fas fa-flame"></i> <b>${token.name}</b> não conseguiu apagar as chamas!</span>`,
					speaker: ChatMessage.getSpeaker({ actor: token.actor }),
					rolls: [dmgRoll]
				});
			} catch (err) {
				console.error("T20 | Erro ao aplicar dano de fogo:", err);
				ui.notifications.error(`Erro ao aplicar dano: ${err.message}`);
			}
		});
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

	const actorId = message.flags.tormenta20.actorId;
	const effectId = message.flags.tormenta20.effectId;
	const actor = game.actors.get(actorId);
	if (!actor) return;

	testBtn.addEventListener("click", async () => {
		disableButtons();
		try {
			// Rola teste de Constituição (CD 15)
			const rollData = actor.getRollData();
			const testRoll = new Roll("1d20 + @con", rollData);
			await testRoll.evaluate();

			const total = testRoll.total;
			const cd = 15;
			const success = total >= cd;

			if (success) {
				// Sucesso: remove condição
				await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);

				await ChatMessage.create({
					content: `<span class="t20-status-msg success"><i class="fas fa-heart-pulse"></i> <b>${message.speaker.alias}</b> conseguiu estancar o sangramento! (${total} vs CD ${cd})</span>`,
					speaker: ChatMessage.getSpeaker({ actor }),
					rolls: [testRoll]
				});
			} else {
				// Falha: aplica dano
				const dmgRoll = new Roll("1d6[perda]");
				await dmgRoll.evaluate();

				const tokenId = message.flags.tormenta20.tokenId;
				const token = canvas.tokens.get(tokenId);
				if (!token) {
					ui.notifications.error("Token não encontrado no mapa.");
					return;
				}

				// Aplicar dano
				if (typeof token.actor.applyDamageV2 === "function") {
					await token.actor.applyDamageV2(dmgRoll, 1);
				} else if (typeof token.actor.applyDamage === "function") {
					await token.actor.applyDamage(dmgRoll.total, 1, true);
				}

				await ChatMessage.create({
					content: `<span class="t20-status-msg damage"><i class="fas fa-droplet"></i> <b>${token.name}</b> continua sangrando! (${total} vs CD ${cd})</span>`,
					speaker: ChatMessage.getSpeaker({ actor: token.actor }),
					rolls: [testRoll, dmgRoll]
				});
			}
		} catch (err) {
			console.error("T20 | Erro ao rolar teste de Constituição:", err);
			ui.notifications.error(`Erro ao rolar teste: ${err.message}`);
		}
	});
}
