/* ============================================================
   T20 Automações — Handler: Testes Opostos (Engine Genérica)

   Substitui 3 scripts (enganação, furtividade auto, intimidação)
   com uma engine data-driven que lê as definições de OPPOSED_CHECKS.

   Modos de defesa:
     "choice" — GM escolhe entre skills (Enganação → Perc ou Intu)
     "fixed"  — skill fixa, GM arrasta atores no picker
     "auto"   — rola todos os tokens do canvas automaticamente
   ============================================================ */

import { OPPOSED_CHECKS } from "../config.mjs";
import { openActorPicker } from "../utils/actor-picker.mjs";
import { buildResultTable, postGMMessage } from "../utils/chat.mjs";
import { rollSkillCheck } from "../utils/rolls.mjs";

// ── Helpers ─────────────────────────────────────────────────

/**
 * Abre Dialog para GM escolher entre skills de defesa.
 * Usado pelo modo "choice" (Enganação → Percepção ou Intuição).
 */
async function promptSkillChoice(check, attackerName, attackerTotal) {
	return new Promise((resolve) => {
		let resolved = false;
		const buttons = {};
		for (const choice of check.defenseChoices) {
			buttons[choice.key] = {
				icon: `<i class="fas ${choice.icon}"></i>`,
				label: choice.label,
				callback: () => {
					resolved = true;
					resolve(choice);
				}
			};
		}
		buttons.cancel = {
			icon: '<i class="fas fa-times"></i>',
			label: "Ignorar",
			callback: () => {
				resolved = true;
				resolve(null);
			}
		};

		new Dialog(
			{
				title: `${check.attackLabel} de ${attackerName} (${attackerTotal})`,
				content: `<p><b>${attackerName}</b> rolou <b>${check.attackLabel}: ${attackerTotal}</b></p>
                <p>Qual perícia para o teste oposto?</p>`,
				buttons,
				default: check.defenseChoices[check.defenseChoices.length - 1]?.key,
				close: () => {
					if (!resolved) resolve(null);
				}
			},
			{ width: 350, classes: ["tormenta20"] }
		).render(true);
	});
}

/**
 * Determina se o defensor passou no teste oposto,
 * levando em conta 20 natural do atacante e do defensor.
 *
 * - Atacante nat 20 → sucesso automático, EXCETO se defensor também nat 20
 * - Defensor nat 20 vs atacante não-nat-20 → defensor vence (comparação normal já favorece)
 * - Caso contrário → comparação de totais
 */
function resolveOpposed(attackerTotal, attackerNat, defenderTotal, defenderNat) {
	if (attackerNat === 20) {
		// Atacante nat 20: defensor só "ganha" se também tirar nat 20
		return defenderNat === 20;
	}
	return defenderTotal >= attackerTotal;
}

/**
 * Rola defesa para atores selecionados (modo "fixed" e "choice").
 */
async function rollSelectedActors(actorIds, defenseKey, attackerTotal, attackerNat) {
	const results = [];
	for (const id of actorIds) {
		const actor = game.actors.get(id);
		if (!actor) continue;

		const result = await rollSkillCheck(actor, defenseKey);
		if (!result) continue;

		const token = actor.getActiveTokens()[0];
		results.push({
			name: actor.name,
			actorId: actor.id,
			tokenId: token?.id ?? null,
			total: result.total,
			bonus: result.bonus,
			nat: result.nat,
			passed: resolveOpposed(attackerTotal, attackerNat, result.total, result.nat)
		});
	}
	return results;
}

/**
 * Rola defesa para todos os tokens no canvas (modo "auto").
 * Exclui o token do speaker (quem rolou o ataque).
 */
async function rollAllCanvasTokens(message, defenseKey, attackerTotal, attackerNat) {
	const speakerTokenId = message.speaker?.token;
	const speakerActorId = message.speaker?.actor;

	const tokens = canvas.tokens.placeables.filter((t) => {
		if (!t.actor) return false;
		if (!t.actor.system?.pericias?.[defenseKey]) return false;
		if (speakerTokenId && t.id === speakerTokenId) return false;
		if (!speakerTokenId && t.actor.id === speakerActorId) return false;
		return true;
	});

	const results = [];
	for (const token of tokens) {
		const result = await rollSkillCheck(token.actor, defenseKey);
		if (!result) continue;

		results.push({
			name: token.name,
			tokenId: token.id,
			total: result.total,
			nat: result.nat,
			passed: resolveOpposed(attackerTotal, attackerNat, result.total, result.nat)
		});
	}
	return results;
}

// ── Handler principal ───────────────────────────────────────

/**
 * Handler de createChatMessage para testes opostos.
 * Itera sobre OPPOSED_CHECKS e processa o primeiro match.
 * GM only (guard interno).
 */
export async function handleOpposedChecks(message) {
	if (!game.user.isGM) return;
	if (!message.rolls?.length) return;

	const content = message.content ?? "";

	for (const check of OPPOSED_CHECKS) {
		const matches = check.triggers.some((t) => content.includes(t));
		if (!matches) continue;

		const attackRoll = message.rolls[0];
		const attackerTotal = message.getFlag("tormenta20", "rollTotal") ?? attackRoll?.total;
		if (!attackerTotal) return;

		// Extrai o valor natural do d20 do atacante
		const attackerNat = attackRoll?.dice?.[0]?.total ?? attackRoll?.terms?.[0]?.total ?? 0;

		const attackerName = message.speaker?.alias ?? "???";

		// Determina skill de defesa
		let defenseKey, defenseLabel, defenseAbbr;

		if (check.defenseMode === "choice") {
			const choice = await promptSkillChoice(check, attackerName, attackerTotal);
			if (!choice) return;
			defenseKey = choice.key;
			defenseLabel = choice.label;
			defenseAbbr = choice.abbr;
		} else {
			defenseKey = check.defenseSkill.key;
			defenseLabel = check.defenseSkill.label;
			defenseAbbr = check.defenseSkill.abbr;
		}

		// Obtém defensores e rola
		let results;
		if (check.defenseMode === "auto") {
			results = await rollAllCanvasTokens(message, defenseKey, attackerTotal, attackerNat);
		} else {
			const actorIds = await openActorPicker({
				title: `${defenseLabel} vs ${check.attackLabel} de ${attackerName}`,
				attackerName,
				attackerTotal,
				attackLabel: check.attackLabel,
				defenseLabel,
				defenseAbbr,
				defenseKey
			});
			if (!actorIds.length) return;
			results = await rollSelectedActors(actorIds, defenseKey, attackerTotal, attackerNat);
		}

		if (!results.length) return;
		results.sort((a, b) => b.total - a.total);

		// Determina se mostra coluna de bônus e qual classe CSS dos links
		const isAuto = check.defenseMode === "auto";
		const linkClass = check.tokenLinkClass ?? "t20-contest-token";
		const headerText = check.headerText(defenseAbbr);

		const html = buildResultTable({
			emoji: check.emoji,
			headerText,
			attackerName,
			attackerTotal,
			attackerNat,
			attackLabel: check.attackLabel,
			defenseAbbr,
			showBonus: !isAuto,
			linkClass,
			results
		});

		await postGMMessage({
			content: html,
			flavor: `${check.attackLabel} de ${attackerName} vs ${defenseLabel}`
		});

		return; // Processa apenas o primeiro match
	}
}
