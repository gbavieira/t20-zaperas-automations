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
     - 1× init (travelRuler)     → registra a régua de Mapa de Viagem antes do Canvas
   ============================================================ */

import { handleTokenLinks } from "./utils/token-links.mjs";
import { unwrapHtml } from "./utils/dom.mjs";
import {
  DEFAULT_OPPOSED_CHECKS_DATA,
  DEFAULT_LIFE_DRAIN_SPELLS,
  DEFAULT_POISON_ITEMS,
} from "./config.mjs";
import { OpposedChecksConfig } from "./apps/opposed-checks-config.mjs";
import { LifeDrainConfig } from "./apps/life-drain-config.mjs";
import { TravelRulerActorConfig } from "./apps/travel-ruler-config.mjs";
import { ItemAutoSaveConfig } from "./apps/item-auto-save-config.mjs";
import { MOD } from "./config.mjs";

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
  `modules/${MOD}/templates/condition-turns/em-chamas.hbs`,
  `modules/${MOD}/templates/condition-turns/sangrando.hbs`,
  `modules/${MOD}/templates/condition-turns/teste-morte.hbs`,
  `modules/${MOD}/templates/condition-turns/confuso.hbs`,
  `modules/${MOD}/templates/condition-turns/confuso-prompt.hbs`,
  `modules/${MOD}/templates/life-drain-config/spell-editor.hbs`,
  `modules/${MOD}/templates/opposed-checks-config/rule-editor.hbs`,
  `modules/${MOD}/templates/travel-ruler-config/actor-picker.hbs`,
];

// ── Registro de configurações (deve rodar em "init") ─────────

Hooks.once("init", async () => {
  await foundry.applications.handlebars.loadTemplates(MOD_TEMPLATES);

  // Helper para exibir arrays como string no HBS
  Handlebars.registerHelper("join", (arr, sep) =>
    Array.isArray(arr) ? arr.join(sep) : "",
  );

  const automations = [
    {
      key: "autoSave",
      name: "Testes de Resistência Automáticos",
      hint: "Abre prompts de Fortitude, Reflexo ou Vontade automaticamente para tokens afetados por magias.",
    },
    {
      key: "opposedChecks",
      name: "Testes Opostos",
      hint: "Automatiza Enganação vs Percepção/Intuição, Furtividade vs Percepção e Intimidação vs Vontade.",
    },
    {
      key: "defenseCheck",
      name: "Verificador de Defesa",
      hint: "Mostra se o ataque acertou ou errou comparando o total rolado com a Defesa do alvo selecionado.",
    },
    {
      key: "lifeDrain",
      name: "Dreno de Vida",
      hint: "Para magias configuradas (ex: Toque Vampírico), cura o atacante por uma porcentagem do dano causado.",
    },
    {
      key: "sustainedSpell",
      name: "Contador de Magia Sustentada",
      hint: "Aplica efeito ao lançar magias sustentadas e pergunta ao GM a cada turno se deseja pagar o custo em PM.",
    },
    {
      key: "zeroPV",
      name: "Condições em 0 PV",
      hint: "Aplica e remove automaticamente condições (Sangrando, Inconsciente, etc.) quando um ator chega a 0 PV.",
    },
    {
      key: "sortudo",
      name: "Poder Sortudo",
      hint: "Adiciona botão de rerolar em testes de perícia para personagens com o poder Sortudo (custa 3 PM).",
    },
    {
      key: "travelRuler",
      name: "Mapa de Viagem Interativo",
      hint: "Exibe painel de tempo de viagem ao usar a régua em cenas marcadas como 'Mapa de Viagem' (configuração da cena).",
    },
    {
      key: "curaAcelerada",
      name: "Cura Acelerada",
      hint: "A cada turno de uma ameaça com 'cura acelerada' no texto de resistências, pergunta ao GM se deseja regenerar os PV correspondentes.",
    },
    {
      key: "itemAutoSave",
      name: "Testes de Resistência Automáticos (Itens)",
      hint: "Abre prompts de resistência para alvos de itens consumíveis (bombas alquímicas, venenos, fogo alquímico). Calcula a CD automaticamente pela fórmula 10 + ⌊nível/2⌋ + atributo-chave.",
    },
    {
      key: "conditionTurns",
      name: "Condições de Combate",
      hint: "Automatiza condições que afetam o início do turno: Em Chamas (pergunta se apaga), Sangrando (testa Constituição CD 15), Confuso (rola efeito aleatório).",
    },
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

  game.settings.register(MOD, "conditionTurnsPublic", {
    name: "Mostrar Condições de Combate para os Jogadores?",
    hint: "Se marcado, os prompts de Em Chamas/Sangrando aparecem no chat público. Se desmarcado, somente o GM vê.",
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
    default: DEFAULT_OPPOSED_CHECKS_DATA,
  });

  game.settings.registerMenu(MOD, "opposedChecksConfig", {
    name: "Configuração de Testes Opostos",
    hint: "Gerenciar regras de testes opostos (triggers, habilidades, modo).",
    label: "Configurar",
    icon: "fas fa-cog",
    type: OpposedChecksConfig,
    restricted: true,
  });

  // ── Dados persistentes de Dreno de Vida ──────────────────────
  game.settings.register(MOD, "lifeDrainSpells", {
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_LIFE_DRAIN_SPELLS,
  });

  game.settings.registerMenu(MOD, "lifeDrainConfig", {
    name: "Configuração de Dreno de Vida",
    hint: "Gerenciar quais magias ativam o Dreno de Vida e o percentual de cura.",
    label: "Configurar",
    icon: "fas fa-droplet",
    type: LifeDrainConfig,
    restricted: true,
  });

  game.settings.register(MOD, "itemAutoSaveShowCD", {
    name: "Testes de Resistência (Itens) — Mostrar CD no Chat",
    hint: "Se marcado, exibe a CD do teste no dialog de rolagem e no card de resultado para itens alquímicos e venenos. Desmarque para esconder a dificuldade dos jogadores.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
  });

  // ── Dados persistentes de Venenos (Item Auto-Save) ───────
  game.settings.register(MOD, "itemAutoSavePoisons", {
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_POISON_ITEMS,
  });

  game.settings.registerMenu(MOD, "itemAutoSaveConfig", {
    name: "Configuração de Venenos",
    hint: "Gerenciar quais itens consumíveis são tratados como venenos (Fortitude + Int).",
    label: "Configurar",
    icon: "fas fa-skull-crossbones",
    type: ItemAutoSaveConfig,
    restricted: true,
  });

  // ── Dados persistentes de Travel Ruler ───────────────────
  game.settings.register(MOD, "travelRulerActors", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });

  game.settings.registerMenu(MOD, "travelRulerConfig", {
    name: "Configuração de Atores para Viagem",
    hint: "Escolha quais personagens devem ser considerados no cálculo de menor deslocamento.",
    label: "Configurar",
    icon: "fas fa-users",
    type: TravelRulerActorConfig,
    restricted: true,
  });

  // ── Régua de Viagem (deve rodar em init, antes do canvas) ────
  if (game.settings.get(MOD, "travelRuler")) {
    const { registerRulerPatch } = await import("./handlers/travel-ruler.mjs");
    registerRulerPatch();
  }
});

// ── Registro de hooks (roda em "ready") ──────────────────────

Hooks.once("ready", async () => {
  console.info("T20 Zapera | Registrando scripts de automação");

  // ── createChatMessage ────────────────────────────────────
  const createChatHandlers = [];
  if (enabled("autoSave")) {
    const { handleAutoSave } = await import("./handlers/auto-save.mjs");
    createChatHandlers.push(handleAutoSave);
  }
  if (enabled("itemAutoSave")) {
    const { handleItemAutoSave } =
      await import("./handlers/item-auto-save.mjs");
    createChatHandlers.push(handleItemAutoSave);
  }
  if (enabled("opposedChecks")) {
    const { handleOpposedChecks } =
      await import("./handlers/opposed-checks.mjs");
    createChatHandlers.push(handleOpposedChecks);
  }
  if (enabled("defenseCheck")) {
    const { handleDefenseCheck } = await import("./handlers/defense-check.mjs");
    createChatHandlers.push(handleDefenseCheck);
  }
  if (enabled("sustainedSpell")) {
    const { handleSustainCast } =
      await import("./handlers/sustained-spell.mjs");
    createChatHandlers.push(handleSustainCast);
  }
  if (createChatHandlers.length) {
    Hooks.on("createChatMessage", async (message) => {
      for (const handler of createChatHandlers) await handler(message);
    });
  }

  // ── renderChatMessage ────────────────────────────────────
  let _renderDefenseCheck = null;
  if (enabled("defenseCheck")) {
    ({ renderDefenseCheck: _renderDefenseCheck } =
      await import("./handlers/defense-check.mjs"));
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
    const { renderSustainPrompt } =
      await import("./handlers/sustained-spell.mjs");
    renderChatHandlers.push(renderSustainPrompt);
  }
  if (enabled("sortudo")) {
    const { renderSortudo } = await import("./handlers/sortudo.mjs");
    renderChatHandlers.push(renderSortudo);
  }
  if (enabled("curaAcelerada")) {
    const { renderCuraAceleradaPrompt } =
      await import("./handlers/cura-acelerada.mjs");
    renderChatHandlers.push(renderCuraAceleradaPrompt);
  }
  if (enabled("conditionTurns")) {
    const { renderConditionButtons } =
      await import("./handlers/condition-turns.mjs");
    renderChatHandlers.push(renderConditionButtons);
  }
  if (renderChatHandlers.length) {
    Hooks.on("renderChatMessageHTML", async (message, html) => {
      for (const handler of renderChatHandlers) {
        try {
          await handler(message, html);
        } catch (err) {
          console.error(
            "T20 Zapera | renderChatMessageHTML handler error:",
            err,
          );
        }
      }
    });
  }

  // ── updateCombat ─────────────────────────────────────────
  if (enabled("sustainedSpell")) {
    const { handleSustainTurn } =
      await import("./handlers/sustained-spell.mjs");
    Hooks.on("updateCombat", handleSustainTurn);
  }
  if (enabled("curaAcelerada")) {
    const { handleCuraAceleradaTurn } =
      await import("./handlers/cura-acelerada.mjs");
    Hooks.on("updateCombat", handleCuraAceleradaTurn);
  }
  if (enabled("conditionTurns")) {
    const { handleConditionTurns } =
      await import("./handlers/condition-turns.mjs");
    Hooks.on("updateCombat", handleConditionTurns);
  }

  // ── updateActor ──────────────────────────────────────────
  if (enabled("zeroPV")) {
    const { handleZeroPV } = await import("./handlers/zero-pv.mjs");
    Hooks.on("updateActor", handleZeroPV);
  }

  // ── travelRuler ──────────────────────────────────────────
  if (enabled("travelRuler")) {
    const { injectSceneConfigCheckbox } =
      await import("./handlers/travel-ruler.mjs");
    Hooks.on("renderSceneConfig", injectSceneConfigCheckbox);
  }

  console.info("T20 Zapera | Scripts de automação registrados");
});

// ── Reposiciona os botões "Configurar" logo após seus toggles ──
Hooks.on("renderSettingsConfig", (_app, html) => {
  const root = unwrapHtml(html);
  if (!root) return;

  // Move o `.form-group` que contém o `childSel` para logo após o que
  // contém o `parentSel`, e recua o filho. Sem-op se algum lado faltar.
  const placeAfter = (parentSel, childSel) => {
    const parent = root.querySelector(parentSel)?.closest(".form-group");
    const child = root.querySelector(childSel)?.closest(".form-group");
    if (!parent || !child) return null;
    parent.insertAdjacentElement("afterend", child);
    child.style.marginLeft = "1.5rem";
    return child;
  };

  const inp = (key) => `input[name="${MOD}.${key}"]`;
  const btn = (key) => `button[data-key="${MOD}.${key}"]`;

  placeAfter(inp("autoSave"), inp("autoSaveShowCD"));
  placeAfter(inp("defenseCheck"), inp("defenseCheckPublic"));
  placeAfter(inp("sustainedSpell"), inp("sustainedSpellPublic"));
  placeAfter(inp("conditionTurns"), inp("conditionTurnsPublic"));
  placeAfter(inp("opposedChecks"), btn("opposedChecksConfig"));

  // Testes Opostos: GMOnly após o toggle, TargetsOnly após GMOnly (ou toggle).
  const ocGMOnly = placeAfter(inp("opposedChecks"), inp("opposedChecksGMOnly"));
  placeAfter(
    ocGMOnly ? inp("opposedChecksGMOnly") : inp("opposedChecks"),
    inp("opposedChecksTargetsOnly"),
  );

  placeAfter(inp("lifeDrain"), btn("lifeDrainConfig"));

  // Item Auto-Save: showCD após toggle, menu após showCD (ou toggle).
  const iasShowCD = placeAfter(inp("itemAutoSave"), inp("itemAutoSaveShowCD"));
  placeAfter(
    iasShowCD ? inp("itemAutoSaveShowCD") : inp("itemAutoSave"),
    btn("itemAutoSaveConfig"),
  );

  placeAfter(inp("travelRuler"), btn("travelRulerConfig"));

  // Separadores visuais entre grupos de automações principais
  const dividerStyle =
    "border: none; border-top: 1px solid #c9b77a; margin: 10px 0 4px;";
  const parentKeys = [
    "autoSave",
    "itemAutoSave",
    "defenseCheck",
    "opposedChecks",
    "lifeDrain",
    "sustainedSpell",
    "sortudo",
    "zeroPV",
    "conditionTurns",
    "travelRuler",
    "curaAcelerada",
  ];
  for (const key of parentKeys) {
    const fg = root.querySelector(inp(key))?.closest(".form-group");
    if (fg) {
      fg.insertAdjacentHTML("beforebegin", `<hr style="${dividerStyle}">`);
    }
  }
});
