/* ============================================================
   T20 Automações — Handler: Dreno de Vida

   Para magias/poderes configurados em LIFE_DRAIN_SPELLS,
   substitui os botões de dano (1x, 2x, ½) por botões que
   aplicam dano no(s) alvo(s) E curam o atacante por uma
   porcentagem do dano efetivo causado. Efeito visual via Sequencer.

   O botão de cura (-1) não é alterado.

   Hook: renderChatMessageHTML (roda APÓS hooks.mjs criar botões)
   ============================================================ */

import { LIFE_DRAIN_SPELLS } from "../config.mjs";
import { normalizeText } from "../utils/text.mjs";

// ── Helpers ──────────────────────────────────────────────────

/** Encontra config de drain para o nome do item, ou null */
function findDrainConfig(itemName) {
	if (!itemName) return null;
	const normalized = normalizeText(itemName);
	return LIFE_DRAIN_SPELLS.find((s) => normalizeText(s.name) === normalized) ?? null;
}

/**
 * Extrai o roll de dano correspondente ao elemento .roll,
 * replicando a lógica de _onChatApplyDamage em chat.mjs.
 */
function findDamageRoll(message, rollEl) {
	const rollTitle = rollEl.dataset.rollTitle;
	return message.rolls.find(
		(r) => r.options.title === rollTitle && (!r.options.type || r.options.type === "damage")
	);
}

// ── Click handler ────────────────────────────────────────────

async function handleDrainClick(event, message, config, multiplier) {
	event.preventDefault();
	event.stopPropagation();

	const btn = event.currentTarget;
	const rollEl = btn.closest(".roll");
	const amount = Number(rollEl.querySelector(".dice-total").innerText);
	if (!amount) return;

	// Verifica se há tokens selecionados (alvos)
	const targets = canvas.tokens.controlled;
	if (!targets.length) {
		ui.notifications.warn("Selecione um ou mais tokens para aplicar o dano.");
		return;
	}

	// Encontra o roll object para usar applyDamageV2
	const roll = findDamageRoll(message, rollEl);

	// 1) Aplica dano nos alvos (mesma lógica do sistema, com multiplicador)
	await Promise.all(
		targets.map((tk) => {
			if (roll) return tk.actor.applyDamageV2(roll, multiplier);
			return tk.actor.applyDamage(amount, multiplier, true);
		})
	);

	// 2) Calcula cura: dano base * multiplicador * porcentagem de drain
	const effectiveDamage = Math.floor(amount * multiplier);
	const healing = Math.floor(effectiveDamage * config.healPercent / 100);
	if (healing <= 0) return;

	// 3) Obtém o atacante (token/actor do speaker)
	const attackerToken = canvas.tokens.get(message.speaker?.token);
	const attackerActor = attackerToken?.actor ?? game.actors.get(message.speaker?.actor);
	if (!attackerActor) {
		ui.notifications.warn("Não foi possível encontrar o atacante para curar.");
		return;
	}

	// 4) Cura o atacante (sem ultrapassar PV máximo)
	const pv = attackerActor.system.attributes.pv;
	const newPV = Math.min(pv.value + healing, pv.max);
	await attackerActor.update({ "system.attributes.pv.value": newPV });

	// 5) Efeito visual via Sequencer (se disponível)
	if (game.modules.get("sequencer")?.active && attackerToken) {
		for (const target of targets) {
			new Sequence()
				.effect()
				.atLocation(target)
				.stretchTo(attackerToken)
				.file(config.sequencerFile ?? "jb2a.energy_beam.normal.dark_red")
				.play();
		}
	}

	// 6) Notificação
	const attackerName = attackerToken?.name ?? attackerActor.name;
	ui.notifications.info(`${attackerName} curou ${healing} PV com ${config.name}!`);
}

// ── Render hook ──────────────────────────────────────────────

/**
 * Chamado em renderChatMessageHTML — APÓS hooks.mjs criar os botões.
 * Detecta magias de drain e substitui TODOS os botões de dano (1x, 2x, ½)
 * por botões de drain que curam o atacante proporcionalmente.
 * O botão de cura (-1) não é alterado.
 *
 * @param {ChatMessage} message  documento da mensagem
 * @param {HTMLElement} html     elemento DOM renderizado
 */
export function renderLifeDrain(message, html) {
	// Extrai nome do item do card
	const itemName = html.querySelector(".item-name")?.textContent?.trim();
	const config = findDrainConfig(itemName);
	if (!config) return;

	// Encontra todos os blocos de roll de dano
	const damageRolls = html.querySelectorAll(".roll.roll--dano");
	if (!damageRolls.length) return;

	for (const rollEl of damageRolls) {
		// Substitui cada botão de dano (exceto cura -1)
		const dmgButtons = rollEl.querySelectorAll(".apply-dmg");
		for (const originalBtn of dmgButtons) {
			const mod = Number(originalBtn.dataset.mod);
			// Ignora o botão de cura
			if (mod < 0) continue;

			// Cria botão de drain com mesmo conteúdo visual
			const drainBtn = document.createElement("button");
			drainBtn.className = "apply-dmg-drain";
			drainBtn.dataset.mod = String(mod);
			drainBtn.innerHTML = originalBtn.innerHTML;

			// Tooltip descritivo
			const modLabel = mod === 1 ? "" : mod === 2 ? " em dobro" : " (metade)";
			drainBtn.title = `Aplicar dano${modLabel} e curar atacante`;

			// Registra click handler com o multiplicador correto
			drainBtn.addEventListener("click", (event) => handleDrainClick(event, message, config, mod));

			// Substitui o botão original
			originalBtn.replaceWith(drainBtn);
		}
	}
}
