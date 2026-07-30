import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { user_id, email, email_confirmed_at } = req.body;

  try {
    await resend.emails.send({
      from: 'contato@prismaretrato.com.br',
      to: email,
      subject: 'Bem-vindo ao PRISMA • Guia de Fotos + Instruções',
      html: getWelcomeEmailTemplate(user_id, email)
    });

    res.status(200).json({ success: true, user_id });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: err.message });
  }
}

function getWelcomeEmailTemplate(userId, email) {
  return `
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #050D18; color: #F2F6FB; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <h1 style="font-size: 24px; color: #F2F6FB; margin-bottom: 16px;">Bem-vindo ao PRISMA</h1>
        <p style="font-size: 14px; color: #A9BCD2; margin-bottom: 16px; line-height: 1.6;">Seu cadastro foi confirmado com sucesso.</p>
        <p style="font-size: 14px; color: #A9BCD2; margin-bottom: 16px; line-height: 1.6;">Em breve você receberá um e-mail com o protocolo completo de fotos de referência.</p>
        <p style="font-size: 14px; color: #A9BCD2; margin-bottom: 24px; line-height: 1.6;">Qualquer dúvida, responda este e-mail.</p>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: #F2F6FB; margin-bottom: 4px;">P R I S M A</div>
          <div style="font-size: 10px; color: #63799A;">Retratos com o seu rosto de verdade.</div>
        </div>
      </div>
    </body>
    </html>
  `;
}
