/**
 * PRISMA — POST /api/webhook
 *
 * O Mercado Pago avisa aqui quando um pagamento muda de estado.
 *
 * Regra de ouro: NUNCA confie no corpo da notificação. Ele traz só o id.
 * Buscamos o pagamento na API do Mercado Pago para confirmar valor e status,
 * senão qualquer pessoa poderia liberar créditos mandando um POST forjado.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { admin } from '../lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CREDITOS = { starter: 5, basico: 20, pro: 60, legacy: 8 };
const VALORES  = { starter: 39.00, basico: 99.00, pro: 199.00, legacy: 19.90 };
const NOME_PLANO = { starter: 'Starter', basico: 'Básico', pro: 'Pro', legacy: 'Legacy' };

/**
 * Manda o e-mail de pagamento aprovado. Melhor esforço: quem chama nunca
 * deve deixar uma falha aqui derrubar o webhook — o crédito já foi gravado
 * no banco antes desta função rodar, que é o que garante o acesso do
 * cliente. O e-mail é confirmação, não o mecanismo de liberação.
 */
async function enviarEmailPagamento({ userId, plano, creditos, validade }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[webhook] RESEND_API_KEY ausente, e-mail de pagamento não enviado');
    return;
  }

  const sb = admin();
  const { data, error } = await sb.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    console.error('[webhook] não achei e-mail do usuário', userId, error);
    return;
  }

  const template = readFileSync(
    path.join(__dirname, '..', 'marketing', 'emails', 'pagamento-aprovado.html'),
    'utf-8'
  );

  // O Vercel roda a função em UTC, não no fuso do cliente. Sem timeZone
  // explícito, um pagamento perto da meia-noite (horário de Brasília) mostra
  // uma data errada por um dia — já pegou 1 dia de diferença no teste local.
  const validadeTexto = validade.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo'
  });

  // replaceAll é obrigatório: cada placeholder aparece mais de uma vez no
  // arquivo (mesmo bug que já pegou o template de boas-vindas e o do
  // Supabase — replace simples só troca a primeira ocorrência).
  const html = template
    .replaceAll('{{PLANO}}', NOME_PLANO[plano] || plano)
    .replaceAll('{{CREDITOS}}', `${creditos} retratos`)
    .replaceAll('{{VALIDADE}}', validadeTexto);

  for (const chave of ['{{PLANO}}', '{{CREDITOS}}', '{{VALIDADE}}']) {
    if (html.includes(chave)) {
      console.error(`[webhook] placeholder ${chave} sobrou sem substituir, e-mail não enviado`);
      return;
    }
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'PRISMA <contato@prismaretrato.com.br>',
      to: [data.user.email],
      subject: `PRISMA · seu plano ${NOME_PLANO[plano] || plano} está ativo`,
      html
    })
  });

  if (!resp.ok) {
    const corpo = await resp.json().catch(() => ({}));
    console.error('[webhook] Resend recusou o envio', resp.status, corpo);
  }
}

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

    // Idempotência: SELECT e UPDATE separados deixam uma janela de corrida.
    // O Mercado Pago reenvia notificação quando não recebe 200 rápido o
    // bastante, e duas entregas quase simultâneas passariam pelo SELECT
    // antes que qualquer UPDATE tivesse comprometido — as duas seguiriam e
    // reescreveriam creditos com o valor fixo do plano, apagando o consumo
    // que o cliente já tivesse feito nesse intervalo.
    //
    // A trava real é o próprio UPDATE: .neq('status','aprovado') só deixa
    // UMA chamada vencer a corrida (a que efetivamente muda a linha).
    // Quem não afeta nenhuma linha para aqui, sem tocar em créditos.
    const { data: atualizado } = await sb
      .from('pagamentos')
      .update({ status: 'aprovado', mp_id: String(pg.id) })
      .eq('id', pagamentoId)
      .neq('status', 'aprovado')
      .select('id')
      .maybeSingle();

    if (!atualizado) return res.status(200).end();

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

    // Crédito já está gravado no banco: o acesso do cliente não depende do
    // que acontece daqui pra baixo. Await aqui mesmo (não fire-and-forget)
    // porque a função serverless pode ser encerrada assim que a resposta for
    // enviada — sem esperar, o envio arriscaria nunca completar. Mercado
    // Pago tolera folga de sobra no tempo de resposta do webhook.
    try {
      await enviarEmailPagamento({ userId, plano, creditos: CREDITOS[plano], validade });
    } catch (e) {
      console.error('[webhook] falha ao enviar e-mail de pagamento (crédito já gravado)', e);
    }

    return res.status(200).end();
  } catch (e) {
    console.error('[webhook]', e);
    return res.status(200).end();
  }
}
