/**
 * PRISMA — contas internas do estúdio e testers convidados
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

// Convidados pra testar o PRISMA de graça: 5 gerações avulsas (1 retrato
// cada), com as 12 ocasiões abertas pra escolher em cada geração. Liberado
// no primeiro login (ver api/me.js). Não passa por pagamento nem webhook.
const TESTERS = new Set([
  'andre.estudiomzn@gmail.com',
  'vidjow@gmail.com',
  'erikagilberti@gmail.com',
  'baezztati@gmail.com',
  'ivocastrolima@gmail.com'
]);

/** @param {string} email @returns {boolean} */
export function ehIlimitada(email) {
  return ILIMITADAS.has(String(email || '').trim().toLowerCase());
}

/** @param {string} email @returns {boolean} */
export function ehTester(email) {
  return TESTERS.has(String(email || '').trim().toLowerCase());
}
