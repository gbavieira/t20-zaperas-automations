/* ============================================================
   T20 Automações — App: Configuração de Travel Ruler

   ApplicationV2 CRUD para gerenciar quais atores (personagens
   de jogador) entram no cálculo de "menor deslocamento" do
   Travel Ruler. Fallback: todos os PCs.
   ============================================================ */

const MOD = "t20-zaperas-automations";
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } =
  foundry.applications.api;

// ── Actor Picker Dialog (DialogV2) ──────────────────────────

/**
 * Abre um dialog para selecionar um ator (personagem).
 * @returns {Promise<string|null>} UUID do ator ou null se cancelado
 */
export async function openActorPickerDialog() {
  const content = `
<div style="display:grid;gap:10px;padding:4px 2px;">
  <label style="font-weight:bold;">Arraste um personagem:</label>
  <div id="actor-drop-zone" style="border:2px dashed #ccc;border-radius:4px;padding:12px;background:#fafafa;cursor:grab;min-height:40px;display:flex;align-items:center;justify-content:center;text-align:center;color:#999;">
    <em>Arraste um personagem aqui</em>
  </div>
  <input type="hidden" name="actorUuid" value="">
</div>`;

  let selectedUuid = null;

  Hooks.once("renderDialogV2", (_app, dialogHtml) => {
    const root =
      dialogHtml instanceof HTMLElement
        ? dialogHtml
        : (dialogHtml[0] ?? dialogHtml);
    const dropZone = root.querySelector("#actor-drop-zone");
    const uuidInput = root.querySelector("[name=actorUuid]");

    if (!dropZone || !uuidInput) return;

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

      // Verifica se é um ator (data.type === "Actor", não Item)
      if (data.type !== "Actor") {
        ui.notifications.warn("Apenas atores podem ser adicionados.");
        return;
      }

      // Resolve o UUID e verifica se é personagem
      const actor = await fromUuid(data.uuid);
      if (!actor) {
        ui.notifications.warn("Ator não encontrado.");
        return;
      }

      if (actor.type !== "character") {
        ui.notifications.warn("Apenas atores do tipo Personagem são aceitos.");
        return;
      }

      // Atualiza o input hidden e o visual
      selectedUuid = actor.uuid;
      uuidInput.value = actor.uuid;
      dropZone.innerHTML = `<strong>${actor.name}</strong>`;
    });
  });

  return DialogV2.wait({
    window: {
      title: "Adicionar Personagem",
      icon: "fas fa-person",
    },
    content,
    rejectClose: false,
    position: { width: 420 },
    buttons: [
      {
        action: "confirm",
        icon: "fas fa-check",
        label: "Confirmar",
        callback: () => selectedUuid,
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

export class TravelRulerActorConfig extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(options = {}) {
    super(options);
    const raw = game.settings.get(MOD, "travelRulerActors") ?? [];
    this.actors = foundry.utils.deepClone(raw);
  }

  static DEFAULT_OPTIONS = {
    window: {
      title: "Configuração de Atores para Viagem",
      icon: "fas fa-users",
      resizable: true,
    },
    position: { width: 540 },
    classes: ["tormenta20", "t20-zaperas-config"],
    actions: {
      addActor: TravelRulerActorConfig.#addActor,
      removeActor: TravelRulerActorConfig.#removeActor,
      resetDefaults: TravelRulerActorConfig.#resetDefaults,
      save: TravelRulerActorConfig.#save,
    },
  };

  static PARTS = {
    main: {
      template: `modules/${MOD}/templates/travel-ruler-config/main.hbs`,
    },
  };

  async _prepareContext(_options) {
    const resolved = this.actors.map((uuid) => {
      const actor = game.actors?.get(uuid.replace("Actor.", ""));
      return {
        uuid,
        name: actor?.name ?? "⚠️ Ator não encontrado",
        type: actor?.type ?? "unknown",
      };
    });

    return {
      actors: resolved,
    };
  }

  static async #addActor(_ev, _target) {
    const uuid = await openActorPickerDialog();
    if (!uuid) return;

    // Verifica duplicidade
    if (this.actors.includes(uuid)) {
      ui.notifications.warn("Este ator já está configurado.");
      return;
    }

    this.actors.push(uuid);
    this.render();
  }

  static async #removeActor(_ev, target) {
    const idx = Number(target.closest("[data-idx]").dataset.idx);
    this.actors.splice(idx, 1);
    this.render();
  }

  static async #resetDefaults(_ev, _target) {
    const confirmed = await DialogV2.confirm({
      window: { title: "Restaurar Padrão" },
      content:
        "<p>Limpar a lista de atores configurados? O sistema voltará a usar <b>todos os personagens</b>.</p>",
    });
    if (!confirmed) return;

    this.actors = [];
    this.render();
  }

  static async #save(_ev, _target) {
    await game.settings.set(MOD, "travelRulerActors", this.actors);
    ui.notifications.info("T20 Zapera | Travel Ruler: configuração salva.");
    this.close();
  }
}
