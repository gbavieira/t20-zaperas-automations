/* ============================================================
   T20 Automações — App: Configuração de Testes Opostos

   ApplicationV2 CRUD para gerenciar regras de testes opostos.
   Aberto via game.settings.registerMenu.
   ============================================================ */

import { DEFAULT_OPPOSED_CHECKS_DATA } from "../config.mjs";
import { MOD } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } =
  foundry.applications.api;

// ── Editor de Regra (DialogV2) ──────────────────────────────

/**
 * Abre um dialog para criar/editar uma regra de teste oposto.
 * @param {object|null} rule  Regra existente (edição) ou null (criação)
 * @returns {Promise<object|null>} Regra atualizada ou null se cancelado
 */
export async function openRuleEditor(rule) {
  const pericias = CONFIG.T20?.pericias ?? {};

  // Filtra ofícios (crafting) e ordena alfabeticamente
  const skillEntries = Object.entries(pericias)
    .filter(([, v]) => !v.crafting)
    .sort(([, a], [, b]) => {
      const la = game.i18n.localize(a.label) ?? "";
      const lb = game.i18n.localize(b.label) ?? "";
      return la.localeCompare(lb);
    });

  const isNew = !rule;
  const r = rule ?? {
    defenseMode: "auto",
    attackSkillKey: skillEntries[0]?.[0] ?? "",
    defenseSkillKeys: [],
  };

  function skillOptions(selectedKey) {
    return skillEntries
      .map(([key, v]) => {
        const label = game.i18n.localize(v.label) ?? key;
        return `<option value="${key}" ${key === selectedKey ? "selected" : ""}>${label}</option>`;
      })
      .join("");
  }

  function defenseCheckboxes() {
    return skillEntries
      .map(([key, v]) => {
        const label = game.i18n.localize(v.label) ?? key;
        const checked = r.defenseSkillKeys.includes(key) ? "checked" : "";
        return `<label style="display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;">
					<input type="checkbox" name="defenseChoice" value="${key}" ${checked}>
					${label}
				</label>`;
      })
      .join("");
  }

  const content = `
<form id="rule-editor-form" style="display:grid;gap:10px;padding:4px 2px;">
  <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;">
    <label style="font-weight:bold;">Perícia de Ataque:</label>
    <select name="attackSkillKey">${skillOptions(r.attackSkillKey)}</select>

    <label style="font-weight:bold;">Modo:</label>
    <select name="defenseMode">
      <option value="auto"   ${r.defenseMode === "auto" ? "selected" : ""}>Auto (todos no canvas)</option>
      <option value="fixed"  ${r.defenseMode === "fixed" ? "selected" : ""}>Fixo (GM escolhe atores)</option>
      <option value="choice" ${r.defenseMode === "choice" ? "selected" : ""}>Escolha (GM escolhe perícia)</option>
    </select>
  </div>

  <fieldset style="border:1px solid #ccc;padding:8px 12px;border-radius:4px;margin:0;">
    <legend style="font-weight:bold;padding:0 4px;">Perícias de Defesa</legend>
    <div id="defense-checkboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;padding:2px;">
      ${defenseCheckboxes()}
    </div>
    <small style="color:#888;margin-top:6px;display:block;">
      Auto / Fixo: selecione 1. &nbsp; Escolha: selecione 2 ou mais.
    </small>
  </fieldset>
</form>`;

  // Set up intelligent checkbox disable behavior after dialog renders
  Hooks.once("renderDialogV2", (_app, dialogHtml) => {
    const root =
      dialogHtml instanceof HTMLElement
        ? dialogHtml
        : (dialogHtml[0] ?? dialogHtml);
    const modeSelect = root.querySelector("[name=defenseMode]");
    const container = root.querySelector("#defense-checkboxes");
    if (!modeSelect || !container) return;

    function updateDisableState() {
      const mode = modeSelect.value;
      const checkboxes = [
        ...container.querySelectorAll("input[type=checkbox]"),
      ];
      if (mode === "choice") {
        // Modo Escolha: todos habilitados
        checkboxes.forEach((cb) => {
          cb.disabled = false;
        });
        return;
      }
      // Modo Auto ou Fixo: desabilita todos se 1 está marcado
      const checkedCount = checkboxes.filter((cb) => cb.checked).length;
      checkboxes.forEach((cb) => {
        cb.disabled = checkedCount >= 1 && !cb.checked;
      });
    }

    modeSelect.addEventListener("change", updateDisableState);
    container.addEventListener("change", updateDisableState);
    updateDisableState(); // estado inicial
  });

  return DialogV2.wait({
    window: {
      title: isNew ? "Adicionar Regra" : `Editar — ${r.id}`,
      icon: "fas fa-edit",
    },
    content,
    rejectClose: false,
    position: { width: 480 },
    buttons: [
      {
        action: "confirm",
        icon: "fas fa-check",
        label: "Confirmar",
        callback: (_ev, button) => {
          const form = button.form;
          if (!form) return null;

          const attackSkillKey = form.querySelector(
            "[name=attackSkillKey]",
          ).value;
          const defenseMode = form.querySelector("[name=defenseMode]").value;
          const defenseSkillKeys = [
            ...form.querySelectorAll("[name=defenseChoice]:checked"),
          ].map((cb) => cb.value);

          if (defenseMode === "choice" && defenseSkillKeys.length < 2) {
            ui.notifications.warn(
              "Modo 'Escolha' requer pelo menos 2 perícias de defesa.",
            );
            return null;
          }
          if (defenseMode !== "choice" && defenseSkillKeys.length !== 1) {
            ui.notifications.warn("Selecione exatamente 1 perícia de defesa.");
            return null;
          }

          return {
            id: attackSkillKey,
            defenseMode,
            attackSkillKey,
            defenseSkillKeys,
            tokenLinkClass: r.tokenLinkClass,
          };
        },
      },
      {
        action: "cancel",
        icon: "fas fa-times",
        label: "Cancelar",
        callback: () => null,
      },
    ],
  });
}

// ── ApplicationV2 CRUD ──────────────────────────────────────

export class OpposedChecksConfig extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(options = {}) {
    super(options);
    const raw =
      game.settings.get(MOD, "opposedChecksData") ??
      DEFAULT_OPPOSED_CHECKS_DATA;
    this.rules = foundry.utils.deepClone(raw).map((r) => ({
      defenseSkillKeys: [],
      ...r,
    }));
  }

  static DEFAULT_OPTIONS = {
    window: {
      title: "Configuração de Testes Opostos",
      icon: "fas fa-cog",
      resizable: true,
    },
    position: { width: 540 },
    classes: ["tormenta20", "t20-zaperas-config"],
    actions: {
      addRule: OpposedChecksConfig.#addRule,
      editRule: OpposedChecksConfig.#editRule,
      deleteRule: OpposedChecksConfig.#deleteRule,
      resetDefaults: OpposedChecksConfig.#resetDefaults,
      save: OpposedChecksConfig.#save,
    },
  };

  static PARTS = {
    main: {
      template: `modules/${MOD}/templates/opposed-checks-config/main.hbs`,
    },
  };

  async _prepareContext(_options) {
    const modeLabel = { auto: "Auto", choice: "Escolha", fixed: "Fixo" };

    function getLabel(key) {
      const p = CONFIG.T20?.pericias?.[key];
      return p ? (game.i18n.localize(p.label) ?? key) : key;
    }

    return {
      rules: this.rules.map((r) => ({
        ...r,
        attackLabel: getLabel(r.attackSkillKey),
        defenseLabels: (r.defenseSkillKeys ?? []).map(getLabel).join(", "),
        modeLabel: modeLabel[r.defenseMode] ?? r.defenseMode,
      })),
    };
  }

  static async #editRule(_ev, target) {
    const idx = Number(target.closest("[data-idx]").dataset.idx);
    const updated = await openRuleEditor(this.rules[idx]);
    if (!updated) return;
    this.rules[idx] = updated;
    this.render();
  }

  static async #addRule(_ev, _target) {
    const newRule = await openRuleEditor(null);
    if (!newRule) return;
    // Verifica duplicidade de ID
    if (this.rules.some((r) => r.id === newRule.id)) {
      ui.notifications.warn(`Já existe uma regra com o ID "${newRule.id}".`);
      return;
    }
    this.rules.push(newRule);
    this.render();
  }

  static async #deleteRule(_ev, target) {
    const idx = Number(target.closest("[data-idx]").dataset.idx);
    const confirmed = await DialogV2.confirm({
      window: { title: "Excluir Regra" },
      content: `<p>Excluir a regra <b>${this.rules[idx].id}</b>?</p>`,
    });
    if (!confirmed) return;
    this.rules.splice(idx, 1);
    this.render();
  }

  static async #resetDefaults(_ev, _target) {
    const confirmed = await DialogV2.confirm({
      window: { title: "Restaurar Padrão" },
      content:
        "<p>Restaurar as 3 regras padrão? As regras atuais serão <b>perdidas</b>.</p>",
    });
    if (!confirmed) return;
    this.rules = foundry.utils.deepClone(DEFAULT_OPPOSED_CHECKS_DATA);
    this.render();
  }

  static async #save(_ev, _target) {
    await game.settings.set(MOD, "opposedChecksData", this.rules);
    ui.notifications.info("T20 Zapera | Testes Opostos: configuração salva.");
    this.close();
  }
}
