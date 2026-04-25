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
import { DEFAULT_OPPOSED_CHECKS_DATA, DEFAULT_LIFE_DRAIN_SPELLS, DEFAULT_POISON_ITEMS } from "./config.mjs";
import { OpposedChecksConfig } from "./apps/opposed-checks-config.mjs";
import { LifeDrainConfig } from "./apps/life-drain-config.mjs";
import { TravelRulerActorConfig } from "./apps/travel-ruler-config.mjs";
import { ItemAutoSaveConfig } from "./apps/item-auto-save-config.mjs";

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
	`modules/${MOD}/templates/opposed-checks-config/main.hbs`,
	`modules/${MOD}/templates/life-drain-config/main.hbs`,
	`modules/${MOD}/templates/travel-ruler-config/main.hbs`,
	`modules/${MOD}/templates/cura-acelerada/prompt.hbs`,
	`modules/${MOD}/templates/item-auto-save-config/main.hbs`,
];

// ── Registro de configurações (deve rodar em "init") ─────────

Hooks.once("init", async () => {
	foundry.applications.handlebars.loadTemplates(MOD_TEMPLATES);

	// Helper para exibir arrays como string no HBS
	Handlebars.registerHelper("join", (arr, sep) => (Array.isArray(arr) ? arr.join(sep) : ""));

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
		},
		{
			key: "curaAcelerada",
			name: "Cura Acelerada",
			hint: "A cada turno de uma ameaça com 'cura acelerada' no texto de resistências, pergunta ao GM se deseja regenerar os PV correspondentes."
		},
		{
			key: "itemAutoSave",
			name: "Testes de Resistência Automáticos (Itens)",
			hint: "Abre prompts de resistência para alvos de itens consumíveis (bombas alquímicas, venenos, fogo alquímico). Calcula a CD automaticamente pela fórmula 10 + ⌊nível/2⌋ + atributo-chave."
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

	// ── Visibilidade para jogadores ───────────────────────────────
	game.settings.register(MOD, "sustainedSpellPublic", {
		name: "Mostrar Contador de Sustento de Magia para os Jogadores?",
		hint: "Se marcado, o prompt de sustentação aparece no chat público. Se desmarcado, somente o GM vê.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: false,
	});

	game.settings.register(MOD, "defenseCheckPublic", {
		name: "Mostrar Verificador de Defesa para os Jogadores?",
		hint: "Se marcado, o resultado acertou/errou aparece para todos os jogadores. Se desmarcado, somente o GM vê.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: false,
	});


	game.settings.register(MOD, "autoSaveShowCD", {
		name: "Testes de Resistência — Mostrar CD no Chat",
		hint: "Se marcado, exibe a CD do teste no dialog de rolagem e no card de resultado. Desmarque para esconder a dificuldade dos jogadores.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		requiresReload: false,
	});

	game.settings.register(MOD, "opposedChecksGMOnly", {
		name: "Testes Opostos — Resultado apenas para o GM",
		hint: "O card de resultado dos testes opostos é enviado como whisper apenas para o GM, independente do modo de rolagem.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: false,
	});

	game.settings.register(MOD, "opposedChecksTargetsOnly", {
		name: "Testes Opostos — Rolar apenas para alvos selecionados",
		hint: "Se tokens estiverem marcados como alvo, usa apenas eles. No modo automático, exige ao menos um alvo. Nos modos fixo/escolha, pré-seleciona os alvos no picker.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: false,
	});
	// ── Dados persistentes de Testes Opostos ─────────────────────
	game.settings.register(MOD, "opposedChecksData", {
		scope: "world",
		config: false,
		type: Array,
		default: DEFAULT_OPPOSED_CHECKS_DATA
	});

	game.settings.registerMenu(MOD, "opposedChecksConfig", {
		name: "Configuração de Testes Opostos",
		hint: "Gerenciar regras de testes opostos (triggers, habilidades, modo).",
		label: "Configurar",
		icon: "fas fa-cog",
		type: OpposedChecksConfig,
		restricted: true
	});

	// ── Dados persistentes de Dreno de Vida ──────────────────────
	game.settings.register(MOD, "lifeDrainSpells", {
		scope: "world",
		config: false,
		type: Array,
		default: DEFAULT_LIFE_DRAIN_SPELLS
	});

	game.settings.registerMenu(MOD, "lifeDrainConfig", {
		name: "Configuração de Dreno de Vida",
		hint: "Gerenciar quais magias ativam o Dreno de Vida e o percentual de cura.",
		label: "Configurar",
		icon: "fas fa-droplet",
		type: LifeDrainConfig,
		restricted: true
	});

	// ── Dados persistentes de Venenos (Item Auto-Save) ───────
	game.settings.register(MOD, "itemAutoSavePoisons", {
		scope: "world",
		config: false,
		type: Array,
		default: DEFAULT_POISON_ITEMS
	});

	game.settings.registerMenu(MOD, "itemAutoSaveConfig", {
		name: "Configuração de Venenos",
		hint: "Gerenciar quais itens consumíveis são tratados como venenos (Fortitude + Int).",
		label: "Configurar",
		icon: "fas fa-skull-crossbones",
		type: ItemAutoSaveConfig,
		restricted: true
	});

	// ── Dados persistentes de Travel Ruler ───────────────────
	game.settings.register(MOD, "travelRulerActors", {
		scope: "world",
		config: false,
		type: Array,
		default: []
	});

	game.settings.registerMenu(MOD, "travelRulerConfig", {
		name: "Configuração de Atores para Viagem",
		hint: "Escolha quais personagens devem ser considerados no cálculo de menor deslocamento.",
		label: "Configurar",
		icon: "fas fa-users",
		type: TravelRulerActorConfig,
		restricted: true
	});

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
	if (enabled("itemAutoSave")) {
		const { handleItemAutoSave } = await import("./handlers/item-auto-save.mjs");
		createChatHandlers.push(handleItemAutoSave);
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
	if (enabled("curaAcelerada")) {
		const { renderCuraAceleradaPrompt } = await import("./handlers/cura-acelerada.mjs");
		renderChatHandlers.push(renderCuraAceleradaPrompt);
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
	if (enabled("curaAcelerada")) {
		const { handleCuraAceleradaTurn } = await import("./handlers/cura-acelerada.mjs");
		Hooks.on("updateCombat", handleCuraAceleradaTurn);
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


// ── Reposiciona os botões "Configurar" logo após seus toggles ──
Hooks.on("renderSettingsConfig", (_app, html) => {
	const root = html instanceof HTMLElement ? html : html[0] ?? html;
	if (!root) return;

	// Testes de Resistência — mostrar CD
	const asShowCDCheckbox = root.querySelector(`input[name="${MOD}.autoSaveShowCD"]`);
	const asShowCDRow = asShowCDCheckbox?.closest(".form-group");
	const asToggleCheckbox = root.querySelector(`input[name="${MOD}.autoSave"]`);
	const asToggleRow = asToggleCheckbox?.closest(".form-group");
	if (asShowCDRow && asToggleRow) {
		asToggleRow.insertAdjacentElement("afterend", asShowCDRow);
		asShowCDRow.style.marginLeft = "1.5rem";
	}

	// Verificador de Defesa — checkbox de visibilidade
	const dcPublicCheckbox = root.querySelector(`input[name="${MOD}.defenseCheckPublic"]`);
	const dcPublicRow = dcPublicCheckbox?.closest(".form-group");
	const dcToggleCheckbox = root.querySelector(`input[name="${MOD}.defenseCheck"]`);
	const dcToggleRow = dcToggleCheckbox?.closest(".form-group");
	if (dcPublicRow && dcToggleRow) {
		dcToggleRow.insertAdjacentElement("afterend", dcPublicRow);
		dcPublicRow.style.marginLeft = "1.5rem";
	}

	// Contador de Magia Sustentada — checkbox de visibilidade
	const ssPublicCheckbox = root.querySelector(`input[name="${MOD}.sustainedSpellPublic"]`);
	const ssPublicRow = ssPublicCheckbox?.closest(".form-group");
	const ssToggleCheckbox = root.querySelector(`input[name="${MOD}.sustainedSpell"]`);
	const ssToggleRow = ssToggleCheckbox?.closest(".form-group");
	if (ssPublicRow && ssToggleRow) {
		ssToggleRow.insertAdjacentElement("afterend", ssPublicRow);
		ssPublicRow.style.marginLeft = "1.5rem";
	}

	// Testes Opostos
	const ocMenuBtn = root.querySelector(`button[data-key="${MOD}.opposedChecksConfig"]`);
	const ocMenuRow = ocMenuBtn?.closest(".form-group");
	const ocToggleCheckbox = root.querySelector(`input[name="${MOD}.opposedChecks"]`);
	const ocToggleRow = ocToggleCheckbox?.closest(".form-group");
	if (ocMenuRow && ocToggleRow) {
		ocToggleRow.insertAdjacentElement("afterend", ocMenuRow);
		ocMenuRow.style.marginLeft = "1.5rem";
	}


	// Testes Opostos — checkboxes de modo
	const ocGMOnlyCheckbox = root.querySelector(`input[name="${MOD}.opposedChecksGMOnly"]`);
	const ocGMOnlyRow = ocGMOnlyCheckbox?.closest(".form-group");
	const ocTargetsOnlyCheckbox = root.querySelector(`input[name="${MOD}.opposedChecksTargetsOnly"]`);
	const ocTargetsOnlyRow = ocTargetsOnlyCheckbox?.closest(".form-group");
	const ocToggleCheckbox2 = root.querySelector(`input[name="${MOD}.opposedChecks"]`);
	const ocToggleRow2 = ocToggleCheckbox2?.closest(".form-group");
	if (ocToggleRow2) {
		if (ocGMOnlyRow) {
			ocToggleRow2.insertAdjacentElement("afterend", ocGMOnlyRow);
			ocGMOnlyRow.style.marginLeft = "1.5rem";
		}
		if (ocTargetsOnlyRow) {
			ocGMOnlyRow?.insertAdjacentElement("afterend", ocTargetsOnlyRow) ??
			ocToggleRow2.insertAdjacentElement("afterend", ocTargetsOnlyRow);
			ocTargetsOnlyRow.style.marginLeft = "1.5rem";
		}
	}
	// Dreno de Vida
	const ldMenuBtn = root.querySelector(`button[data-key="${MOD}.lifeDrainConfig"]`);
	const ldMenuRow = ldMenuBtn?.closest(".form-group");
	const ldToggleCheckbox = root.querySelector(`input[name="${MOD}.lifeDrain"]`);
	const ldToggleRow = ldToggleCheckbox?.closest(".form-group");
	if (ldMenuRow && ldToggleRow) {
		ldToggleRow.insertAdjacentElement("afterend", ldMenuRow);
		ldMenuRow.style.marginLeft = "1.5rem";
	}

	// Item Auto-Save — menu Configurar (lista de venenos)
	const iasMenuBtn = root.querySelector(`button[data-key="${MOD}.itemAutoSaveConfig"]`);
	const iasMenuRow = iasMenuBtn?.closest(".form-group");
	const iasToggleCheckbox = root.querySelector(`input[name="${MOD}.itemAutoSave"]`);
	const iasToggleRow = iasToggleCheckbox?.closest(".form-group");
	if (iasMenuRow && iasToggleRow) {
		iasToggleRow.insertAdjacentElement("afterend", iasMenuRow);
		iasMenuRow.style.marginLeft = "1.5rem";
	}

	// Travel Ruler Actors Config
	const trMenuBtn = root.querySelector(`button[data-key="${MOD}.travelRulerConfig"]`);
	const trMenuRow = trMenuBtn?.closest(".form-group");
	const trToggleCheckbox = root.querySelector(`input[name="${MOD}.travelRuler"]`);
	const trToggleRow = trToggleCheckbox?.closest(".form-group");
	if (trMenuRow && trToggleRow) {
		trToggleRow.insertAdjacentElement("afterend", trMenuRow);
		trMenuRow.style.marginLeft = "1.5rem";
	}
});
