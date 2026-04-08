/* ============================================================
   T20 Automações — Handler: Poder Sortudo

   Quando um ator com o poder "Sortudo" faz um teste de perícia
   (rolagem com d20), adiciona um botão ao card do chat permitindo
   rerolar gastando 3 PM. O botão desaparece após o uso.

   Integração: renderChatMessageHTML
   ============================================================ */

import { normalizeText } from "../utils/text.mjs";

const MOD = "t20-zaperas-automations";

/**
 * Detecta se a mensagem é um teste de perícia elegível para Sortudo.
 */
function isSortudoEligible(message) {
	if (!message.rolls?.length) return false;

	const roll = message.rolls[0];

	const hasD20 = roll.dice?.some((d) => d.faces === 20)
		|| roll.formula?.includes("d20");
	if (!hasD20) return false;

	if (roll.options?.type === "damage") return false;
	// NÃO checar roll.options.type === "attack" — o sistema T20 marca TODAS
	// as rolagens d20 (incluindo perícias) como "attack" internamente.
	// Ataques reais são detectados pela presença de rolls de dano na mensagem.

	const itemData = message.flags?.tormenta20?.itemData;
	if (itemData?.type && itemData.type !== "pericia") return false;

	if (message.rolls.some((r) => r.options?.type === "damage")) return false;

	if (message.getFlag(MOD, "sortudoUsed")) return false;

	const flavor = message.flavor ?? "";
	if (flavor.includes("(Sortudo)")) return false;

	return true;
}

/**
 * Retorna o ator vinculado à mensagem, ou null.
 */
function getMessageActor(message) {
	const actorId = message.speaker?.actor;
	if (!actorId) return null;
	return game.actors.get(actorId) ?? null;
}

/**
 * Verifica se o ator tem o poder Sortudo.
 */
function hasSortudo(actor) {
	return actor.items.some((i) => normalizeText(i.name).includes("sortudo"));
}

/**
 * Injeta o botão de Sortudo no card de chat.
 * Chamado em renderChatMessageHTML — html é DOM puro.
 */
export async function renderSortudo(message, html) {
	if (!isSortudoEligible(message)) return;

	const actor = getMessageActor(message);
	if (!actor || !hasSortudo(actor)) return;

	if (!message.isAuthor && !game.user.isGM) return;

	const btnHTML = await renderTemplate(
		`modules/t20-zaperas-automations/templates/sortudo/button.hbs`,
		{}
	);

	const btn = document.createElement("div");
	btn.className = "t20-sortudo-wrapper";
	btn.innerHTML = btnHTML;

	btn.querySelector("button").addEventListener("click", (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		handleSortudoClick(message, actor, btn);
	});

	html.appendChild(btn);
}

/**
 * Lógica executada ao clicar no botão de Sortudo.
 */
async function handleSortudoClick(message, actor, btnContainer) {
	const pm = actor.system?.attributes?.pm?.value ?? 0;
	if (pm < 3) {
		return ui.notifications.warn(`${actor.name} não tem PM suficiente para usar Sortudo (necessário: 3).`);
	}

	// 1. Flag primeiro — impede re-render de recriar o botão
	await message.setFlag(MOD, "sortudoUsed", true);
	// 2. Remover do DOM atual
	btnContainer.remove();

	// 3. Gastar 3 PM
	await actor.update({ "system.attributes.pm.value": pm - 3 });

	// Rerolar com a mesma fórmula
	const oldRoll = message.rolls[0];
	const newRoll = await new Roll(oldRoll.formula).evaluate();

	// Efeito visual via Sequencer (se disponível)
	if (typeof Sequence !== "undefined") {
		const token =
			canvas.tokens.get(message.speaker?.token) ?? canvas.tokens.controlled[0];
		if (token) {
			new Sequence()
				.effect()
				.file("jb2a.magic_signs.circle.02.evocation.intro.yellow")
				.atLocation(token)
				.scale(0.4)
				.play();
		}
	}

	// Montar flavor com nome do teste original
	const div = document.createElement("div");
	div.innerHTML = message.content;
	const headerTitle =
		div.querySelector(".card-header h3, .item-name")?.textContent?.trim() || "Teste";
	const flavor = `<strong>${headerTitle} (Sortudo)</strong>`;

	// Renderizar o dado para incluir no content (sem isso o roll não aparece)
	const rollHTML = await newRoll.render();

	// Content com header (para testes opostos), card-content vazio (evita crash
	// no _onChatCardToggleContent do sistema) e o roll renderizado
	const content = await renderTemplate(
		`modules/t20-zaperas-automations/templates/sortudo/card.hbs`,
		{ headerTitle, rollHTML }
	);

	await newRoll.toMessage({
		speaker: message.speaker,
		flavor,
		content,
		flags: { tormenta20: { rollType: "pericia" } }
	});

	console.log(`T20 Zapera | ${actor.name} usou Sortudo (3 PM)`);
}
