import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error('Falta env var RESEND_API_KEY');
  process.exit(1);
}

const protocoloHtmlPath = path.join(__dirname, '..', 'protocolo-fotos-prisma.html');
const protocoloHtml = readFileSync(protocoloHtmlPath, 'utf-8');

const ASSUNTO = 'PRISMA — Bem-vindo! Protocolo de fotos anexado';
const REMETENTE = 'PRISMA <contato@prismaretrato.com.br>';  // domínio verificado no Resend em 30/07/2026

const LISTA_REAL = [
  'vidjow@gmail.com',
  'andre.estudiomzn@gmail.com',
  'erikagilberti@gmail.com',
  'baezztati@gmail.com',
];

const emailTemplate = (nomeUsuario) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao PRISMA</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
    .header { background: linear-gradient(90deg, #FF9160, #FF5FA2, #A96BFF, #4FC9F5, #6FE3C4); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; letter-spacing: 0.15em; font-weight: 600; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 16px; color: #050D18; margin-top: 0; margin-bottom: 12px; font-weight: 600; }
    .section p { margin: 0 0 12px 0; color: #666; font-size: 14px; }
    .button { display: inline-block; background: linear-gradient(90deg, #FF9160, #FF5FA2, #A96BFF, #4FC9F5, #6FE3C4); color: white; padding: 12px 28px; text-decoration: none; border-radius: 24px; font-weight: 600; margin-top: 8px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>P R I S M A</h1>
  </div>

  <div class="content">
    <div class="section">
      <h2>Bem-vindo ao PRISMA${nomeUsuario ? ', ' + nomeUsuario : ''}!</h2>
      <p>Sua conta foi criada com sucesso. Estamos prontos para transformar suas fotos em retratos incríveis com IA.</p>
    </div>

    <div class="section">
      <h2>Próximo passo: enviar suas fotos de referência</h2>
      <p>Para começar a gerar seus retratos, você precisa enviar 8 a 12 fotos suas que sirvam de referência. Anexado neste e-mail você encontra o protocolo completo com todas as orientações.</p>
      <a href="https://prismaretrato.com.br" class="button">Abrir PRISMA</a>
    </div>

    <div class="section">
      <h2>Dicas rápidas para fotos melhores</h2>
      <ul>
        <li><strong>Posicionamento profissional:</strong> Câmera ao nível dos seus olhos, não selfie.</li>
        <li><strong>Luz natural:</strong> Fique de frente para uma janela.</li>
        <li><strong>Fundo neutro:</strong> Branco ou cinza claro sem objetos atrás.</li>
        <li><strong>Roupas simples:</strong> Camiseta lisa, sem estampas ou logos.</li>
        <li><strong>Ângulos variados:</strong> Frontal, 3/4 esquerda e direita, perfil e corpo inteiro.</li>
      </ul>
    </div>

    <div class="section">
      <h2>Suporte</h2>
      <p>Dúvidas sobre como enviar as fotos? Responda este e-mail ou envie uma mensagem direto no app.</p>
    </div>

    <div class="section">
      <p style="margin: 0; color: #999; font-size: 13px;">
        <strong>PRISMA</strong> · Retratos com o seu rosto de verdade<br>
        Segurança: suas fotos nunca são publicadas nem compartilhadas publicamente.
      </p>
    </div>
  </div>

  <div class="footer">
    <p>© 2026 PRISMA. Todos os direitos reservados.</p>
  </div>
</div>
</body>
</html>
`;

async function enviarPara(destinatario, nomeUsuario = '') {
  const html = emailTemplate(nomeUsuario);
  const protocoloBuffer = Buffer.from(protocoloHtml, 'utf-8');

  const payload = {
    from: REMETENTE,
    to: [destinatario],
    subject: ASSUNTO,
    html,
    attachments: [
      {
        filename: 'PRISMA-Protocolo-Fotos.html',
        content: protocoloBuffer.toString('base64'),
        contentType: 'text/html',
      },
    ],
  };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`${destinatario}: ${resp.status} ${JSON.stringify(json)}`);
  return json;
}

const args = process.argv.slice(2);
const modoTeste = args.includes('--teste');
const modoEnviar = args.includes('--enviar');

if (modoTeste) {
  const destino = args[args.indexOf('--teste') + 1];
  if (!destino) {
    console.error('Uso: node send-protocolo-email.mjs --teste seu@email.com');
    process.exit(1);
  }
  console.log(`📧 Enviando teste pra ${destino}...`);
  try {
    const r = await enviarPara(destino);
    console.log('✓ Enviado:', r.id);
  } catch (e) {
    console.error('✗ Falhou:', e.message);
    process.exit(1);
  }
} else if (modoEnviar) {
  if (LISTA_REAL.length === 0) {
    console.error('❌ LISTA_REAL está vazia.');
    process.exit(1);
  }
  console.log(`📧 Enviando pra ${LISTA_REAL.length} destinatário(s)...`);
  let sucesso = 0;
  let falhou = 0;
  for (const email of LISTA_REAL) {
    try {
      const r = await enviarPara(email);
      console.log(`✓ ${email}`, r.id);
      sucesso++;
    } catch (e) {
      console.error(`✗ ${email}:`, e.message);
      falhou++;
    }
    await new Promise((res) => setTimeout(res, 600));
  }
  console.log(`\n📊 Resumo: ${sucesso} enviado(s), ${falhou} falhou(s)`);
} else {
  console.log('Uso:');
  console.log('  RESEND_API_KEY=xxxx node send-protocolo-email.mjs --teste seu@email.com');
  console.log('  RESEND_API_KEY=xxxx node send-protocolo-email.mjs --enviar');
}
