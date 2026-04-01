/* ============================================================
   T20 Zapera's Automations — Entry Point

   Módulo externo de automações para o sistema Tormenta20.
   Carregado via module.json esmodules.

   Hooks:
     - 1× init                   → registra configurações do módulo
     - 1× ready                  → registra os hooks de automação
     - 1× createChatMessage      → auto-save + testes opostos + defesa + sustentação
     - 1× renderChatMessage      → links clicáveis de token + visual de defesa
     - 1× renderChatMessageHTML  → dreno de vida + sustentação + sortudo
     - 1× updateCombat           → prompt de sustentação no início do turno
     - 1× updateActor            → condições em 0 PV
     - 1× createMeasuredTemplate → explosão de área (somente GM)
     - 1× renderSceneConfig      → checkbox "Mapa de Viagem" na config da cena
     - 1× canvasReady            → inicializa painel de viagem
     - 1× userActivity           → atualiza painel de viagem ao usar régua
   ============================================================ */

import { handleTokenLinks } from "./utils/token-links.mjs";

const MOD = "t20-zaperas-automations";

/** Lê uma setting booleana do módulo */
const enabled = (key) => game.settings.get(MOD, key);

// ── Registro de configurações (deve rodar em "init") ─────────

Hooks.once("init", () => {
	const automations = [
		{
			key: "autoSave",
			name: "Testes de Resistência Automáticos",
			hint: "Abre prompts de Fortitude, Reflexo ou Vontade automaticamente para tokens afetados por magias."
		},
		{
			key: "opposedChecks",
			name: "Testes Opostos",
			hint: "Automatiza Enganação vs Percepção/Intuição, Furtividade vs Percepção e Intimidação vs Vontade."
		},
		{
			key: "defenseCheck",
			name: "Verificador de Defesa",
			hint: "Mostra se o ataque acertou ou errou comparando o total rolado com a Defesa do alvo selecionado."
		},
		{
			key: "lifeDrain",
			name: "Dreno de Vida",
			hint: "Para magias configuradas (ex: Toque Vampírico), cura o atacante por uma porcentagem do dano causado."
		},
		{
			key: "sustainedSpell",
			name: "Contador de Magia Sustentada",
			hint: "Aplica efeito ao lançar magias sustentadas e pergunta ao GM a cada turno se deseja pagar o custo em PM."
		},
		{
			key: "zeroPV",
			name: "Condições em 0 PV",
			hint: "Aplica e remove automaticamente condições (Sangrando, Inconsciente, etc.) quando um ator chega a 0 PV."
		},
		{
			key: "sortudo",
			name: "Poder Sortudo",
			hint: "Adiciona botão de rerolar em testes de perícia para personagens com o poder Sortudo (custa 3 PM)."
		},
		{
			key: "explosaoArea",
			name: "Explosão de Área",
			hint: "Ao colocar um template no mapa, pergunta ao GM sobre resistência e envia prompts automáticos para os jogadores rolarem."
		},
		{
			key: "travelRuler",
			name: "Mapa de Viagem Interativo",
			hint: "Exibe painel de tempo de viagem ao usar a régua em cenas marcadas como 'Mapa de Viagem' (configuração da cena)."
		}
	];

	for (const { key, name, hint } of automations) {
		game.settings.register(MOD, key, {
			name,
			hint,
			scope: "world",
			config: true,
			type: Boolean,
			default: true
		});
	}
});

// ── Registro de hooks (roda em "ready") ──────────────────────

Hooks.once("ready", async () => {
	console.log("T20 Zapera | Registrando scripts de automação");

	// ── createChatMessage ────────────────────────────────────
	const createChatHandlers = [];
	if (enabled("autoSave")) {
		const { handleAutoSave } = await import("./handlers/auto-save.mjs");
		createChatHandlers.push(handleAutoSave);
	}
	if (enabled("opposedChecks")) {
		const { handleOpposedChecks } = await import("./handlers/opposed-checks.mjs");
		createChatHandlers.push(handleOpposedChecks);
	}
	if (enabled("defenseCheck")) {
		const { handleDefenseCheck } = await import("./handlers/defense-check.mjs");
		createChatHandlers.push(handleDefenseCheck);
	}
	if (enabled("sustainedSpell")) {
		const { handleSustainCast } = await import("./handlers/sustained-spell.mjs");
		createChatHandlers.push(handleSustainCast);
	}
	if (createChatHandlers.length) {
		Hooks.on("createChatMessage", async (message) => {
			for (const handler of createChatHandlers) await handler(message);
		});
	}

	// ── renderChatMessage ────────────────────────────────────
	// defense-check.mjs pode ser importado duas vezes (aqui e acima).
	// O browser usa o cache ESM — o arquivo é baixado apenas uma vez.
	let _renderDefenseCheck = null;
	if (enabled("defenseCheck")) {
		({ renderDefenseCheck: _renderDefenseCheck } = await import("./handlers/defense-check.mjs"));
	}
	Hooks.on("renderChatMessage", (message, html) => {
		handleTokenLinks(message, html);
		if (_renderDefenseCheck) _renderDefenseCheck(message, html);
	});

	// ── renderChatMessageHTML ────────────────────────────────
	const renderChatHandlers = [];
	if (enabled("lifeDrain")) {
		const { renderLifeDrain } = await import("./handlers/life-drain.mjs");
		renderChatHandlers.push(renderLifeDrain);
	}
	if (enabled("sustainedSpell")) {
		const { renderSustainPrompt } = await import("./handlers/sustained-spell.mjs");
		renderChatHandlers.push(renderSustainPrompt);
	}
	if (enabled("sortudo")) {
		const { renderSortudo } = await import("./handlers/sortudo.mjs");
		renderChatHandlers.push(renderSortudo);
	}
	if (renderChatHandlers.length) {
		Hooks.on("renderChatMessageHTML", (message, html) => {
			for (const handler of renderChatHandlers) handler(message, html);
		});
	}

	// ── updateCombat ─────────────────────────────────────────
	// sustained-spell.mjs pode ser importado até 3 vezes; o browser usa cache ESM.
	if (enabled("sustainedSpell")) {
		const { handleSustainTurn } = await import("./handlers/sustained-spell.mjs");
		Hooks.on("updateCombat", handleSustainTurn);
	}

	// ── updateActor ──────────────────────────────────────────
	if (enabled("zeroPV")) {
		const { handleZeroPV } = await import("./handlers/zero-pv.mjs");
		Hooks.on("updateActor", handleZeroPV);
	}

	// ── createMeasuredTemplate ───────────────────────────────
	if (enabled("explosaoArea")) {
		const { handleAreaTemplate } = await import("./handlers/area-save.mjs");
		Hooks.on("createMeasuredTemplate", handleAreaTemplate);
	}

	// ── travelRuler ──────────────────────────────────────────
	if (enabled("travelRuler")) {
		const { hideTravelPanel, initTravelPanel, injectSceneConfigCheckbox, updateTravelPanel } =
			await import("./handlers/travel-ruler.mjs");

		Hooks.on("renderSceneConfig", injectSceneConfigCheckbox);
		Hooks.on("canvasReady", initTravelPanel);
		Hooks.on("userActivity", (_user, activityData) => {
			if (!("ruler" in activityData)) return;
			const rulerData = activityData.ruler;
			if (!rulerData || !rulerData.waypoints?.length) {
				hideTravelPanel();
				return;
			}
			const last = rulerData.waypoints.at(-1);
			const totalDistance = last?.distance ?? last?.cumulativeDistance ?? 0;
			const unit = canvas.scene?.grid?.units ?? "km";
			updateTravelPanel(totalDistance, unit);
		});
	} else {
		// travelRuler desabilitado: garantir que painel não apareça se existir do ciclo anterior
		Hooks.on("canvasReady", () => {
			const panel = document.getElementById("travel-panel");
			if (panel) panel.remove();
		});
	}

	console.log("T20 Zapera | Scripts de automação registrados");
	ui.notifications.info("T20 Zapera | Automações ativadas");
});
