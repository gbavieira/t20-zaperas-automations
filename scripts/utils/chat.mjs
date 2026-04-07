/* ============================================================
   T20 Automações — Builders de HTML para Chat
   ============================================================ */

/**
 * Constrói a tabela HTML de resultados de teste oposto.
 *
 * @param {object} opts
 * @param {string} opts.emoji       ex: "🎭", "🔍", "😤"
 * @param {string} opts.headerText  ex: "Perc vs Furt"
 * @param {string} opts.attackerName
 * @param {number} opts.attackerTotal
 * @param {number} [opts.attackerNat]  valor natural do d20 do atacante
 * @param {string} opts.attackLabel  ex: "Enganação", "Furtividade"
 * @param {string} opts.defenseAbbr  ex: "Perc", "Vont", "Intu"
 * @param {boolean} opts.showBonus   se mostra coluna de Bônus
 * @param {string} opts.linkClass    classe CSS dos links (default: "t20-contest-token")
 * @param {Array<{name:string, actorId?:string, tokenId?:string, total:number, bonus?:number, nat?:number, passed:boolean}>} opts.results
 * @returns {string} HTML
 */
export function buildResultTable({
  emoji,
  headerText,
  attackerName,
  attackerTotal,
  attackerNat,
  attackLabel,
  defenseAbbr,
  showBonus = true,
  linkClass = "t20-contest-token",
  results
}) {
  const bonusHeader = showBonus ? "<th>Bônus</th>" : "";
  const actorOrToken = showBonus ? "Ator" : "Token";
  const resultHeader = showBonus ? "Result" : "Resultado";
  const nat20Tag = '<span class="t20-nat20" title="20 Natural"> (nat 20)</span>';
  const attackerNat20 = attackerNat === 20 ? nat20Tag : "";

  let html = `<div class="tormenta20">
    <h3>${emoji} ${headerText}</h3>
    <p><b>${attackerName}</b> rolou ${attackLabel}: <b>${attackerTotal}</b>${attackerNat20}</p>
    <hr>
    <table class="t20-opposed-table">
      <tr><th>${actorOrToken}</th><th>${defenseAbbr}</th>${bonusHeader}<th>${resultHeader}</th></tr>`;

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    const defNat20 = r.nat === 20 ? nat20Tag : "";

    let linkData;
    if (r.tokenId && r.actorId) {
      linkData = `class="${linkClass}" data-tid="${r.tokenId}" data-aid="${r.actorId}"`;
    } else if (r.tokenId) {
      linkData = `class="${linkClass}" data-tid="${r.tokenId}"`;
    } else if (r.actorId) {
      linkData = `class="${linkClass}" data-aid="${r.actorId}"`;
    } else {
      linkData = `class="${linkClass}"`;
    }

    const bonusCell = showBonus ? `<td>+${r.bonus}</td>` : "";

    html += `<tr class="t20-opposed-row ${r.passed ? "passed" : "failed"}">
      <td><a ${linkData}>${r.name}</a></td>
      <td>${r.total}${defNat20}</td>
      ${bonusCell}
      <td>${icon}</td>
    </tr>`;
  }

  html += `</table></div>`;
  return html;
}

/**
 * Posta mensagem de sistema no chat, visível apenas para o GM.
 *
 * @param {object} opts
 * @param {string} opts.content  HTML da mensagem
 * @param {string} opts.flavor   texto de flavor (aparece acima do conteúdo)
 * @returns {Promise<ChatMessage>}
 */
export async function postGMMessage({ content, flavor }) {
  return ChatMessage.create({
    user: game.user.id,
    content,
    whisper: ChatMessage.getWhisperRecipients("GM"),
    speaker: { alias: "⚔️ Sistema" },
    flavor
  });
}
