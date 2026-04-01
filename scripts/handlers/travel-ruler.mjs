/* ============================================================
   T20 Automações — Handler: Mapa de Viagem Interativo

   Exibe um painel flutuante com o tempo de viagem em 4 modos
   (A pé, Carroça, Cavalo, Veloz) quando qualquer usuário ativa
   a régua de medição — MAS SOMENTE em cenas marcadas como
   "Mapa de Viagem" pelo GM.

   O GM marca a cena nas configurações: aba "Básicas" → checkbox
   "Mapa de Viagem (Régua de Viagem)". Isso salva uma flag
   no documento da cena via setFlag.

   Fluxo:
     1. GM abre configurações da cena → marca "Mapa de Viagem"
     2. Qualquer usuário usa a régua de medição
     3. Hook userActivity detecta ruler ativo
     4. Handler verifica flag da cena → exibe painel
     5. Régua solta → painel some

   Integração (index.mjs):
     - Hooks.on("renderSceneConfig")  → injectSceneConfigCheckbox
     - Hooks.on("canvasReady")        → initTravelPanel
     - Hooks.on("userActivity")       → atualiza painel
   ============================================================ */

const MOD = "t20-zaperas-automations";
const PANEL_ID = "t20-travel-panel";
const FLAG_KEY = "travelMap";

// ── Modos de viagem ──────────────────────────────────────────

const MODOS = [
	{
		label: "A pé",
		icon: "fa-person-walking",
		getWalk(pcs) {
			if (!pcs.length) return 9;
			return Math.min(...pcs.map((a) => a.system?.attributes?.movement?.walk || 9));
		}
	},
	{ label: "Carroça", icon: "fa-caravan",        getWalk: () => 9  },
	{ label: "Cavalo",  icon: "fa-horse",           getWalk: () => 12 },
	{ label: "Veloz",   icon: "fa-bolt",            getWalk: () => 15 }
];

// ── Helpers ───────────────────────────────────────────────────

function toKm(distance, unit) {
	if (unit === "km") return distance;
	if (unit === "m")  return distance / 1000;
	if (unit === "mi") return distance * 1.609;
	if (unit === "ft") return distance * 0.0003048;
	return distance; // fallback: assume km
}

function calcDias(distKm, walkM) {
	const kmPorDia = walkM * 4;
	return kmPorDia > 0 ? distKm / kmPorDia : 0;
}

function formatDias(dias) {
	if (dias <= 0) return "—";
	return dias.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " dias";
}

function formatKm(km) {
	if (km >= 1000) {
		return (km / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " Mm";
	}
	return km.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
}

function getPCs() {
	return game.actors?.filter((a) => a.type === "character" && a.hasPlayerOwner) ?? [];
}

// ── Painel DOM ────────────────────────────────────────────────

function getOrCreatePanel() {
	let panel = document.getElementById(PANEL_ID);
	if (!panel) {
		panel = document.createElement("div");
		panel.id = PANEL_ID;
		panel.style.cssText = `
			position: fixed;
			top: 70px;
			right: 10px;
			z-index: 9999;
			background: rgba(20, 16, 12, 0.92);
			border: 1px solid #6b5a3e;
			border-radius: 6px;
			padding: 8px 10px;
			color: #e8d9b5;
			font-family: "Signika", sans-serif;
			font-size: 12px;
			min-width: 320px;
			display: none;
			box-shadow: 0 4px 16px rgba(0,0,0,0.6);
			pointer-events: none;
		`;
		document.body.appendChild(panel);
	}
	return panel;
}

export function hideTravelPanel() {
	const panel = document.getElementById(PANEL_ID);
	if (panel) panel.style.display = "none";
}

export function updateTravelPanel(distanceRaw, unit) {
	// Verificar flag da cena
	const isTravelMap = canvas.scene?.getFlag(MOD, FLAG_KEY) ?? false;
	if (!isTravelMap) return;

	const distKm = toKm(distanceRaw, unit);
	if (distKm <= 0) {
		hideTravelPanel();
		return;
	}

	const pcs = getPCs();
	const numPCs = Math.max(pcs.length, 1);

	const colsHtml = MODOS.map((modo) => {
		const walkM = modo.getWalk(pcs);
		const kmPorDia = walkM * 4;
		const dias = calcDias(distKm, walkM);
		const racoes = Math.ceil(dias) * numPCs;

		return `
			<div style="flex:1; text-align:center; padding:4px 6px; border-left:1px solid #4a3e2a;">
				<div style="font-size:16px; margin-bottom:2px;">
					<i class="fas ${modo.icon}"></i>
				</div>
				<div style="font-weight:bold; font-size:11px; margin-bottom:4px;">${modo.label}</div>
				<div style="color:#aaa; font-size:10px;">${kmPorDia} km/dia</div>
				<div style="color:#e8d9b5; font-size:11px; margin-top:2px;">${formatDias(dias)}</div>
				<div style="color:#c9a84c; font-size:10px; margin-top:2px;">
					<i class="fas fa-utensils" style="font-size:9px;"></i> ${racoes} rações
				</div>
			</div>
		`;
	}).join("");

	const panel = getOrCreatePanel();
	panel.innerHTML = `
		<div style="font-size:11px; color:#aaa; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #4a3e2a;">
			<i class="fas fa-map-signs" style="color:#c9a84c;"></i>
			<b style="color:#e8d9b5; margin-left:4px;">Tempo de Viagem</b>
			<span style="float:right; color:#c9a84c;">${formatKm(distKm)}</span>
		</div>
		<div style="display:flex; gap:0;">
			${colsHtml}
		</div>
		<div style="font-size:9px; color:#666; margin-top:5px; text-align:right;">
			${numPCs} personagem(s) · PCs: ${pcs.map((a) => a.name).join(", ") || "nenhum"}
		</div>
	`;
	panel.style.display = "block";
}

export function initTravelPanel() {
	// Garante que o painel existe no DOM para o canvas atual
	getOrCreatePanel();
	hideTravelPanel();
}

// ── Injeção de checkbox na configuração de cena ───────────────

export function injectSceneConfigCheckbox(app, html) {
	if (!game.user.isGM) return;

	const scene = app.document;
	const flagVal = scene.getFlag(MOD, FLAG_KEY) ?? false;

	// Injeta no final da aba Básicas
	// Fallback: injeta no final do primeiro fieldset encontrado
	const checkbox = document.createElement("div");
	checkbox.className = "form-group";
	checkbox.innerHTML = `
		<label>
			<i class="fas fa-map-signs" style="color:#c9a84c; margin-right:4px;"></i>
			Mapa de Viagem
		</label>
		<div class="form-fields">
			<input type="checkbox" name="flags.${MOD}.${FLAG_KEY}"
				${flagVal ? "checked" : ""} data-t20-travel-flag>
		</div>
		<p class="hint">
			Ativa o painel de tempo de viagem ao usar a régua nesta cena.
		</p>
	`;

	// Localizar aba Básicas (data-tab="basic")
	const basicTab = html.querySelector("[data-tab='basic']") ?? html.querySelector("[data-tab='basics']");
	if (!basicTab) {
		console.warn("T20 Zapera | SceneConfig: aba Básicas não encontrada.");
		return;
	}

	// Inserir logo após "Posição de Visão Inicial" (campos initial.x / initial.scale)
	const initInput = basicTab.querySelector("[name='initial.x']")
		?? basicTab.querySelector("[name='initial.scale']");
	const anchorGroup = initInput?.closest("fieldset") ?? initInput?.closest(".form-group");

	if (anchorGroup) {
		anchorGroup.after(checkbox);
	} else {
		basicTab.appendChild(checkbox);
	}

	// Listener: ao mudar o checkbox, salva a flag imediatamente
	checkbox.querySelector("[data-t20-travel-flag]").addEventListener("change", async (ev) => {
		await scene.setFlag(MOD, FLAG_KEY, ev.target.checked);
	});
}
