import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { user_id, email, email_confirmed_at } = req.body;

  try {
    console.log('[PRISMA-EMAIL] Enviando pra:', email);
    console.log('[PRISMA-EMAIL] RESEND_API_KEY existe?', !!process.env.RESEND_API_KEY);

    const response = await resend.emails.send({
      from: 'contato@prismaretrato.com.br',
      to: email,
      subject: 'Bem-vindo ao PRISMA • Guia de Fotos + Instruções',
      html: getWelcomeEmailTemplate(user_id, email)
    });

    console.log('[PRISMA-EMAIL] Resposta Resend:', response);
    res.status(200).json({ success: true, user_id, resend_id: response.id });
  } catch (err) {
    console.error('[PRISMA-EMAIL] Erro:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
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
        .header { text-align: left; padding: 20px; }
        .header h1 { font-size: 28px; letter-spacing: 0.25em; font-weight: 700; margin: 0 0 16px 0; color: #F2F6FB; }
        .spectrum-bar { height: 3px; background: linear-gradient(90deg, #FF9160, #FF5FA2, #A96BFF, #4FC9F5, #6FE3C4); margin-bottom: 20px; }
        .content { padding: 0 20px 20px 20px; }
        h2 { font-size: 16px; font-weight: 700; margin: 18px 0 12px 0; color: #F2F6FB; text-transform: uppercase; letter-spacing: 0.08em; padding-left: 0; border-left: 4px solid #FF9160; padding-left: 12px; }
        p { font-size: 14px; color: #A9BCD2; margin-bottom: 14px; line-height: 1.6; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
        .logo-footer { font-size: 12px; font-weight: 700; letter-spacing: 0.15em; color: #F2F6FB; margin-bottom: 6px; }
        .footer-text { font-size: 10px; color: #63799A; margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Spectrum Bar (tabela com cores sólidas) -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #050D18;">
          <tr>
            <td width="20%" style="background: #FF9160; height: 3px; padding: 0; margin: 0;"></td>
            <td width="20%" style="background: #FF5FA2; height: 3px; padding: 0; margin: 0;"></td>
            <td width="20%" style="background: #A96BFF; height: 3px; padding: 0; margin: 0;"></td>
            <td width="20%" style="background: #4FC9F5; height: 3px; padding: 0; margin: 0;"></td>
            <td width="20%" style="background: #6FE3C4; height: 3px; padding: 0; margin: 0;"></td>
          </tr>
        </table>
        <div class="header">
          <h1 style="font-size: 28px; letter-spacing: 0.25em; font-weight: 700; margin: 0; color: #F2F6FB;">
            <span style="color: #FF9160;">P</span><span style="color: #FF5FA2;">R</span><span style="color: #A96BFF;">I</span><span style="color: #4FC9F5;">S</span><span style="color: #6FE3C4;">M</span><span style="color: #FF9160;">A</span>
          </h1>
        </div>
        <div class="content">
          <h2>Bem-vindo ao PRISMA</h2>
          <p>Seu cadastro foi confirmado com sucesso.</p>
          <p>Em breve você receberá um e-mail com o protocolo completo de fotos de referência. Siga o guia à risca para garantir retratos de qualidade premium.</p>
          <p>Qualquer dúvida, chame o suporte dentro do PRISMA.</p>
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
