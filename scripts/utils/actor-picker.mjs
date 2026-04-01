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
export function openActorPicker({
  title,
  attackerName,
  attackerTotal,
  attackLabel,
  defenseLabel,
  defenseAbbr,
  defenseKey
}) {
  return new Promise((resolve) => {
    let resolved = false;
    const id = `t20-picker-${Date.now()}`;
    const content = `
    <style>
      #${id} .drop-zone {
        min-height: 120px; border: 2px dashed #888; border-radius: 6px;
        padding: 8px; margin: 8px 0; background: rgba(0,0,0,0.05);
      }
      #${id} .drop-zone.drag-over { border-color: #7b68ee; background: rgba(123,104,238,0.1); }
      #${id} .actor-entry {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 8px; margin: 2px 0; background: rgba(255,255,255,0.1);
        border-radius: 4px;
      }
      #${id} .actor-entry img { width: 28px; height: 28px; border: none; border-radius: 50%; }
      #${id} .actor-remove { cursor: pointer; margin-left: auto; color: #c00; }
      #${id} .bonus-col { display: flex; align-items: center; margin-left: auto; gap: 4px; }
      #${id} .bonus-col span { font-size: 0.85em; color: #888; }
    </style>
    <div id="${id}">
      <p><b>${attackerName}</b> rolou ${attackLabel}: <b>${attackerTotal}</b></p>
      <p>Teste oposto: <b>${defenseLabel}</b></p>
      <p style="font-size:0.85em; color:#666;">Arraste atores da barra lateral para a área abaixo:</p>
      <div class="drop-zone">
        <em style="color:#888;">Nenhum ator adicionado</em>
      </div>
    </div>`;

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

        function addActor(actor) {
          if (addedIds.has(actor.id)) return;
          addedIds.add(actor.id);

          const skl = actor.system?.pericias?.[defenseKey];
          const bonusVal = skl ? `+${skl.value}` : "?";
          const em = dropZone.querySelector("em");
          if (em) em.remove();

          const row = document.createElement("div");
          row.className = "actor-entry";
          row.dataset.actorId = actor.id;
          row.innerHTML = `
            <img src="${actor.img}" alt="${actor.name}">
            <span>${actor.name}</span>
            <div class="bonus-col"><span>${defenseAbbr} ${bonusVal}</span></div>
            <a class="actor-remove" title="Remover"><i class="fas fa-trash"></i></a>`;

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
