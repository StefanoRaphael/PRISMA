/**
 * PRISMA — POST /api/checkout
 *
 * Cria a preferência de pagamento no Mercado Pago e devolve a URL do checkout.
 * Pix e cartão saem da mesma preferência.
 *
 * Os preços vivem AQUI, no servidor. Nunca aceite valor vindo do cliente:
 * qualquer pessoa poderia assinar o plano Pro por um real.
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';

const PLANOS = {
  mensal: { nome: 'PRISMA Mensal', valor: 149.00,  creditos: 20,  ciclo: 'mensal' },
  anual:  { nome: 'PRISMA Anual',  valor: 1188.00, creditos: 180, ciclo: 'anual'  },
  pro:    { nome: 'PRISMA Pro',    valor: 2388.00, creditos: 600, ciclo: 'anual'  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const plano = PLANOS[req.body?.plano];
  if (!plano) return res.status(400).json({ erro: 'Plano inválido.' });

  const site = process.env.SITE_URL || 'https://usarprisma.com.br';
  const sb = admin();

  // Registra o pagamento como pendente antes de mandar para o checkout.
  const { data: pagamento } = await sb
    .from('pagamentos')
    .insert({
      user_id: usuario.id,
      plano: req.body.plano,
      valor: plano.valor,
      status: 'pendente'
    })
    .select('id')
    .single();

  const preferencia = {
    items: [{
      id: req.body.plano,
      title: plano.nome,
      description: `${plano.creditos} retratos`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: plano.valor
    }],
    payer: { email: usuario.email },
    // external_reference amarra o pagamento ao usuário no webhook.
    external_reference: `${usuario.id}|${req.body.plano}|${pagamento.id}`,
    back_urls: {
      success: `${site}/?pagamento=aprovado`,
      pending: `${site}/?pagamento=pendente`,
      failure: `${site}/?pagamento=recusado`
    },
    auto_return: 'approved',
    notification_url: `${site}/api/webhook`,
    statement_descriptor: 'PRISMA'
  };

  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferencia)
    });

    if (!r.ok) {
      const texto = await r.text().catch(() => '');
      console.error('[checkout] Mercado Pago', r.status, texto.slice(0, 400));
      return res.status(502).json({ erro: 'Não consegui abrir o pagamento.' });
    }

    const d = await r.json();
    await sb.from('pagamentos').update({ mp_pref: d.id }).eq('id', pagamento.id);

    // init_point é produção; sandbox_init_point é teste.
    const url = process.env.MP_SANDBOX === '1' ? d.sandbox_init_point : d.init_point;
    return res.status(200).json({ url });
  } catch (e) {
    console.error('[checkout]', e);
    return res.status(500).json({ erro: 'Não consegui abrir o pagamento.' });
  }
}
