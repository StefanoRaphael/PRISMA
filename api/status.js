/**
 * PRISMA — GET /api/status?id=<geracao_id>
 *
 * O app chama isso a cada 5 segundos enquanto os retratos ficam prontos.
 * Cada imagem concluída já é gravada, então o cliente pode fechar o app
 * e encontrar tudo na galeria depois.
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';
import { consultarGeracao } from '../lib/magnific.js';

const CUSTO = 4;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Use GET' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const id = req.query?.id;
  if (!id) return res.status(400).json({ erro: 'Faltou o id.' });

  const sb = admin();

  const { data: geracao } = await sb
    .from('geracoes')
    .select('id, user_id, ocasiao, status, externo_id, urls')
    .eq('id', id)
    .single();

  // Confere o dono. Sem isso, qualquer pessoa leria a geração de outra.
  if (!geracao || geracao.user_id !== usuario.id) {
    return res.status(404).json({ erro: 'Geração não encontrada.' });
  }

  if (geracao.status === 'pronto' || geracao.status === 'erro') {
    return res.status(200).json({ status: geracao.status, urls: geracao.urls || [] });
  }

  if (!geracao.externo_id) {
    return res.status(200).json({ status: 'processando', urls: [] });
  }

  const r = await consultarGeracao(geracao.externo_id);

  if (r.status === 'pronto') {
    await sb.from('geracoes')
      .update({ status: 'pronto', urls: r.urls, concluido_em: new Date().toISOString() })
      .eq('id', geracao.id);

    if (r.urls.length) {
      await sb.from('retratos').insert(
        r.urls.map(url => ({
          user_id: usuario.id,
          geracao_id: geracao.id,
          ocasiao: geracao.ocasiao,
          url
        }))
      );
    }
    return res.status(200).json({ status: 'pronto', urls: r.urls });
  }

  if (r.status === 'erro') {
    // Falhou depois de cobrar: devolve os créditos.
    const { data: perfil } = await sb
      .from('perfis').select('creditos').eq('id', usuario.id).single();
    if (perfil) {
      await sb.from('perfis')
        .update({ creditos: (perfil.creditos || 0) + CUSTO })
        .eq('id', usuario.id);
    }
    await sb.from('geracoes')
      .update({ status: 'erro', erro: r.erro || 'falha no motor' })
      .eq('id', geracao.id);
    return res.status(200).json({ status: 'erro', urls: [], erro: r.erro });
  }

  // Ainda processando: devolve o que já ficou pronto, para o app ir mostrando.
  return res.status(200).json({ status: 'processando', urls: r.urls });
}
