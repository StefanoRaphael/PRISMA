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
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h1>Bem-vindo ao PRISMA</h1>
        <p>Seu cadastro foi confirmado. Agora siga o protocolo de fotos abaixo:</p>
        <p><a href="https://usarprisma.com.br/protocolo-pdf">📋 Ver Protocolo de Fotos Completo</a></p>
      </body>
    </html>
  `;
}
