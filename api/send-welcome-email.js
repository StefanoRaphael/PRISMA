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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #050D18;
          color: #F2F6FB;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #050D18;
          color: #F2F6FB;
        }
        .header {
          text-align: left;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 2px solid;
          border-image: linear-gradient(90deg, #FF9160, #FF5FA2, #A96BFF, #4FC9F5, #6FE3C4) 1;
        }
        .header h1 {
          font-size: 28px;
          letter-spacing: 0.25em;
          font-weight: 700;
          margin-bottom: 8px;
          color: #F2F6FB;
        }
        h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 22px 0 11px 0;
          color: #F2F6FB;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-left: 4px solid #FF9160;
          padding-left: 12px;
        }
        p {
          font-size: 13px;
          color: #A9BCD2;
          margin-bottom: 10px;
          line-height: 1.6;
        }
        strong { font-weight: 650; color: #F2F6FB; }
        ul, ol {
          margin-left: 22px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #A9BCD2;
        }
        li { margin-bottom: 5px; line-height: 1.5; }
        .spec-box {
          background: linear-gradient(135deg, rgba(255, 145, 96, 0.08) 0%, rgba(107, 227, 196, 0.08) 100%);
          border: 1.5px solid;
          border-image: linear-gradient(90deg, #FF9160, #6FE3C4) 1;
          padding: 16px;
          border-radius: 12px;
          margin: 13px 0;
        }
        .spec-header {
          font-weight: 700;
          color: #F2F6FB;
          margin-bottom: 14px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .spec-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .spec-item {
          font-size: 12.5px;
          color: #A9BCD2;
          display: flex;
          align-items: center;
          padding: 6px 0;
        }
        .spec-item:before {
          content: "✓";
          color: #4FC9F5;
          font-weight: 800;
          margin-right: 8px;
          font-size: 14px;
        }
        .warning-box {
          background: rgba(255, 95, 162, 0.08);
          border-left: 4px solid #FF5FA2;
          padding: 16px;
          border-radius: 10px;
          margin: 20px 0;
          font-size: 12.5px;
          color: #A9BCD2;
        }
        .warning-box strong {
          display: block;
          margin-bottom: 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #FF9B9B;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 12px;
          color: #A9BCD2;
        }
        td {
          padding: 11px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        td:first-child {
          font-weight: 650;
          color: #F2F6FB;
          width: 35%;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1.5px solid rgba(255,255,255,0.1);
          font-size: 11px;
        }
        .logo-footer {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.15em;
          margin-bottom: 6px;
          color: #F2F6FB;
        }
        .footer-text {
          color: #63799A;
          font-size: 10px;
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PRISMA</h1>
        </div>

        <h2>Bem-vindo ao PRISMA</h2>
        <p>Seu cadastro foi confirmado! Agora siga o protocolo de fotos abaixo para gerar seus primeiros retratos.</p>

        <h2>Introdução</h2>
        <p>Para gerar seus retratos incríveis, você precisa enviar 8-12 fotos suas que sirvam como referência. A qualidade dessas fotos é fundamental: quanto melhor a entrada, melhor será o resultado final.</p>

        <div class="spec-box">
          <div class="spec-header">Resumo Rápido</div>
          <div class="spec-grid">
            <div class="spec-item">Quantidade: 8 a 12 fotos</div>
            <div class="spec-item">Fundo: Branco ou cinza claro</div>
            <div class="spec-item">Luz: Natural (perto de janela)</div>
            <div class="spec-item">Roupas: Básicas, sem logos</div>
            <div class="spec-item">Posição: Câmera ao nível dos olhos</div>
            <div class="spec-item">Expressões: Variadas</div>
          </div>
        </div>

        <h2>Posicionamento Profissional</h2>
        <p><strong>A regra de ouro:</strong> câmera ao nível dos seus olhos, não selfie com braço esticado. Isso remove distorção e garante fidelidade ao seu rosto real.</p>

        <h2>Fundo</h2>
        <p><strong>Obrigatório: branco ou cinza claro.</strong> Sem texturas, quadros ou objetos atrás.</p>

        <h2>Luz (Crítico)</h2>
        <p><strong>Sempre luz natural.</strong> Sente-se de frente para uma janela. Sem iluminação artificial, spots ou lâmpadas. Luz homogênea, sem sombras fortes no rosto.</p>

        <h2>Roupas</h2>
        <p><strong>Simples e neutras.</strong> Camiseta básica, cores neutras (branca, preta, cinza). Sem estampas ou logos.</p>

        <h2>Ângulos (6+ variações)</h2>
        <p>Envie fotos com ângulos diferentes. Frontal, 3/4 dos dois lados, perfis e corpo inteiro. Isso ajuda a IA a entender sua estrutura facial.</p>

        <h2>Expressões (4+ variações)</h2>
        <p><strong>Variações de expressão:</strong> sorrindo (dentes), sorriso leve, sério e pensativo.</p>

        <div class="warning-box">
          <strong>Se você só tem câmera frontal (selfie)</strong>
          Tire normalmente, mas VIRE a foto horizontalmente antes de enviar. Seu rosto não fica espelhado no PRISMA.
        </div>

        <h2>Resumo: O Que Enviar</h2>
        <div class="spec-box">
          <table>
            <tr>
              <td>Total de fotos</td>
              <td>8 a 12 (qualidade > quantidade)</td>
            </tr>
            <tr>
              <td>Rosto (closeup)</td>
              <td>6 fotos com ângulos e expressões variadas</td>
            </tr>
            <tr>
              <td>Corpo inteiro</td>
              <td>3 a 4 fotos (frontal, 3/4, perfil)</td>
            </tr>
            <tr>
              <td>Fundo</td>
              <td>Branco ou cinza claro, limpo</td>
            </tr>
            <tr>
              <td>Iluminação</td>
              <td>Natural, perto de janela</td>
            </tr>
            <tr>
              <td>Roupas</td>
              <td>Camiseta básica, sem logos</td>
            </tr>
          </table>
        </div>

        <h2>Próximos Passos</h2>
        <ol>
          <li>Reúna suas 8-12 fotos seguindo este protocolo</li>
          <li>Abra o PRISMA e faça upload na tela de referência</li>
          <li>Responda o questionário de arquétipos (2 minutos)</li>
          <li>Escolha a ocasião e descreva como você imagina a foto</li>
          <li>Gere seus retratos. A IA processa em alguns minutos</li>
        </ol>

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
