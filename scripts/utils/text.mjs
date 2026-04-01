/* ============================================================
   T20 Automações — Utilitários de Texto
   ============================================================ */

/**
 * Remove acentos/diacríticos e converte para minúsculas.
 * @param {string} str
 * @returns {string}
 */
export function normalizeText(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Normaliza nome de condição: sem acentos, minúsculo, sem espaços.
 * @param {string} name
 * @returns {string}
 */
export function normalizeConditionName(name) {
  return normalizeText(name).replace(/\s+/g, "");
}
