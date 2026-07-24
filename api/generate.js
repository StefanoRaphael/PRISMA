/**
 * PRISMA — POST /api/generate
 *
 * Debita créditos (quantidade varia por plano) e gera os retratos. Diferente da Magnific, o Gemini
 * responde de forma síncrona — nesta mesma chamada já sabemos se deu certo,
 * sem precisar de fila nem de /api/status consultando um motor externo.
 * O débito acontece ANTES da chamada ao motor; se tudo falhar, devolve.
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';
import { ehIlimitada } from '../lib/contas.js';
import { gerarRetratos } from '../lib/gemini.js';

// Retratos por chamada de geração: Básico/Pro/Legacy geram em lote de 4
// (o Legacy só tem 8 créditos, então dá pra até 2 gerações/ocasiões por mês).
// Starter e Tester são casos avulsos, entregam tudo numa geração só.
const QUANTIDADE_POR_PLANO = { basico: 4, pro: 4, legacy: 4, starter: 5, tester: 3 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const { prompt, ocasiao, direcao, aceitouQualidadeBaixa } = req.body || {};
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
  const CUSTO = ilimitado ? 4 : (QUANTIDADE_POR_PLANO[perfil.plano] || 4);
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
      status: 'processando',
      aceitou_qualidade_baixa: !!aceitouQualidadeBaixa
    })
    .select('id')
    .single();

  // --- geração --------------------------------------------------------------
  // O Gemini já devolve as imagens prontas nesta mesma chamada — não há
  // task_id nem fila para /api/status acompanhar depois.
  try {
    const { urls, parcial, erros } = await gerarRetratos(prompt, referencias, CUSTO);

    await sb.from('geracoes')
      .update({
        status: 'pronto',
        urls,
        concluido_em: new Date().toISOString(),
        erro: parcial ? `Parcial: ${erros.join(' | ')}`.slice(0, 500) : null
      })
      .eq('id', geracao.id);

    // .select() devolve os ids gerados: sem eles, o botão de "refazer" na
    // galeria não teria como identificar qual retrato regenerar antes do
    // cliente recarregar a página.
    const { data: retratosInseridos } = await sb.from('retratos').insert(
      urls.map(url => ({ user_id: usuario.id, geracao_id: geracao.id, ocasiao, url }))
    ).select('id, url');

    const retratos = (retratosInseridos || []).map(r => ({ id: r.id, url: r.url }));

    return res.status(200).json({ id: geracao.id, creditos: saldo, urls, retratos, parcial });
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
