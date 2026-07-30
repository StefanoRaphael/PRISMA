/**
 * PRISMA — envio do follow-up de correções para quem pegou a falha de 29/07/2026
 *
 * Destinatários: os dois cadastros que ficaram sem perfil e travaram na
 * geração. Ambos já receberam o pedido de desculpas (assunto "Prisma
 * Correção"); este e-mail é a continuação, com as correções no ar, o
 * domínio próprio e a confirmação de que os créditos seguem de pé.
 *
 * Uso:
 *   node marketing/enviar-follow-up.mjs --checar
 *   node marketing/enviar-follow-up.mjs --teste seu@email.com
 *   node marketing/enviar-follow-up.mjs --enviar
 *
 * A chave sai de RESEND_API_KEY no ambiente ou, se não houver, de
 * .env.local na raiz do projeto (fora do git). Ler do arquivo é o que
 * permite o envio agendado rodar sem a chave escrita no crontab.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..');

/** Lê uma variável do .env.local sem depender de pacote externo. */
function doEnvLocal(nome) {
  const arquivo = path.join(RAIZ, '.env.local');
  if (!existsSync(arquivo)) return null;
  for (const linha of readFileSync(arquivo, 'utf-8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const i = limpa.indexOf('=');
    if (i > 0 && limpa.slice(0, i).trim() === nome) {
      return limpa.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const CHAVE = process.env.RESEND_API_KEY || doEnvLocal('RESEND_API_KEY');
if (!CHAVE) {
  console.error('Falta RESEND_API_KEY (no ambiente ou em .env.local).');
  process.exit(1);
}

const ASSUNTO = 'PRISMA · correções no ar';
const REMETENTE = 'PRISMA <contato@prismaretrato.com.br>';

const DESTINATARIOS = [
  'guilhermeamarogw@gmail.com',
  'andreandradevasconcellos@gmail.com'
];

const html = readFileSync(path.join(__dirname, 'emails', 'follow-up-correcoes.html'), 'utf-8');

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
    process.exit(1);
  }
  const dominios = corpo.data || [];
  console.log(`Domínios na conta: ${dominios.length}\n`);
  for (const d of dominios) {
    console.log(`  ${(d.status === 'verified' ? 'VERIFICADO' : d.status.toUpperCase()).padEnd(12)} ${d.name}`);
  }
  const ok2 = dominios.some(d => d.status === 'verified' && REMETENTE.includes(d.name));
  console.log(`\nRemetente: ${REMETENTE}`);
  console.log(ok2
    ? 'Domínio do remetente verificado. Pode enviar.'
    : 'ATENÇÃO: o domínio do remetente não aparece verificado nesta conta.');
}

async function enviar(lista) {
  console.log(`Remetente: ${REMETENTE}`);
  console.log(`Assunto:   ${ASSUNTO}`);
  console.log(`Enviando para ${lista.length} destinatário(s)\n`);

  let enviados = 0;
  let falhas = 0;
  for (const email of lista) {
    const { ok, status, corpo } = await resend('emails', {
      method: 'POST',
      body: JSON.stringify({ from: REMETENTE, to: [email], subject: ASSUNTO, html })
    });
    if (ok) {
      console.log(`  OK     ${email}  ${corpo.id || ''}`);
      enviados++;
    } else {
      console.error(`  FALHOU ${email}  HTTP ${status} ${JSON.stringify(corpo)}`);
      falhas++;
    }
    await new Promise(r => setTimeout(r, 600));
  }
  console.log(`\n${enviados} enviado(s), ${falhas} falha(s)`);
  if (falhas > 0) process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes('--checar')) {
  await checar();
} else if (args.includes('--teste')) {
  const destino = args[args.indexOf('--teste') + 1];
  if (!destino) {
    console.error('Uso: node marketing/enviar-follow-up.mjs --teste seu@email.com');
    process.exit(1);
  }
  await enviar([destino]);
} else if (args.includes('--enviar')) {
  await enviar(DESTINATARIOS);
} else {
  console.log('Uso:');
  console.log('  node marketing/enviar-follow-up.mjs --checar');
  console.log('  node marketing/enviar-follow-up.mjs --teste seu@email.com');
  console.log('  node marketing/enviar-follow-up.mjs --enviar');
}
