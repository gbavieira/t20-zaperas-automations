/* ============================================================
   T20 Automações — Configuração
   Definições data-driven para todos os handlers de automação.
   ============================================================ */

/** Nome do Módulo */
export const MOD = "t20-zaperas-automations";

// ── Ícones padrão por skill key (para modo "choice") ────────
const SKILL_ICONS = {
  perc: "fa-eye",
  intu: "fa-brain",
  vont: "fa-shield-halved",
  fort: "fa-heart-pulse",
  refl: "fa-person-running",
  enga: "fa-masks-theater",
  furt: "fa-user-ninja",
  inti: "fa-face-angry",
  default: "fa-dice-d20",
};

/**
 * Dados padrão serializados dos testes opostos.
 * Armazenados no world setting "opposedChecksData".
 * Sem funções — apenas dados JSON puros.
 *
 * defenseMode:
 *   "choice" — GM escolhe entre skills; defenseSkillKeys tem N elementos
 *   "fixed"  — skill fixa, GM arrasta atores no picker; defenseSkillKeys tem 1 elemento
 *   "auto"   — rola automaticamente para todos os tokens no canvas; defenseSkillKeys tem 1 elemento
 */
export const DEFAULT_OPPOSED_CHECKS_DATA = [
  {
    id: "enga",
    defenseMode: "choice",
    attackSkillKey: "enga",
    defenseSkillKeys: ["perc", "intu"],
  },
  {
    id: "furt",
    defenseMode: "auto",
    attackSkillKey: "furt",
    defenseSkillKeys: ["perc"],
    tokenLinkClass: "t20-perc-token",
  },
  {
    id: "inti",
    defenseMode: "fixed",
    attackSkillKey: "inti",
    defenseSkillKeys: ["vont"],
  },
];

/**
 * Converte dados serializados do world setting para o formato runtime
 * que opposed-checks.mjs espera (incluindo funções como headerText).
 * Chamado a cada mensagem de chat — lê o setting atualizado.
 */
export function buildRuntimeChecks() {
  let stored;
  try {
    stored = game.settings.get(MOD, "opposedChecksData");
  } catch {
    stored = null;
  }
  const data =
    Array.isArray(stored) && stored.length
      ? stored
      : DEFAULT_OPPOSED_CHECKS_DATA;
  return data.map(_buildRuntimeCheck);
}

function _buildRuntimeCheck(rule) {
  const pericias = CONFIG.T20?.pericias ?? {};

  function getLabel(key) {
    const periciaLabel = pericias[key]?.label;
    return periciaLabel ? (game.i18n.localize(periciaLabel) ?? key) : key;
  }
  function getAbbr(key) {
    return getLabel(key).substring(0, 4);
  }

  const attackAbbr = getAbbr(rule.attackSkillKey);
  const attackLabel = getLabel(rule.attackSkillKey);

  const check = {
    id: rule.id,
    triggers: [attackLabel],
    defenseMode: rule.defenseMode,
    attackLabel,
    tokenLinkClass: rule.tokenLinkClass ?? "t20-contest-token",
  };

  if (rule.defenseMode === "choice") {
    check.defenseChoices = rule.defenseSkillKeys.map((key) => ({
      key,
      label: getLabel(key),
      abbr: getAbbr(key),
      icon: SKILL_ICONS[key] ?? SKILL_ICONS.default,
    }));
    check.headerText = (abbr) => `${abbr} vs ${attackAbbr}`;
  } else {
    const defKey = rule.defenseSkillKeys[0];
    const defAbbr = getAbbr(defKey);
    check.defenseSkill = {
      key: defKey,
      label: getLabel(defKey),
      abbr: defAbbr,
    };
    check.headerText = () => `${defAbbr} vs ${attackAbbr}`;
  }

  return check;
}

/** Condições aplicadas/removidas ao chegar a 0 PV */
export const ZERO_PV_CONDITIONS = {
  apply: ["sangrando", "indefeso", "desprevenido", "caido", "inconsciente"],
  remove: ["sangrando", "indefeso", "desprevenido", "inconsciente"],
};

/** Flags usadas pelo handler de 0 PV */
export const ZERO_PV_FLAG = "t20AutoZeroPV";
export const ZERO_PV_FLAG_STATUS = "t20AutoZeroPVStatus";

/**
 * Magias/poderes com dreno de vida.
 * Ao aplicar dano, cura o atacante por uma porcentagem do dano causado.
 *
 * name        — nome da magia/poder (comparação case-insensitive, sem acentos)
 * healPercent — porcentagem de cura (ex: 50 = metade do dano)
 * tempHP      — se true, concede PV temporário; senão cura PV normal
 */
export const DEFAULT_LIFE_DRAIN_SPELLS = [
  {
    name: "Toque Vampírico",
    healPercent: 50,
    tempHP: false,
  },
];

/**
 * Obtém a lista de magias de Dreno de Vida do world setting,
 * ou usa os padrões se não configurado.
 */
export function getLifeDrainSpells() {
  return (
    game.settings.get("t20-zaperas-automations", "lifeDrainSpells") ??
    DEFAULT_LIFE_DRAIN_SPELLS
  );
}

/**
 * Lista padrão de itens consumíveis considerados venenos para o
 * Teste de Resistência Automático (Itens). Vazia por padrão — o GM
 * adiciona via drag-drop no menu de configuração.
 */
export const DEFAULT_POISON_ITEMS = [
  { name: "Beladona" },
  { name: "Bruma Sonolenta" },
  { name: "Cicuta" },
  { name: "Essência de Sombra" },
  { name: "Névoa Tóxica" },
  { name: "Peçonha Comum" },
  { name: "Peçonha Concentrada" },
  { name: "Peçonha Potente" },
  { name: "Pó de Lich" },
  { name: "Riso do Louco" },
  { name: "Veneno de aranha gigante" },
];

/** Flag usada pelos handlers de Condições de Combate */
export const CONDITION_TURNS_FLAG = "conditionTurnsPrompt";

/**
 * StatusIds das três condições de combate automatizadas.
 * Baseados em CONFIG.T20.conditions — verifique em runtime se os nomes
 * exatos diferem em sua versão do T20.
 */
export const CONDITION_STATUS_IDS = {
  emchamas: "emchamas",
  sangrando: "sangrando",
  confuso: "confuso",
};
