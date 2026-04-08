/* ============================================================
   T20 Automações — Dialog Drag-Drop para Seleção de Atores
   Unifica openActorPickerEngana, openActorPickerFurt e
   openActorPickerIntim em um único componente parametrizado.
   ============================================================ */

/**
 * Abre um dialog com área de drag-drop para o GM selecionar atores.
 *
 * @param {object} opts
 * @param {string} opts.title          título do dialog
 * @param {string} opts.attackerName   nome do atacante
 * @param {number} opts.attackerTotal  total da rolagem do atacante
 * @param {string} opts.attackLabel    ex: "Enganação", "Furtividade", "Intimidação"
 * @param {string} opts.defenseLabel   ex: "Percepção", "Vontade"
 * @param {string} opts.defenseAbbr    ex: "Perc", "Vont"
 * @param {string} opts.defenseKey     ex: "perc", "vont", "intu"
 * @returns {Promise<string[]>} array de actor IDs selecionados
 */
export async function openActorPicker({
  title,
  attackerName,
  attackerTotal,
  attackLabel,
  defenseLabel,
  defenseAbbr,
  defenseKey
}) {
  const id = `t20-picker-${Date.now()}`;

  const content = await renderTemplate(
    `modules/t20-zaperas-automations/templates/actor-picker/dialog.hbs`,
    { id, attackerName, attackLabel, attackerTotal, defenseLabel }
  );

  return new Promise((resolve) => {
    let resolved = false;

    const d = new Dialog({
      title,
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Rolar",
          callback: (html) => {
            resolved = true;
            const entries = html.find(".actor-entry");
            const actorIds = [];
            entries.each((_, el) => actorIds.push(el.dataset.actorId));
            resolve(actorIds);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancelar",
          callback: () => { resolved = true; resolve([]); }
        }
      },
      default: "roll",
      close: () => { if (!resolved) resolve([]); },
      render: (html) => {
        const dropZone = html.find(".drop-zone")[0];
        const addedIds = new Set();

        async function addActor(actor) {
          if (addedIds.has(actor.id)) return;
          addedIds.add(actor.id);

          const skl = actor.system?.pericias?.[defenseKey];
          const bonusVal = skl ? `+${skl.value}` : "?";
          const em = dropZone.querySelector("em");
          if (em) em.remove();

          const rowHTML = await renderTemplate(
            `modules/t20-zaperas-automations/templates/actor-picker/row.hbs`,
            { actorImg: actor.img, actorName: actor.name, defenseAbbr, bonusVal, actorId: actor.id }
          );

          const row = document.createElement("div");
          row.className = "actor-entry";
          row.dataset.actorId = actor.id;
          row.innerHTML = rowHTML;

          row.querySelector(".actor-remove").addEventListener("click", () => {
            addedIds.delete(actor.id);
            row.remove();
            if (!dropZone.querySelector(".actor-entry")) {
              dropZone.innerHTML = '<em style="color:#888;">Nenhum ator adicionado</em>';
            }
          });
          dropZone.appendChild(row);
        }

        dropZone.addEventListener("dragover", (ev) => {
          ev.preventDefault();
          dropZone.classList.add("drag-over");
        });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
        dropZone.addEventListener("drop", async (ev) => {
          ev.preventDefault();
          dropZone.classList.remove("drag-over");
          let data;
          try { data = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch { return; }
          if (data.type === "Actor") {
            const actor = await fromUuid(data.uuid);
            if (actor) addActor(actor);
          }
        });
      }
    }, { width: 420, classes: ["tormenta20"] });
    d.render(true);
  });
}
