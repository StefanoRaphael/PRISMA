/**
 * PRISMA — POST /api/webhook
 *
 * O Mercado Pago avisa aqui quando um pagamento muda de estado.
 *
 * Regra de ouro: NUNCA confie no corpo da notificação. Ele traz só o id.
 * Buscamos o pagamento na API do Mercado Pago para confirmar valor e status,
 * senão qualquer pessoa poderia liberar créditos mandando um POST forjado.
 */

import { admin } from '../lib/auth.js';

const CREDITOS = { starter: 5, basico: 20, pro: 60, legacy: 12 };
const VALORES  = { starter: 39.00, basico: 99.00, pro: 199.00, legacy: 19.90 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const id = req.body?.data?.id || req.query?.['data.id'];
  const tipo = req.body?.type || req.query?.type;

  // Responde 200 rápido: o Mercado Pago reenvia o que não recebe confirmação.
  if (tipo !== 'payment' || !id) return res.status(200).end();

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    if (!r.ok) {
      console.error('[webhook] consulta falhou', r.status);
      return res.status(200).end();
    }

    const pg = await r.json();
    if (pg.status !== 'approved') return res.status(200).end();

    const [userId, plano, pagamentoId] = String(pg.external_reference || '').split('|');
    if (!userId || !CREDITOS[plano]) {
      console.error('[webhook] referência inválida', pg.external_reference);
      return res.status(200).end();
    }

    // Confere o valor recebido contra a tabela do servidor.
    if (Number(pg.transaction_amount) < VALORES[plano]) {
      console.error('[webhook] valor abaixo do plano', pg.transaction_amount, plano);
      return res.status(200).end();
    }

    const sb = admin();

    // Idempotência: se já processamos este pagamento, para aqui.
    const { data: existente } = await sb
      .from('pagamentos').select('id, status').eq('mp_id', String(pg.id)).maybeSingle();
    if (existente?.status === 'aprovado') return res.status(200).end();

    await sb.from('pagamentos')
      .update({ status: 'aprovado', mp_id: String(pg.id) })
      .eq('id', pagamentoId);

    // Starter é avulso: não renova, então dá uma janela generosa (90 dias)
    // pra usar os 5 créditos sem depender do ciclo mensal dos outros planos.
    const agora = new Date();
    const validade = new Date(agora);
    if (plano === 'starter') {
      validade.setDate(validade.getDate() + 90);
    } else {
      validade.setMonth(validade.getMonth() + 1);
    }

    const metodo = pg.payment_type_id === 'bank_transfer' ? 'Pix' : 'Cartão';
    const cicloTexto = plano === 'starter' ? 'avulso' : 'mensal';

    await sb.from('perfis').update({
      plano,
      creditos: CREDITOS[plano],
      validade: validade.toISOString(),
      renova_dia: plano === 'starter' ? null : agora.getDate(),
      metodo: `${metodo} · ${cicloTexto}`
    }).eq('id', userId);

    return res.status(200).end();
  } catch (e) {
    console.error('[webhook]', e);
    return res.status(200).end();
  }
}
