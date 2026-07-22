/**
 * PRISMA — POST /api/me
 *
 * Sincroniza o direito de acesso do usuário logado.
 *
 * Hoje serve às contas internas do estúdio, que têm acesso ilimitado sem
 * passar pelo pagamento. O app chama esta rota logo depois do login, e ela
 * grava o plano no perfil, de onde o resto da interface já lê.
 *
 * A checagem é por e-mail e acontece no servidor, a partir do token do
 * Supabase. Nunca aceite o e-mail vindo do corpo da requisição: qualquer
 * pessoa se daria acesso ilimitado mandando o endereço certo.
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';
import { ehIlimitada } from '../lib/contas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  if (!ehIlimitada(usuario.email)) return res.status(200).json({ plano: null });

  const sb = admin();
  const { error } = await sb.from('perfis').upsert({
    id: usuario.id,
    plano: 'ilimitado',
    creditos: 9999,
    validade: null,
    metodo: 'Conta do estúdio'
  });

  if (error) {
    console.error('[me]', error);
    return res.status(500).json({ erro: 'Não consegui liberar a conta.' });
  }

  return res.status(200).json({ plano: 'ilimitado' });
}
