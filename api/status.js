/**
 * PRISMA — GET /api/status?id=<geracao_id>
 *
 * O Gemini responde de forma síncrona: quando /api/generate termina, a
 * geração já está 'pronto' ou 'erro' no banco. Esta rota só lê o estado
 * atual — não existe mais motor externo para consultar nem fila a
 * acompanhar. Mantida para o app continuar funcionando sem mudança no
 * fluxo de tela (ele chama isto uma vez logo após /api/generate voltar).
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Use GET' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const id = req.query?.id;
  if (!id) return res.status(400).json({ erro: 'Faltou o id.' });

  const sb = admin();

  const { data: geracao } = await sb
    .from('geracoes')
    .select('id, user_id, status, urls, erro')
    .eq('id', id)
    .single();

  // Confere o dono. Sem isso, qualquer pessoa leria a geração de outra.
  if (!geracao || geracao.user_id !== usuario.id) {
    return res.status(404).json({ erro: 'Geração não encontrada.' });
  }

  return res.status(200).json({
    status: geracao.status,
    urls: geracao.urls || [],
    erro: geracao.status === 'erro' ? geracao.erro : undefined
  });
}
