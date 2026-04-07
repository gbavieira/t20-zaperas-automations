/* ============================================================
   T20 Automações — Handler Unificado de Links de Token no Chat
   Substitui 4 handlers renderChatMessage idênticos.
   ============================================================ */

/**
 * Handler único de renderChatMessage.
 * Adiciona interatividade aos links de token nas tabelas de resultado.
 *
 * Processa duas classes CSS:
 *   .t20-contest-token — pan + control + abre actor sheet (Enganação, Intimidação)
 *   .t20-perc-token    — pan + control apenas (Furtividade auto)
 */
export function handleTokenLinks(message, html) {
  const el = html instanceof HTMLElement ? html : html[0] ?? html;

  // Links completos: pan ao token + control + abre ficha do ator
  el.querySelectorAll(".t20-contest-token").forEach((link) => {
    link.addEventListener("click", (ev) => {
      ev.preventDefault();
      const tokenId = ev.currentTarget.dataset.tid;
      const token = canvas.tokens?.get(tokenId);
      if (token) {
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
        token.control({ releaseOthers: true });
      }
      const actorId = ev.currentTarget.dataset.aid;
      const actor = game.actors.get(actorId);
      if (actor) actor.sheet.render(true);
    });
  });

  // Links simples: pan ao token + control (sem abrir ficha)
  el.querySelectorAll(".t20-perc-token").forEach((link) => {
    link.addEventListener("click", (ev) => {
      ev.preventDefault();
      const tokenId = ev.currentTarget.dataset.tid;
      const token = canvas.tokens?.get(tokenId);
      if (!token) return ui.notifications.warn("Token não encontrado no canvas.");
      canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
      token.control({ releaseOthers: true });
    });
  });
}
