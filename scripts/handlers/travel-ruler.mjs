/* ============================================================
   T20 Automações — Handler: Mapa de Viagem Interativo

   Exibe informações de tempo de viagem diretamente no label da
   régua do Foundry (último waypoint), usando a API nativa
   WAYPOINT_LABEL_TEMPLATE + _getWaypointLabelContext.

   Somente ativo em cenas marcadas como "Mapa de Viagem" pelo GM
   (flag na configuração da cena).

   Fluxo:
     1. GM abre configurações da cena → marca "Mapa de Viagem"
     2. No init, o módulo substitui o template da régua e
        envolve _getWaypointLabelContext para injetar dados
     3. Qualquer usuário usa a régua → último waypoint exibe
        painel de tempo de viagem

   Integração (index.mjs):
     - Hooks.once("init")            → registerRulerPatch
     - Hooks.on("renderSceneConfig") → injectSceneConfigCheckbox
   ============================================================ */

const MOD = "t20-zaperas-automations";
const FLAG_KEY = "travelMap";
const TEMPLATE = `modules/${MOD}/templates/waypoint-label.hbs`;

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
	{ label: "Carroça", icon: "fa-caravan",  getWalk: () => 9  },
	{ label: "Cavalo",  icon: "fa-horse",    getWalk: () => 12 },
	{ label: "Veloz",   icon: "fa-bolt",     getWalk: () => 15 }
];

// ── Helpers ───────────────────────────────────────────────────

function toKm(distance, unit) {
	if (unit === "km") return distance;
	if (unit === "m")  return distance / 1000;
	if (unit === "mi") return distance * 1.609;
	if (unit === "ft") return distance * 0.0003048;
	return distance;
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

// ── Ruler patch ──────────────────────────────────────────────

/**
 * Registra o patch na régua: substitui o template HBS e envolve
 * _getWaypointLabelContext para injetar dados de viagem.
 * Deve ser chamado em Hooks.once("init").
 */
export function registerRulerPatch() {
	const RulerClass = CONFIG.Canvas.rulerClass;
	if (!RulerClass) {
		console.warn("T20 Zapera | CONFIG.Canvas.rulerClass não encontrado — travel ruler desativado.");
		return;
	}

	// Substituir template
	RulerClass.WAYPOINT_LABEL_TEMPLATE = TEMPLATE;
	foundry.applications.handlebars.loadTemplates([TEMPLATE]);

	// Envolver _getWaypointLabelContext
	const original = RulerClass.prototype._getWaypointLabelContext;
	RulerClass.prototype._getWaypointLabelContext = function (waypoint, state) {
		const context = original.call(this, waypoint, state);
		if (!context) return context;

		// Só exibir no último waypoint
		if (waypoint.next) return context;

		// Só em cenas de viagem
		const isTravelMap = canvas.scene?.getFlag(MOD, FLAG_KEY) ?? false;
		if (!isTravelMap) return context;

		const distanceRaw = waypoint.measurement?.distance;
		if (!distanceRaw || distanceRaw <= 0) return context;

		const unit = canvas.scene?.grid?.units ?? "km";
		const distKm = toKm(distanceRaw, unit);
		if (distKm <= 0) return context;

		const pcs = getPCs();
		const numPCs = Math.max(pcs.length, 1);

		const modes = MODOS.map((modo) => {
			const walkM = modo.getWalk(pcs);
			const kmPorDia = walkM * 4;
			const dias = kmPorDia > 0 ? distKm / kmPorDia : 0;
			const racoes = Math.ceil(dias) * numPCs;
			return {
				label: modo.label,
				icon: modo.icon,
				speed: `${kmPorDia} km/dia`,
				days: formatDias(dias),
				rations: `${racoes} rações`
			};
		});

		context.travelTime = {
			distanceLabel: formatKm(distKm),
			modes,
			pcInfo: `${numPCs} personagem(s) · PCs: ${pcs.map((a) => a.name).join(", ") || "nenhum"}`
		};

		return context;
	};

	console.log("T20 Zapera | Ruler patch registrado para Mapa de Viagem");
}

// ── Injeção de checkbox na configuração de cena ───────────────

export function injectSceneConfigCheckbox(app, html) {
	if (!game.user.isGM) return;

	const scene = app.document;
	const flagVal = scene.getFlag(MOD, FLAG_KEY) ?? false;

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

	// Localizar aba Básicas (data-tab="basics", grupo "sheet")
	// CUIDADO: data-tab="basic" (sem 's') é sub-aba de Ambiente, não Básicos!
	const basicTab = html.querySelector(".tab[data-group='sheet'][data-tab='basics']");
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
