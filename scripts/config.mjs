/* ============================================================
   T20 Automações — Configuração
   Definições data-driven para todos os handlers de automação.
   ============================================================ */

/**
 * Definições de testes opostos.
 * Cada entrada configura um trigger de chat + modo de defesa.
 *
 * defenseMode:
 *   "choice" — GM escolhe entre skills (ex: Enganação → Perc ou Intu)
 *   "fixed"  — skill fixa, GM arrasta atores no picker
 *   "auto"   — rola automaticamente para todos os tokens no canvas
 */
export const OPPOSED_CHECKS = [
	{
		id: "enganacao",
		triggers: ["Enganação"],
		defenseMode: "choice",
		defenseChoices: [
			{ key: "perc", label: "Percepção", abbr: "Perc", icon: "fa-eye" },
			{ key: "intu", label: "Intuição", abbr: "Intu", icon: "fa-brain" }
		],
		emoji: "🎭",
		attackLabel: "Enganação",
		headerText: (abbr) => `${abbr} vs Enga`
	},
	{
		id: "furtividade",
		triggers: ["Furtividade"],
		defenseMode: "auto",
		defenseSkill: { key: "perc", label: "Percepção", abbr: "Perc" },
		emoji: "🔍",
		attackLabel: "Furtividade",
		headerText: () => "Percepção vs Furtividade",
		tokenLinkClass: "t20-perc-token"
	},
	{
		id: "intimidacao",
		triggers: ["Intimida", "Intimidação"],
		defenseMode: "fixed",
		defenseSkill: { key: "vont", label: "Vontade", abbr: "Vont" },
		emoji: "😤",
		attackLabel: "Intimidação",
		headerText: () => "Vont vs Inti"
	}
];

/** Condições aplicadas/removidas ao chegar a 0 PV */
export const ZERO_PV_CONDITIONS = {
	apply: ["sangrando", "indefeso", "desprevenido", "caido", "inconsciente"],
	remove: ["sangrando", "indefeso", "desprevenido", "inconsciente"]
};

/** Mapeamento de texto de resistência → skill key */
export const SAVE_TYPES = {
	fortitude: "fort",
	reflexo: "refl",
	vontade: "vont"
};

/** Flags usadas pelo handler de 0 PV */
export const ZERO_PV_FLAG = "t20AutoZeroPV";
export const ZERO_PV_FLAG_STATUS = "t20AutoZeroPVStatus";

/**
 * Magias/poderes com dreno de vida.
 * Ao aplicar dano, cura o atacante por uma porcentagem do dano causado.
 *
 * name          — nome da magia/poder (comparação case-insensitive, sem acentos)
 * healPercent   — porcentagem de cura (ex: 50 = metade do dano)
 * sequencerFile — arquivo de efeito do Sequencer/JB2A (opcional)
 */
export const LIFE_DRAIN_SPELLS = [
	{
		name: "Toque Vampírico",
		healPercent: 50,
		sequencerFile: "jb2a.energy_beam.normal.dark_red"
	}
];
