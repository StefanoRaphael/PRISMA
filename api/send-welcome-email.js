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
      <style>
        body { margin: 0; padding: 0; background: #050D18; color: #F2F6FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background: #050D18; }
        .header { text-align: left; margin-bottom: 28px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; padding-top: 20px; border-bottom: 2px solid; border-image: linear-gradient(90deg, #FF9160, #FF5FA2, #A96BFF, #4FC9F5, #6FE3C4) 1; }
        .header h1 { font-size: 28px; letter-spacing: 0.25em; font-weight: 700; margin: 0; color: #F2F6FB; }
        .content { padding: 20px; }
        h2 { font-size: 18px; font-weight: 700; margin: 22px 0 11px 0; color: #F2F6FB; text-transform: uppercase; letter-spacing: 0.08em; border-left: 4px solid #FF9160; padding-left: 12px; }
        p { font-size: 14px; color: #A9BCD2; margin-bottom: 16px; line-height: 1.6; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
        .logo-footer { font-size: 12px; font-weight: 700; letter-spacing: 0.15em; color: #F2F6FB; margin-bottom: 6px; }
        .footer-text { font-size: 10px; color: #63799A; margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PRISMA</h1>
        </div>
        <div class="content">
          <h2>Bem-vindo ao PRISMA</h2>
          <p>Seu cadastro foi confirmado com sucesso.</p>
          <p>Em breve você receberá um e-mail com o protocolo completo de fotos de referência. Siga o guia à risca para garantir retratos de qualidade premium.</p>
          <p>Qualquer dúvida, responda este e-mail ou abra o PRISMA.</p>
        </div>
        <div class="footer">
          <div class="logo-footer">P R I S M A</div>
          <div class="footer-text">Retratos com o seu rosto de verdade.</div>
          <div class="footer-text">Segurança: suas fotos nunca são publicadas nem compartilhadas.</div>
        </div>
      </div>
    </body>
    </html>
  `;
}
