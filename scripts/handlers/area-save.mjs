/* ============================================================
   T20 Automações — Handler: Explosão de Área

   Quando um template (área de efeito) é criado no mapa, o GM
   recebe um dialog de confirmação com nome da magia, tipo de
   resistência e CD — todos lidos automaticamente do card no chat.

   Ao confirmar, abre rollPericia em paralelo para cada token
   alvo, exatamente como clicar na perícia na ficha do personagem.

   Fluxo:
     1. Jogador/GM usa magia → clica "Colocar Área de Efeito"
     2. Template é criado → targets são marcados automaticamente
     3. Hook createMeasuredTemplate dispara (somente GM)
     4. Dados da magia são lidos da mensagem de chat mais recente
     5. Dialog de confirmação aparece ao GM
     6. GM confirma → rollPericia abre para cada token alvo

   Integração:
     - createMeasuredTemplate → handleAreaTemplate (somente GM)
   ============================================================ */

import { normalizeText } from "../utils/text.mjs";
import { rollSaveAndReport } from "./auto-save.mjs";

const SAVE_LABELS = {
	fort: "Fortitude",
	refl: "Reflexo",
	vont: "Vontade"
};

// ── Helpers de parse ─────────────────────────────────────────

function parseSaveType(txt) {
	const n = normalizeText(txt ?? "");
	if (n.includes("fortitude")) return "fort";
	if (n.includes("reflexo")) return "refl";
	if (n.includes("vontade")) return "vont";
	return "refl"; // padrão: Reflexo
}

function extractCD(html) {
	const match = (html ?? "").match(/CD\s+(\d+)/);
	return match ? Number(match[1]) : 0;
}

function extractItemName(html) {
	const div = document.createElement("div");
	div.innerHTML = html ?? "";
	return div.querySelector(".item-name")?.textContent?.trim() || "";
}

// ── Handler principal (GM) ────────────────────────────────────

/**
 * Chamado em createMeasuredTemplate — SOMENTE NO GM.
 * Lê targets e dados da magia, exibe confirmação, rola para cada alvo.
 */
export async function handleAreaTemplate(templateDoc) {
	if (!game.user.isGM) return;

	// Aguarda um tick para targets e shape estarem disponíveis
	await new Promise((r) => setTimeout(r, 150));

	// 1. Obter targets do usuário que criou o template
	const user = game.users.get(templateDoc.author?.id ?? templateDoc.user);
	const targets = [...(user?.targets ?? [])];
	if (!targets.length) return;

	// 2. Ler dados da magia da mensagem de chat mais recente com template
	const recentMsg = game.messages.contents
		.filter(
			(m) =>
				m.author?.id === (templateDoc.author?.id ?? templateDoc.user) &&
				m.getFlag("tormenta20", "template")
		)
		.at(-1);

	const itemData = recentMsg?.flags?.tormenta20?.itemData;
	const content = recentMsg?.content ?? "";

	// Extrair resistência do itemData ou do HTML do card
	let resistTxt = itemData?.resistencia?.txt ?? "";
	if (!resistTxt) {
		const div = document.createElement("div");
		div.innerHTML = content;
		const text = div.querySelector(".card-item-header")?.textContent || content;
		const match = text.match(/Resistência:\s*([^(;]+)/i);
		resistTxt = match ? match[1].trim() : "";
	}

	const saveType = parseSaveType(resistTxt);
	const cd =
		Number(itemData?.resistencia?.cd) ||
		extractCD(content) ||
		0;
	const spellName = extractItemName(content) || "Magia";

	const saveLabel = SAVE_LABELS[saveType] ?? "Resistência";
	const tokenNames = targets
		.map((t) => t.name)
		.filter(Boolean)
		.join(", ");

	// 3. Dialog de confirmação para o GM
	const confirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: `${spellName} — Resistência em Área` },
		content: `
      <div style="padding: 4px 0;">
        <p style="margin: 0 0 6px;"><b>${spellName}</b></p>
        <p style="margin: 0 0 6px;">
          Teste de <b>${saveLabel}</b>${cd ? ` (CD ${cd})` : ""}
        </p>
        <p style="margin: 0; color: #555; font-size: 0.85em;">
          <b>Tokens afetados:</b> ${tokenNames}
        </p>
      </div>
    `,
		yes: { label: "Enviar Testes", icon: "fas fa-bolt" },
		no: { label: "Cancelar", icon: "fas fa-times" }
	});

	if (!confirmed) return;

	// 4. Para cada alvo, rolar teste e comparar com CD (reusa lógica de auto-save)
	const casterName = recentMsg?.speaker?.alias || "???";
	const results = await Promise.allSettled(
		targets
			.filter((token) => token.actor)
			.map((token) =>
				rollSaveAndReport(token, saveType, cd, spellName, casterName, recentMsg)
			)
	);
	for (const r of results) {
		if (r.status === "rejected") console.warn("T20 Zapera | rollSaveAndReport falhou:", r.reason);
	}
}
