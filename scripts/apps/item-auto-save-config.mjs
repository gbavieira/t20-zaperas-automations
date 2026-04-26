/* ============================================================
   T20 Automações — App: Configuração de Venenos (Item Auto-Save)

   ApplicationV2 CRUD para gerenciar quais itens consumíveis
   são considerados venenos (teste de Fortitude + CD Int).
   ============================================================ */

import { normalizeText } from "../utils/text.mjs";

const MOD = "t20-zaperas-automations";
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } =
  foundry.applications.api;

// ── ApplicationV2 CRUD ──────────────────────────────────────

export class ItemAutoSaveConfig extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(options = {}) {
    super(options);
    const raw = game.settings.get(MOD, "itemAutoSavePoisons") ?? [];
    // Normaliza: aceita lista de strings OU lista de objetos {name}
    this.rules = foundry.utils
      .deepClone(raw)
      .map((r) => (typeof r === "string" ? { name: r } : r));
  }

  static DEFAULT_OPTIONS = {
    window: {
      title: "Configuração de Venenos",
      icon: "fas fa-skull-crossbones",
      resizable: true,
    },
    position: { width: 480 },
    classes: ["tormenta20", "t20-zaperas-config"],
    actions: {
      deleteItem: ItemAutoSaveConfig.#deleteItem,
      resetDefaults: ItemAutoSaveConfig.#resetDefaults,
      save: ItemAutoSaveConfig.#save,
    },
  };

  static PARTS = {
    main: {
      template: `modules/${MOD}/templates/item-auto-save-config/main.hbs`,
    },
  };

  async _prepareContext(_options) {
    return {
      rules: this.rules,
    };
  }

  _onRender(_context, _options) {
    // Wiring de drag-drop na zona principal
    const root = this.element;
    if (!root) return;

    const dropZone = root.querySelector("#poison-drop-zone");
    if (!dropZone) return;

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

      let data;
      try {
        data = JSON.parse(ev.dataTransfer.getData("text/plain"));
      } catch {
        ui.notifications.warn("Dado de arraste inválido.");
        return;
      }

      if (data.type !== "Item") {
        ui.notifications.warn("Apenas itens podem ser adicionados.");
        return;
      }

      const item = await fromUuid(data.uuid);
      if (!item) {
        ui.notifications.warn("Item não encontrado.");
        return;
      }

      // O sistema T20 usa item.system.tipo === "alchemy" para alquímicos/venenos
      if (item.system?.tipo !== "alchemy") {
        ui.notifications.warn(
          "Apenas itens alquímicos (venenos, bombas, etc.) são aceitos.",
        );
        return;
      }

      const normalizedNew = normalizeText(item.name);
      if (this.rules.some((r) => normalizeText(r.name) === normalizedNew)) {
        ui.notifications.warn(`"${item.name}" já está na lista.`);
        return;
      }

      this.rules.push({ name: item.name });
      this.render({ force: true });
    });
  }

  static async #deleteItem(_ev, target) {
    const idx = Number(target.closest("[data-idx]").dataset.idx);
    const confirmed = await DialogV2.confirm({
      window: { title: "Remover Veneno" },
      content: `<p>Remover <b>${this.rules[idx].name}</b> da lista de venenos?</p>`,
    });
    if (!confirmed) return;
    this.rules.splice(idx, 1);
    this.render({ force: true });
  }

  static async #resetDefaults(_ev, _target) {
    const confirmed = await DialogV2.confirm({
      window: { title: "Restaurar Padrão" },
      content:
        "<p>Limpar a lista de venenos? Os itens atuais serão <b>perdidos</b>.</p>",
    });
    if (!confirmed) return;

    const { DEFAULT_POISON_ITEMS } = await import("../config.mjs");
    this.rules = foundry.utils.deepClone(DEFAULT_POISON_ITEMS);
    this.render({ force: true });
  }

  static async #save(_ev, _target) {
    await game.settings.set(MOD, "itemAutoSavePoisons", this.rules);
    ui.notifications.info("T20 Zapera | Venenos: configuração salva.");
    this.close();
  }
}
