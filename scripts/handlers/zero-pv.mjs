/* ============================================================
   T20 Automações — Handler: Condições Automáticas em 0 PV

   Ao cair para 0 PV ou menos, aplica:
     Sangrando, Indefeso, Desprevenido, Caído, Inconsciente

   Ao voltar para 1+ PV, remove:
     Sangrando, Indefeso, Desprevenido, Inconsciente
     (Caído permanece)
   ============================================================ */

import { ZERO_PV_CONDITIONS, ZERO_PV_FLAG, ZERO_PV_FLAG_STATUS } from "../config.mjs";
import { normalizeConditionName } from "../utils/text.mjs";

/** Lock de processamento — previne re-entrada durante criação de efeitos */
const processing = new Set();

// ── Helpers ─────────────────────────────────────────────────

function collectExistingStatuses(actor) {
	const existingStatuses = new Set();

	for (const effect of actor.effects) {
		for (const status of effect.statuses ?? []) {
			existingStatuses.add(status);
		}
		if (effect.getFlag?.("tormenta20", "condition") && effect.name) {
			existingStatuses.add(normalizeConditionName(effect.name));
		}
	}

	return existingStatuses;
}

function buildConditionData(statusId) {
	const data = foundry.utils.deepClone(CONFIG.T20.conditions?.[statusId]);
	if (!data) return null;

	data.transfer = false;
	data.flags ??= {};
	data.flags.world ??= {};
	data.flags.world[ZERO_PV_FLAG] = true;
	data.flags.world[ZERO_PV_FLAG_STATUS] = statusId;

	return data;
}

function getConditionIdsToRemove(actor, removableConditions) {
	const removable = new Set(removableConditions);

	return actor.effects
		.filter((effect) => {
			// 1) Condições criadas pelo script (pela flag)
			const createdByScript = effect.getFlag?.("world", ZERO_PV_FLAG) === true;
			if (createdByScript) {
				const flaggedStatus = effect.getFlag?.("world", ZERO_PV_FLAG_STATUS);
				if (flaggedStatus && removable.has(flaggedStatus)) return true;
			}

			// 2) Condições que batem pelo statusId
			for (const status of effect.statuses ?? []) {
				if (removable.has(status)) return true;
			}

			// 3) Condições do T20 identificadas pelo nome normalizado
			if (effect.getFlag?.("tormenta20", "condition") && effect.name) {
				if (removable.has(normalizeConditionName(effect.name))) return true;
			}

			return false;
		})
		.map((effect) => effect.id);
}

// ── Handler principal ───────────────────────────────────────

/**
 * Handler de updateActor para condições automáticas em 0 PV.
 * GM only.
 */
export async function handleZeroPV(actor, changes) {
	if (!game.user.isGM) return;
	if (actor.type !== "character") return;

	const changedPV = foundry.utils.getProperty(changes, "system.attributes.pv.value");
	if (changedPV === undefined) return;

	if (processing.has(actor.id)) return;
	processing.add(actor.id);

	try {
		const currentPV = Number(actor.system?.attributes?.pv?.value ?? 0);

		if (currentPV <= 0) {
			const existingStatuses = collectExistingStatuses(actor);

			const toCreate = ZERO_PV_CONDITIONS.apply
				.filter((statusId) => !existingStatuses.has(statusId))
				.map(buildConditionData)
				.filter(Boolean);

			if (toCreate.length) {
				await actor.createEmbeddedDocuments("ActiveEffect", toCreate);

				await ChatMessage.create({
					speaker: ChatMessage.getSpeaker({ actor }),
					whisper: ChatMessage.getWhisperRecipients("GM"),
					content: `
						<div class="tormenta20 chat-card item-card">
							<header class="card-header flexrow">
								<h3 class="item-name"><div>${actor.name} caiu a 0 PV</div></h3>
							</header>
							<div class="card-content">
								<p>Condições aplicadas automaticamente:</p>
								<table class="t20-condition-table">
									<tr><th>Condição</th><th>Status</th></tr>
									<tr><td>Sangrando</td><td>OK</td></tr>
									<tr><td>Indefeso</td><td>OK</td></tr>
									<tr><td>Desprevenido</td><td>OK</td></tr>
									<tr><td>Caído</td><td>OK</td></tr>
									<tr><td>Inconsciente</td><td>OK</td></tr>
								</table>
							</div>
						</div>
					`
				});
			}

			return;
		}

		// PV >= 1: remove condições
		const toDelete = getConditionIdsToRemove(actor, ZERO_PV_CONDITIONS.remove);

		if (toDelete.length) {
			await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);

			await ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				whisper: ChatMessage.getWhisperRecipients("GM"),
				content: `
					<div class="tormenta20 chat-card item-card">
						<header class="card-header flexrow">
							<h3 class="item-name"><div>${actor.name} voltou para 1+ PV</div></h3>
						</header>
						<div class="card-content">
							<p>Condições removidas automaticamente:</p>
							<table class="t20-condition-table">
								<tr><th>Condição</th><th>Status</th></tr>
								<tr><td>Sangrando</td><td>REMOVIDA</td></tr>
								<tr><td>Indefeso</td><td>REMOVIDA</td></tr>
								<tr><td>Desprevenido</td><td>REMOVIDA</td></tr>
								<tr><td>Inconsciente</td><td>REMOVIDA</td></tr>
							</table>
						</div>
					</div>
				`
			});
		}
	} catch (err) {
		console.error("T20 Auto Zero PV | Erro ao processar condições automáticas:", err);
		ui.notifications.error(`Erro ao processar condições automáticas em ${actor.name}. Veja o console.`);
	} finally {
		processing.delete(actor.id);
	}
}
