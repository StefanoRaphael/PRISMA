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

const CREDITOS = { mensal: 20, anual: 180, pro: 600 };
const VALORES  = { mensal: 149.00, anual: 1188.00, pro: 2388.00 };

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

    const agora = new Date();
    const anual = plano !== 'mensal';
    const validade = new Date(agora);
    if (anual) validade.setFullYear(validade.getFullYear() + 1);
    else validade.setMonth(validade.getMonth() + 1);

    const metodo = pg.payment_type_id === 'bank_transfer' ? 'Pix' : 'Cartão';

    await sb.from('perfis').update({
      plano,
      creditos: CREDITOS[plano],
      validade: validade.toISOString(),
      renova_dia: anual ? null : agora.getDate(),
      metodo: `${metodo} · ${anual ? 'anual' : 'mensal'}`
    }).eq('id', userId);

    return res.status(200).end();
  } catch (e) {
    console.error('[webhook]', e);
    return res.status(200).end();
  }
}
