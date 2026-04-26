/* ============================================================
   T20 Automações — App: Configuração de Dreno de Vida

   ApplicationV2 CRUD para gerenciar quais magias ativam
   o Dreno de Vida e seus parâmetros (percentual de cura,
   efeito Sequencer).
   ============================================================ */

import { normalizeText } from "../utils/text.mjs";

const MOD = "t20-zaperas-automations";
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } =
  foundry.applications.api;

// ── Editor de Magia (DialogV2) ──────────────────────────────

/**
 * Abre um dialog para criar/editar uma configuração de magia de drain.
 * @param {object|null} spell  Configuração existente (edição) ou null (criação)
 * @returns {Promise<object|null>} Configuração atualizada ou null se cancelado
 */
export async function openSpellEditor(spell) {
  const isNew = !spell;
  const s = spell ?? {
    name: "",
    healPercent: 50,
    tempHP: false,
  };

  const content = `
<form id="spell-editor-form" style="display:grid;gap:10px;padding:4px 2px;">
  <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;">
    <label style="font-weight:bold;">Magia / Poder:</label>
    <div id="spell-drop-zone" style="border:2px dashed #ccc;border-radius:4px;padding:12px;background:#fafafa;cursor:grab;min-height:40px;display:flex;align-items:center;justify-content:center;text-align:center;">
      ${s.name ? `<strong>${s.name}</strong>` : `<em style="color:#999;">Arraste uma magia ou poder aqui</em>`}
    </div>
    <input type="hidden" name="spellName" value="${s.name}">

    <label style="font-weight:bold;">Cura (%):</label>
    <input type="number" name="healPercent" value="${s.healPercent}" min="0" max="100" style="width:80px;">

    <label style="font-weight:bold;">Concede PV Temporários:</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      <input type="checkbox" name="tempHP" ${s.tempHP ? "checked" : ""}>
      <span style="font-size:0.88em;color:#555;">Ao invés de curar PV, concede PV temporários</span>
    </label>
  </div>
</form>`;

  // Wiring do drag-drop — será feito no Hooks.once("renderDialogV2", ...)
  Hooks.once("renderDialogV2", (_app, dialogHtml) => {
    const root =
      dialogHtml instanceof HTMLElement
        ? dialogHtml
        : (dialogHtml[0] ?? dialogHtml);
    const dropZone = root.querySelector("#spell-drop-zone");
    const spellNameInput = root.querySelector("[name=spellName]");

    if (!dropZone || !spellNameInput) return;

    dropZone.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      dropZone.style.borderColor = "#666";
      dropZone.style.backgroundColor = "#eee";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#ccc";
      dropZone.style.backgroundColor = "#fafafa";
    });

    dropZone.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      dropZone.style.borderColor = "#ccc";
      dropZone.style.backgroundColor = "#fafafa";

      const data = JSON.parse(ev.dataTransfer.getData("text/plain"));

      // Aceita apenas itens
      if (data.type !== "Item") {
        ui.notifications.warn("Apenas itens podem ser adicionados.");
        return;
      }

      // Resolve UUID e verifica se é magia
      const item = await fromUuid(data.uuid);
      if (!item) {
        ui.notifications.warn("Magia não encontrada.");
        return;
      }

      if (item.type !== "magia" && item.type !== "poder") {
        ui.notifications.warn(
          "Apenas itens do tipo Magia ou Poder são aceitos.",
        );
        return;
      }

      // Atualiza o input hidden e o visual
      spellNameInput.value = item.name;
      dropZone.innerHTML = `<strong>${item.name}</strong>`;
    });
  });

  return DialogV2.wait({
    window: {
      title: isNew ? "Adicionar Magia" : `Editar — ${s.name}`,
      icon: "fas fa-wand-magic-sparkles",
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

          const spellName = form.querySelector("[name=spellName]").value.trim();
          const healPercent = Number(
            form.querySelector("[name=healPercent]").value,
          );
          const tempHP = form.querySelector("[name=tempHP]").checked;

          if (!spellName) {
            ui.notifications.warn(
              "Arraste uma magia ou poder na zona de drop.",
            );
            return null;
          }

          if (isNaN(healPercent) || healPercent < 0 || healPercent > 100) {
            ui.notifications.warn("A cura deve estar entre 0 e 100.");
            return null;
          }

          return {
            name: spellName,
            healPercent,
            tempHP,
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

export class LifeDrainConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    const raw = game.settings.get(MOD, "lifeDrainSpells") ?? [];
    this.rules = foundry.utils.deepClone(raw);
  }

  static DEFAULT_OPTIONS = {
    window: {
      title: "Configuração de Dreno de Vida",
      icon: "fas fa-droplet",
      resizable: true,
    },
    position: { width: 540 },
    classes: ["tormenta20", "t20-zaperas-config"],
    actions: {
      addSpell: LifeDrainConfig.#addSpell,
      deleteSpell: LifeDrainConfig.#deleteSpell,
      resetDefaults: LifeDrainConfig.#resetDefaults,
      save: LifeDrainConfig.#save,
    },
  };

  static PARTS = {
    main: {
      template: `modules/${MOD}/templates/life-drain-config/main.hbs`,
    },
  };

  async _prepareContext(_options) {
    return {
      rules: this.rules,
    };
  }

  static async #addSpell(_ev, _target) {
    const newSpell = await openSpellEditor(null);
    if (!newSpell) return;

    // Verifica duplicidade de nome (normalizado)
    const normalizedNew = normalizeText(newSpell.name);
    if (this.rules.some((r) => normalizeText(r.name) === normalizedNew)) {
      ui.notifications.warn(
        `Já existe uma magia "${newSpell.name}" configurada.`,
      );
      return;
    }

    this.rules.push(newSpell);
    this.render();
  }

  static async #deleteSpell(_ev, target) {
    const idx = Number(target.closest("[data-idx]").dataset.idx);
    const confirmed = await DialogV2.confirm({
      window: { title: "Excluir Magia" },
      content: `<p>Excluir a magia <b>${this.rules[idx].name}</b> da configuração?</p>`,
    });
    if (!confirmed) return;
    this.rules.splice(idx, 1);
    this.render();
  }

  static async #resetDefaults(_ev, _target) {
    const confirmed = await DialogV2.confirm({
      window: { title: "Restaurar Padrão" },
      content:
        "<p>Restaurar a configuração padrão? As magias atuais serão <b>perdidas</b>.</p>",
    });
    if (!confirmed) return;

    const { DEFAULT_LIFE_DRAIN_SPELLS } = await import("../config.mjs");
    this.rules = foundry.utils.deepClone(DEFAULT_LIFE_DRAIN_SPELLS);
    this.render();
  }

  static async #save(_ev, _target) {
    await game.settings.set(MOD, "lifeDrainSpells", this.rules);
    ui.notifications.info("T20 Zapera | Dreno de Vida: configuração salva.");
    this.close();
  }
}
