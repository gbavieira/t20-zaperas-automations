/* ============================================================
   T20 Automações — Handler: Verificador de Defesa

   Quando um token rola um ataque (arma, equipamento, poder) e
   tem um alvo selecionado (targeted), exibe automaticamente no
   card de chat se o ataque acertou ou errou comparando com a
   Defesa do alvo.

   Fluxo em dois passos:
     1. createChatMessage → armazena defesa do alvo nas flags da mensagem
     2. renderChatMessage → injeta o visual de acertou/errou no card
   ============================================================ */

// ── Constante para evitar re-injeção no render ──────────────
const DEFENSE_CHECK_CLASS = "t20-defense-check";
const DEFENSE_CHECK_FLAG = "defenseCheck";

// ── Phase 1: createChatMessage handler ──────────────────────

/**
 * Detecta ataques com alvos e armazena dados de defesa nas flags.
 * Roda apenas no client que criou a mensagem (quem tem os targets corretos).
 */
export async function handleDefenseCheck(message) {
  // Só processa no client do autor (quem rolou o ataque)
  const authorId = message.author?.id ?? message.user;
  if (authorId !== game.user.id) return;

  // Verifica se já tem a flag (evita loop de update → create)
  if (message.flags?.tormenta20?.[DEFENSE_CHECK_FLAG]) return;

  // Precisa ter itemData — sem isso não é card de ataque
  const itemData = message.flags?.tormenta20?.itemData;
  if (!itemData) return;

  // Perícias não são ataques
  if (itemData.type === "pericia") return;

  // Magias com resistência usam auto-save, não defense-check
  if (itemData.resistencia) return;

  // Procura a rolagem de ataque (d20) na mensagem
  const attackRoll = message.rolls?.find((r) => {
    const firstTerm = r.terms?.[0];
    return firstTerm?.faces === 20;
  });
  if (!attackRoll) return;

  const attackTotal = attackRoll.total;
  if (!attackTotal && attackTotal !== 0) return;

  // Captura o valor natural do d20 (crítico/falha crítica)
  const d20Term = attackRoll.dice?.find((d) => d.faces === 20);
  const naturalRoll = d20Term?.results?.[0]?.result ?? null;

  // Obtém os targets do autor
  const author = game.users.get(authorId);
  if (!author?.targets?.size) return;

  // Coleta dados de defesa de cada target
  const targets = [];
  for (const token of author.targets) {
    const actor = token.actor;
    if (!actor) continue;

    const defense = actor.system?.attributes?.defesa?.value;
    if (defense === undefined || defense === null) continue;

    targets.push({
      name: token.name || actor.name,
      defense: Number(defense),
      tokenId: token.id,
      actorId: actor.id,
    });
  }

  if (!targets.length) return;

  // Armazena nas flags da mensagem para o render usar
  await message.update({
    [`flags.tormenta20.${DEFENSE_CHECK_FLAG}`]: {
      targets,
      attackTotal,
      naturalRoll,
    },
  });
}

// ── Phase 2: renderChatMessage handler ──────────────────────

/**
 * Injeta o visual de acertou/errou no card de chat quando a
 * flag defenseCheck está presente na mensagem.
 */
export async function renderDefenseCheck(message, html) {
  const data = message.flags?.tormenta20?.[DEFENSE_CHECK_FLAG];
  if (!data?.targets?.length) return;

  const isPublic = game.settings.get(
    "t20-zaperas-automations",
    "defenseCheckPublic",
  );
  if (!isPublic && !game.user.isGM) return;

  const el = html instanceof HTMLElement ? html : (html[0] ?? html);

  // Evita re-injeção em re-renders
  if (el.querySelector(`.${DEFENSE_CHECK_CLASS}`)) return;

  const { targets, attackTotal, naturalRoll } = data;

  const processedTargets = targets.map((t) => {
    let hit;
    if (naturalRoll === 20)
      hit = true; // nat 20 = acerto automático
    else if (naturalRoll === 1)
      hit = false; // nat 1 = falha automática
    else hit = attackTotal >= t.defense; // regra normal

    return {
      ...t,
      hit,
      icon: hit ? "✓" : "✗",
      label: hit ? "ACERTOU!" : "ERROU!",
      cssClass: hit ? "success" : "failure",
      naturalRoll,
    };
  });

  const defenseHTML = await renderTemplate(
    `modules/t20-zaperas-automations/templates/defense-check/banner.hbs`,
    { attackTotal, targets: processedTargets },
  );

  const wrapper = document.createElement("div");
  wrapper.className = DEFENSE_CHECK_CLASS;
  wrapper.innerHTML = defenseHTML;

  // Insere após o bloco .dice-roll completo (container raiz da rolagem),
  // garantindo que o banner fique fora do <ol class="dice-rolls">
  const messageContent = el.querySelector(".message-content") ?? el;
  const diceRollBlock = messageContent.querySelector(".dice-roll");
  if (diceRollBlock) {
    diceRollBlock.insertAdjacentElement("afterend", wrapper);
  } else {
    messageContent.appendChild(wrapper);
  }
}
