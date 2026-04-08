/* ============================================================
   T20 Zapera's Automations — Entry Point

   Módulo externo de automações para o sistema Tormenta20.
   Carregado via module.json esmodules.

   Hooks:
     - 1× init                   → registra configurações do módulo
     - 1× ready                  → registra os hooks de automação
     - 1× createChatMessage      → testes de resistência + testes opostos + defesa + sustentação
     - 1× renderChatMessage      → links clicáveis de token + visual de defesa
     - 1× renderChatMessageHTML  → dreno de vida + sustentação + sortudo
     - 1× updateCombat           → prompt de sustentação no início do turno
     - 1× updateActor            → condições em 0 PV
     - 1× renderSceneConfig      → checkbox "Mapa de Viagem" na config da cena
     - 1× init (travelRuler)     → registra a régua de Mapa de Viagem
   ============================================================ */

import { handleTokenLinks } from "./utils/token-links.mjs";

const MOD = "t20-zaperas-automations";

/** Lê uma setting booleana do módulo */
const enabled = (key) => game.settings.get(MOD, key);

// ── Templates Handlebars do módulo ────────────────────────────

const MOD_TEMPLATES = [
	`modules/${MOD}/templates/auto-save/result.hbs`,
	`modules/${MOD}/templates/auto-save/prompt.hbs`,
	`modules/${MOD}/templates/defense-check/banner.hbs`,
	`modules/${MOD}/templates/sustain/prompt.hbs`,
	`modules/${MOD}/templates/zero-pv/apply.hbs`,
	`modules/${MOD}/templates/zero-pv/remove.hbs`,
	`modules/${MOD}/templates/sortudo/button.hbs`,
	`modules/${MOD}/templates/sortudo/card.hbs`,
	`modules/${MOD}/templates/opposed-checks/result-table.hbs`,
	`modules/${MOD}/templates/opposed-checks/skill-choice.hbs`,
	`modules/${MOD}/templates/travel-ruler/scene-config.hbs`,
	`modules/${MOD}/templates/actor-picker/dialog.hbs`,
	`modules/${MOD}/templates/actor-picker/row.hbs`,
];

// ── Registro de configurações (deve rodar em "init") ─────────

Hooks.once("init", async () => {
	foundry.applications.handlebars.loadTemplates(MOD_TEMPLATES);
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
			default: true,
			requiresReload: true,
		});
	}

	// ── Régua de Viagem (deve rodar em init, antes do canvas) ────
	if (game.settings.get(MOD, "travelRuler")) {
		const { registerRulerPatch } = await import("./handlers/travel-ruler.mjs");
		registerRulerPatch();
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
	Hooks.on("renderChatMessage", async (message, html) => {
		handleTokenLinks(message, html);
		if (_renderDefenseCheck) await _renderDefenseCheck(message, html);
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
		Hooks.on("renderChatMessageHTML", async (message, html) => {
			for (const handler of renderChatHandlers) {
				try { await handler(message, html); }
				catch (err) { console.error("T20 Zapera | renderChatMessageHTML handler error:", err); }
			}
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

	// ── travelRuler ──────────────────────────────────────────
	if (enabled("travelRuler")) {
		const { injectSceneConfigCheckbox } = await import("./handlers/travel-ruler.mjs");
		Hooks.on("renderSceneConfig", injectSceneConfigCheckbox);
	}

	console.log("T20 Zapera | Scripts de automação registrados");
	ui.notifications.info("T20 Zapera | Automações ativadas");
});
