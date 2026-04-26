/* ============================================================
   T20 Automações — Builders de HTML para Chat
   ============================================================ */

/**
 * Constrói a tabela HTML de resultados de teste oposto.
 *
 * @param {object} opts
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
export async function buildResultTable({
  headerText,
  attackerName,
  attackerTotal,
  attackerNat,
  attackLabel,
  defenseAbbr,
  showBonus = true,
  linkClass = "t20-contest-token",
  results,
}) {
  const nat20Tag =
    '<span class="t20-nat20" title="20 Natural"> (nat 20)</span>';

  const processedResults = results.map((r) => ({
    ...r,
    linkClass,
    nat20HTML: r.nat === 20 ? nat20Tag : "",
    icon: r.passed ? "✅" : "❌",
    cssClass: r.passed ? "passed" : "failed",
  }));

  return renderTemplate(
    `modules/t20-zaperas-automations/templates/opposed-checks/result-table.hbs`,
    {
      headerText,
      attackerName,
      attackerTotal,
      attackerNat20HTML: attackerNat === 20 ? nat20Tag : "",
      attackLabel,
      defenseAbbr,
      showBonus,
      actorOrToken: showBonus ? "Ator" : "Token",
      resultHeader: showBonus ? "Result" : "Resultado",
      results: processedResults,
    },
  );
}

/**
 * Posta mensagem de sistema no chat.
 * Se `sourceMessage` for fornecida, herda sua visibilidade (whisper + blind),
 * propagando o roll mode original (público, privado GM, cego GM, pessoal).
 * Sem sourceMessage, assume GM-only por padrão.
 *
 * @param {object} opts
 * @param {string} opts.content          HTML da mensagem
 * @param {string} [opts.flavor]         texto de flavor (aparece acima do conteúdo)
 * @param {ChatMessage} [opts.sourceMessage]  mensagem original cujo roll mode será propagado
 * @param {boolean} [opts.forceGMOnly]   se true, ignora sourceMessage e força whisper apenas para GMs
 * @returns {Promise<ChatMessage>}
 */
export async function postGMMessage({
  content,
  flavor,
  sourceMessage,
  forceGMOnly = false,
}) {
  const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
  const visibility = forceGMOnly
    ? { whisper: gmIds, blind: false }
    : sourceMessage
      ? {
          whisper: [...(sourceMessage.whisper ?? [])],
          blind: sourceMessage.blind ?? false,
        }
      : { whisper: gmIds };
  return ChatMessage.create({
    user: game.user.id,
    content,
    speaker: { alias: "⚔️ Sistema" },
    flavor,
    ...visibility,
  });
}
