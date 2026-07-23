/**
 * PRISMA — POST /api/regenerate
 *
 * Refaz UM retrato específico, não a geração inteira.
 *
 * Cada retrato tem direito a 1 refação grátis (refeita_gratis = false).
 * Usada essa, qualquer nova tentativa no MESMO retrato cobra 1 crédito
 * normal — do contrário um cliente perfeccionista refaria a mesma foto
 * sem limite, e cada tentativa custa de verdade (Gemini cobra por
 * imagem gerada, grátis ou não).
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';
import { ehIlimitada } from '../lib/contas.js';
import { gerarUmRetrato } from '../lib/gemini.js';

const CUSTO_PAGO = 1; // 1 crédito = 1 retrato, na segunda tentativa em diante

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const { retratoId } = req.body || {};
  if (!retratoId) return res.status(400).json({ erro: 'Faltou o retrato.' });

  const sb = admin();

  const { data: retrato } = await sb
    .from('retratos')
    .select('id, user_id, geracao_id, ocasiao, refeita_gratis')
    .eq('id', retratoId)
    .single();

  // Confere o dono. Sem isso, qualquer pessoa refaria o retrato de outra conta.
  if (!retrato || retrato.user_id !== usuario.id) {
    return res.status(404).json({ erro: 'Retrato não encontrado.' });
  }

  const { data: geracao } = await sb
    .from('geracoes').select('prompt').eq('id', retrato.geracao_id).single();
  if (!geracao?.prompt) {
    return res.status(400).json({ erro: 'Não achei o pedido original desse retrato.' });
  }

  const { data: refs } = await sb
    .from('referencias').select('url').eq('user_id', usuario.id).limit(12);
  const referencias = (refs || []).map(r => r.url).filter(Boolean);
  if (referencias.length < 8) {
    return res.status(400).json({ erro: 'Suas referências mudaram. Envie de novo antes de refazer.' });
  }

  const ilimitado = ehIlimitada(usuario.email);
  const gratis = !retrato.refeita_gratis;
  let saldo = null;
  let creditosAntesDoDebito = null;

  if (!ilimitado && !gratis) {
    const { data: perfil } = await sb
      .from('perfis').select('creditos, validade, plano').eq('id', usuario.id).single();
    if (!perfil) return res.status(400).json({ erro: 'Perfil não encontrado.' });
    if (perfil.plano === 'nenhum') {
      return res.status(402).json({ erro: 'Escolha um plano para continuar.' });
    }
    if (perfil.validade && new Date(perfil.validade) < new Date()) {
      return res.status(402).json({ erro: 'Seu acesso venceu. Renove para continuar.' });
    }
    if ((perfil.creditos || 0) < CUSTO_PAGO) {
      return res.status(402).json({ erro: 'Seus créditos acabaram.' });
    }

    const { data: debitado, error: erroDebito } = await sb
      .from('perfis')
      .update({ creditos: perfil.creditos - CUSTO_PAGO })
      .eq('id', usuario.id)
      .gte('creditos', CUSTO_PAGO)
      .select('creditos')
      .single();

    if (erroDebito || !debitado) {
      return res.status(402).json({ erro: 'Seus créditos acabaram.' });
    }
    creditosAntesDoDebito = perfil.creditos;
    saldo = debitado.creditos;
  }

  try {
    const url = await gerarUmRetrato(geracao.prompt, referencias);

    await sb.from('retratos')
      .update({ url, refeita_gratis: true })
      .eq('id', retrato.id);

    return res.status(200).json({ url, gratis, creditos: saldo });
  } catch (e) {
    console.error('[regenerate]', e);
    // Devolve o crédito: o cliente não paga por falha do motor.
    if (creditosAntesDoDebito !== null) {
      await sb.from('perfis').update({ creditos: creditosAntesDoDebito }).eq('id', usuario.id);
    }
    return res.status(502).json({ erro: 'O motor de geração não respondeu. Tente de novo.' });
  }
}
