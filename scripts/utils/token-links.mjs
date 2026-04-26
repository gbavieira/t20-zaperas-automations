/* ============================================================
   T20 Automações — Handler Unificado de Links de Token no Chat
   Substitui 4 handlers renderChatMessage idênticos.
   ============================================================ */

/**
 * Handler único de renderChatMessage.
 * Adiciona interatividade aos links de token nas tabelas de resultado.
 *
 * Processa as classes CSS:
 *   .t20-contest-token — pan + control (Enganação, Intimidação)
 *   .t20-perc-token    — pan + control (Furtividade auto)
 */
export function handleTokenLinks(_message, html) {
  const el = html instanceof HTMLElement ? html : (html[0] ?? html);

  el.querySelectorAll(".t20-contest-token, .t20-perc-token").forEach((link) => {
    link.addEventListener("click", (ev) => {
      ev.preventDefault();
      const tokenId = ev.currentTarget.dataset.tid;
      const token = canvas.tokens?.get(tokenId);
      if (!token)
        return ui.notifications.warn("Token não encontrado no canvas.");
      canvas.animatePan({
        x: token.center.x,
        y: token.center.y,
        duration: 250,
      });
      token.control({ releaseOthers: true });
    });
  });
}
