/* ============================================================
   T20 Automações — Utils: DOM
   ============================================================ */

/**
 * Normaliza o argumento `html` recebido por hooks de render do Foundry.
 * Em V13/V14 pode chegar como HTMLElement, jQuery ou array-like.
 * @param {HTMLElement|JQuery|HTMLElement[]} html
 * @returns {HTMLElement}
 */
export function unwrapHtml(html) {
  return html instanceof HTMLElement ? html : (html[0] ?? html);
}
