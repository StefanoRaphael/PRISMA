/**
 * PRISMA — POST /api/send-welcome-email
 *
 * Chamado por um Database Webhook do Supabase, configurado em Database →
 * Webhooks para disparar em INSERT na tabela public.perfis. O gatilho
 * ao_criar_usuario (supabase.sql) cria exatamente UMA linha em perfis por
 * conta nova, com "on conflict (id) do nothing" — então este endpoint só
 * roda uma vez por cliente, no exato momento do cadastro.
 *
 * Segurança: Database Webhooks do Supabase não assinam a requisição, então
 * qualquer um que descobrisse a URL poderia mandar POST forjado. A defesa é
 * um cabeçalho secreto configurado nos dois lados (aqui e na tela do
 * webhook no Supabase) — sem ele, qualquer POST é recusado antes de tocar
 * em e-mail ou banco.
 *
 * Best effort, igual ao e-mail de pagamento: o cadastro do cliente já foi
 * concluído antes deste código rodar, então uma falha aqui nunca deveria
 * impedir o cadastro nem aparecer pro cliente. Loga e sai.
 */

import { admin } from '../lib/auth.js';
import { montarEmailBoasVindas, lerProtocoloPdf } from '../marketing/lib-boas-vindas.mjs';

const REMETENTE = 'PRISMA <contato@prismaretrato.com.br>';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Dois nomes aceitos porque o projeto já teve as duas variáveis na Vercel
  // em momentos diferentes. Aceitar as duas evita que o e-mail pare de sair
  // por causa de qual delas está configurada hoje.
  const segredosAceitos = [
    process.env.WELCOME_WEBHOOK_SECRET,
    process.env.WEBHOOK_SECRET
  ].filter(Boolean);

  if (!segredosAceitos.length) {
    console.error('[send-welcome-email] nenhum segredo de webhook no ambiente');
    return res.status(200).end();
  }
  if (!segredosAceitos.includes(req.headers['x-prisma-webhook-secret'])) {
    console.error('[send-welcome-email] segredo do webhook não confere');
    return res.status(401).end();
  }

  // Confirma que é mesmo o evento esperado — defesa extra caso o webhook no
  // painel do Supabase seja apontado, por engano, para outra tabela ou
  // evento (UPDATE, por exemplo, que dispararia de novo a cada pagamento).
  const { type, table, record } = req.body || {};
  if (type !== 'INSERT' || table !== 'perfis' || !record?.id) {
    console.error('[send-welcome-email] payload inesperado', { type, table, id: record?.id });
    return res.status(200).end();
  }

  try {
    const sb = admin();
    const { data, error } = await sb.auth.admin.getUserById(record.id);
    if (error || !data?.user?.email) {
      console.error('[send-welcome-email] não achei e-mail do usuário', record.id, error);
      return res.status(200).end();
    }

    const { assunto, html } = montarEmailBoasVindas(record.nome || '', 'novo');
    const protocoloPdf = lerProtocoloPdf();

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.RESEND_API_KEY_PRISMA || process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [data.user.email],
        subject: assunto,
        html,
        attachments: [{
          filename: 'PRISMA-Protocolo-de-Fotos.pdf',
          content: protocoloPdf.toString('base64'),
          contentType: 'application/pdf'
        }]
      })
    });

    if (!resp.ok) {
      const corpo = await resp.json().catch(() => ({}));
      console.error('[send-welcome-email] Resend recusou o envio', resp.status, corpo);
    }
  } catch (e) {
    console.error('[send-welcome-email]', e);
  }

  return res.status(200).end();
}
