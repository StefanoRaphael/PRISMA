/**
 * PRISMA — envio do e-mail de desculpas pela falha de 29/07/2026
 *
 * Destinatários: os dois cadastros que ficaram sem perfil e travaram na
 * geração (ver supabase-reparo-perfis.sql). Ambos já receberam o acesso de
 * cortesia no banco antes deste envio.
 *
 * Uso:
 *   RESEND_API_KEY=re_xxx node marketing/enviar-email-correcao.mjs --checar
 *   RESEND_API_KEY=re_xxx node marketing/enviar-email-correcao.mjs --teste seu@email.com
 *   RESEND_API_KEY=re_xxx node marketing/enviar-email-correcao.mjs --enviar
 *
 * Sempre rode --checar primeiro. Ele lista os domínios verificados na conta e
 * evita a armadilha do remetente: com o endereço de teste do Resend
 * (onboarding@resend.dev) a entrega só funciona para o dono da conta, e um
 * disparo para terceiros falha destinatário por destinatário.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHAVE = process.env.RESEND_API_KEY;
if (!CHAVE) {
  console.error('Falta RESEND_API_KEY. Rode assim:');
  console.error('  RESEND_API_KEY=re_xxx node marketing/enviar-email-correcao.mjs --checar');
  process.exit(1);
}

const ASSUNTO = 'Prisma Correção';

// Trocar para um endereço do domínio verificado assim que --checar apontar um.
const REMETENTE = process.env.PRISMA_REMETENTE || 'PRISMA <onboarding@resend.dev>';

const DESTINATARIOS = [
  'guilhermeamarogw@gmail.com',
  'andreandradevasconcellos@gmail.com'
];

const html = readFileSync(path.join(__dirname, 'email-desculpas-falha.html'), 'utf-8');

async function resend(caminho, opcoes = {}) {
  const r = await fetch(`https://api.resend.com/${caminho}`, {
    ...opcoes,
    headers: {
      'Authorization': `Bearer ${CHAVE}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {})
    }
  });
  const corpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, corpo };
}

async function checar() {
  const { ok, status, corpo } = await resend('domains');
  if (!ok) {
    console.error(`Não consegui consultar os domínios (HTTP ${status}).`);
    console.error(JSON.stringify(corpo, null, 2));
    console.error('\nSe deu 401, a chave está errada ou foi revogada.');
    process.exit(1);
  }

  const dominios = corpo.data || [];
  console.log(`Domínios na conta: ${dominios.length}\n`);
  for (const d of dominios) {
    const marca = d.status === 'verified' ? 'VERIFICADO' : d.status.toUpperCase();
    console.log(`  ${marca.padEnd(12)} ${d.name}`);
  }

  const verificados = dominios.filter(d => d.status === 'verified');
  console.log('');
  if (verificados.length) {
    console.log('Pode enviar para terceiros. Use um remetente desse domínio, por exemplo:');
    console.log(`  PRISMA_REMETENTE='PRISMA <contato@${verificados[0].name}>' \\`);
    console.log('  RESEND_API_KEY=re_xxx node marketing/enviar-email-correcao.mjs --enviar');
  } else {
    console.log('NENHUM domínio verificado. Com onboarding@resend.dev o Resend só entrega');
    console.log('para o e-mail dono da conta: o disparo para os clientes vai falhar.');
    console.log('Verifique um domínio em resend.com/domains antes de enviar.');
  }
}

async function enviar(lista) {
  console.log(`Remetente: ${REMETENTE}`);
  console.log(`Assunto:   ${ASSUNTO}\n`);

  let enviados = 0;
  for (const email of lista) {
    const { ok, status, corpo } = await resend('emails', {
      method: 'POST',
      body: JSON.stringify({ from: REMETENTE, to: [email], subject: ASSUNTO, html })
    });

    if (ok) {
      enviados++;
      console.log(`  ENVIADO   ${email}  (id ${corpo.id})`);
    } else {
      console.log(`  FALHOU    ${email}  (HTTP ${status}) ${corpo?.message || JSON.stringify(corpo)}`);
    }
    await new Promise(r => setTimeout(r, 600));   // respeita o limite de taxa do Resend
  }

  console.log(`\n${enviados} de ${lista.length} entregues ao Resend.`);
  if (enviados < lista.length) process.exit(1);
}

const args = process.argv.slice(2);

if (args.includes('--checar')) {
  await checar();
} else if (args.includes('--teste')) {
  const alvo = args[args.indexOf('--teste') + 1];
  if (!alvo) { console.error('Diga para qual e-mail mandar o teste.'); process.exit(1); }
  await enviar([alvo]);
} else if (args.includes('--enviar')) {
  await enviar(DESTINATARIOS);
} else {
  console.log('Escolha: --checar, --teste <email> ou --enviar');
}
