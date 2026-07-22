/**
 * PRISMA — contas internas do estúdio
 *
 * Acesso ilimitado, sem passar pelo Mercado Pago e sem consumir crédito.
 *
 * A lista vive SÓ no servidor, de propósito. São endereços pessoais, e um
 * arquivo servido ao navegador deixaria os dois e-mails visíveis no código
 * fonte da página para qualquer visitante.
 */

const ILIMITADAS = new Set([
  'stefanoraphael@gmail.com',
  'cn.clarisse@gmail.com'
]);

/** @param {string} email @returns {boolean} */
export function ehIlimitada(email) {
  return ILIMITADAS.has(String(email || '').trim().toLowerCase());
}
