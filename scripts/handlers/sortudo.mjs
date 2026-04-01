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
 * - Tem rolagem com d20
 * - Não é rolagem de dano nem de ataque
 * - Não é card de item de ataque (arma, equipamento, poder)
 * - Não é mensagem de reroll "(Sortudo)"
 * - Ainda não usou Sortudo nesta mensagem
 */
function isSortudoEligible(message) {
	if (!message.rolls?.length) return false;

	const roll = message.rolls[0];
	// Deve ter um d20 (usa roll.dice para não depender da posição na fórmula)
	const hasD20 = roll.dice?.some((d) => d.faces === 20);
	if (!hasD20) return false;

	// Não pode ser dano
	if (roll.options?.type === "damage") return false;
	// Não pode ser ataque explícito
	if (roll.options?.type === "attack") return false;

	// Não pode ser item de ataque (arma, equipamento, poder)
	const itemData = message.flags?.tormenta20?.itemData;
	if (itemData?.type && itemData.type !== "pericia") return false;

	// Se a mensagem tem roll de dano, é card de ataque
	if (message.rolls.some((r) => r.options?.type === "damage")) return false;

	// Não pode ter sido usado nesta mensagem
	if (message.getFlag(MOD, "sortudoUsed")) return false;

	// Não mostrar em mensagens de reroll "(Sortudo)"
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
export function renderSortudo(message, html) {
	if (!isSortudoEligible(message)) return;

	const actor = getMessageActor(message);
	if (!actor || !hasSortudo(actor)) return;

	// Só o autor da mensagem ou o GM podem ver e usar o botão
	if (!message.isAuthor && !game.user.isGM) return;

	const btn = document.createElement("div");
	btn.style.cssText = "padding: 4px 6px 2px;";
	btn.innerHTML = `
    <button type="button" class="t20-sortudo-btn" style="
      background: #4a0060;
      color: #e8d0ff;
      border: 1px solid #7a2090;
      border-radius: 4px;
      width: 100%;
      font-family: 'Signika', sans-serif;
      cursor: pointer;
      padding: 4px 8px;
    ">
      <i class="fas fa-dice"></i> Usar Sortudo (3 PM)
    </button>
  `;

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

	// Incluir headerTitle no content para que testes opostos detectem o trigger
	const content = `<div class="tormenta20 chat-card"><header class="card-header flexrow"><h3 class="item-name" style="flex:1; border: none;"><div>${headerTitle}</div></h3></header></div>`;

	await newRoll.toMessage({
		speaker: message.speaker,
		flavor,
		content,
		flags: { tormenta20: { rollType: "pericia" } }
	});

	ui.notifications.info(`${actor.name} usou Sortudo!`);
}
