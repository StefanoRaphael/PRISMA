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

// Fonte única do template: marketing/emails/boas-vindas.html. Editar o visual
// ali, não aqui — evita as duas cópias divergentes que existiam antes (uma
// neste arquivo, outra em email-boas-vindas-template.html na raiz).
const boasVindasHtmlPath = path.join(__dirname, 'emails', 'boas-vindas.html');
const boasVindasHtml = readFileSync(boasVindasHtmlPath, 'utf-8');

const ASSUNTO = 'PRISMA — Bem-vindo! Protocolo de fotos anexado';
const REMETENTE = 'PRISMA <contato@prismaretrato.com.br>';  // domínio verificado no Resend em 30/07/2026

const LISTA_REAL = [
  'vidjow@gmail.com',
  'andre.estudiomzn@gmail.com',
  'erikagilberti@gmail.com',
  'baezztati@gmail.com',
];

function emailTemplate(nomeUsuario) {
  const titulo = nomeUsuario
    ? `${nomeUsuario}, sua conta no PRISMA está pronta.`
    : 'Sua conta no PRISMA está pronta.';
  return boasVindasHtml.replace('{{TITULO}}', titulo);
}

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
