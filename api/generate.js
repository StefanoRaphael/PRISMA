/**
 * PRISMA — POST /api/generate
 *
 * Debita 4 créditos, dispara a geração e devolve o id para o app acompanhar.
 * O débito acontece ANTES da chamada ao motor. Se o motor falhar, a rota
 * /api/status devolve os créditos.
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';
import { ehIlimitada } from '../lib/contas.js';
import { gerarRetratos } from '../lib/magnific.js';

const CUSTO = 4; // 4 retratos por geração

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const { prompt, ocasiao, direcao } = req.body || {};
  if (!prompt || !ocasiao) return res.status(400).json({ erro: 'Pedido incompleto.' });

  const sb = admin();

  // As referências vêm do banco, não do corpo da requisição.
  //
  // Mandá-las pelo corpo estourava o limite de 4,5 MB da Vercel: doze fotos
  // viram data URLs base64 e somam uns 6 MB, então toda geração morria em 413.
  // Aqui elas já estão salvas, e ler pelo id do token também impede que
  // alguém gere retratos com o rosto de outra pessoa.
  const { data: refs, error: erroRefs } = await sb
    .from('referencias').select('url').eq('user_id', usuario.id).limit(12);

  if (erroRefs) {
    console.error('[generate] referencias', erroRefs);
    return res.status(500).json({ erro: 'Não consegui ler suas fotos de referência.' });
  }

  const referencias = (refs || []).map(r => r.url).filter(Boolean);
  if (referencias.length < 8) {
    return res.status(400).json({ erro: 'Envie no mínimo 8 fotos de referência.' });
  }

  // --- crédito e validade -------------------------------------------------
  const { data: perfil } = await sb
    .from('perfis').select('creditos, validade, plano').eq('id', usuario.id).single();

  if (!perfil) return res.status(400).json({ erro: 'Perfil não encontrado.' });

  // Contas internas do estúdio não passam por plano, validade nem crédito.
  const ilimitado = ehIlimitada(usuario.email);
  let saldo = null;

  if (!ilimitado) {
    if (perfil.plano === 'nenhum') {
      return res.status(402).json({ erro: 'Escolha um plano para começar a gerar.' });
    }
    if (perfil.validade && new Date(perfil.validade) < new Date()) {
      return res.status(402).json({ erro: 'Seu acesso venceu. Renove para continuar.' });
    }
    if ((perfil.creditos || 0) < CUSTO) {
      return res.status(402).json({ erro: 'Seus créditos acabaram.' });
    }

    // Débito otimista com trava: só desconta se o saldo ainda comportar.
    const { data: debitado, error: erroDebito } = await sb
      .from('perfis')
      .update({ creditos: perfil.creditos - CUSTO })
      .eq('id', usuario.id)
      .gte('creditos', CUSTO)
      .select('creditos')
      .single();

    if (erroDebito || !debitado) {
      return res.status(402).json({ erro: 'Seus créditos acabaram.' });
    }
    saldo = debitado.creditos;
  }

  // --- registro da geração ------------------------------------------------
  const { data: geracao } = await sb
    .from('geracoes')
    .insert({
      user_id: usuario.id,
      ocasiao,
      direcao: (direcao || '').slice(0, 4000),
      prompt,
      status: 'processando'
    })
    .select('id')
    .single();

  // --- disparo ------------------------------------------------------------
  try {
    const taskId = await gerarRetratos(prompt, referencias);
    await sb.from('geracoes').update({ externo_id: taskId }).eq('id', geracao.id);
    return res.status(200).json({ id: geracao.id, creditos: saldo });
  } catch (e) {
    console.error('[generate]', e);
    // Devolve o crédito: o cliente não paga por falha nossa.
    // Conta ilimitada não teve débito, então não há o que devolver.
    if (!ilimitado) {
      await sb.from('perfis').update({ creditos: perfil.creditos }).eq('id', usuario.id);
    }
    await sb.from('geracoes')
      .update({ status: 'erro', erro: String(e.message).slice(0, 500) })
      .eq('id', geracao.id);
    return res.status(502).json({ erro: 'O motor de geração não respondeu. Seus créditos voltaram.' });
  }
}
