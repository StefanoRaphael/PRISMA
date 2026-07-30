import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chaveResend } from './lib-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEND_API_KEY = chaveResend();

// Anexa o PDF, não o HTML. O HTML dependia de imagem hospedada e abria como
// página no navegador; o PDF carrega as fotos dentro do próprio arquivo, abre
// igual no iPhone, no Android e no desktop, e é o formato que o cliente espera
// receber. Gerado por render-protocolo-pdf.mjs a partir de
// protocolo-final-lux.html, que é a versão aprovada do documento.
const protocoloPdfPath = path.join(__dirname, '..', 'PROTOCOLO-FOTOS-PRISMA.pdf');
const protocoloPdf = readFileSync(protocoloPdfPath);

// Fonte única do template: marketing/emails/boas-vindas.html. Editar o visual
// ali, não aqui — evita as duas cópias divergentes que existiam antes (uma
// neste arquivo, outra em email-boas-vindas-template.html na raiz).
const boasVindasHtmlPath = path.join(__dirname, 'emails', 'boas-vindas.html');
const boasVindasHtml = readFileSync(boasVindasHtmlPath, 'utf-8');

const REMETENTE = 'PRISMA <contato@prismaretrato.com.br>';  // domínio verificado no Resend em 30/07/2026

const LISTA_REAL = [
  'vidjow@gmail.com',
  'andre.estudiomzn@gmail.com',
  'erikagilberti@gmail.com',
  'baezztati@gmail.com',
];

/**
 * Dois públicos, dois textos.
 *
 * "novo" é quem acabou de se cadastrar: precisa saber o que é o PRISMA antes
 * de qualquer coisa. "cliente" é quem já está dentro e já usou o produto,
 * como o Guilherme: receber "bem-vindo, isto é o PRISMA" soa como se a gente
 * não soubesse quem ele é. Para esse, o assunto e a abertura vão direto ao
 * que ele ainda não tem, que é o protocolo.
 */
const PERFIS = {
  novo: {
    assunto: 'PRISMA · bem-vindo, seu protocolo de fotos está anexado',
    rotulo: 'Bem-vindo',
    titulo: nome => nome
      ? `${nome}, sua conta no PRISMA está pronta.`
      : 'Sua conta no PRISMA está pronta.',
    abertura: `<p style="margin:0 0 18px 0;">
        O PRISMA gera retratos profissionais com o seu rosto de verdade, em qualquer ocasião: executivo, editorial, viagem, esporte, noite, e mais. Sem sessão de fotos, sem estúdio, sem agenda.
      </p>
      <p style="margin:0;">
        A entrada é um conjunto de fotos suas, e é dessa entrada que sai a qualidade do resultado. Antes de gerar o primeiro retrato, vale ler o que vem a seguir.
      </p>`
  },
  cliente: {
    assunto: 'PRISMA · seu protocolo de fotos',
    rotulo: 'Seu protocolo',
    titulo: nome => nome
      ? `${nome}, este é o material que faltava chegar até você.`
      : 'Este é o material que faltava chegar até você.',
    abertura: `<p style="margin:0 0 18px 0;">
        Você já está usando o PRISMA, mas nunca recebeu o protocolo de fotos de referência. É o documento que mais muda o resultado das suas gerações, então ele vai anexado aqui.
      </p>
      <p style="margin:0;">
        Se as fotos que você enviou não seguiam estas regras, vale refazer o envio. A diferença aparece na primeira geração.
      </p>`
  }
};

function emailTemplate(nomeUsuario, perfil = 'novo') {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);
  // replaceAll em cada marcador: replace simples trocaria só a primeira
  // ocorrência, que já causou botão sem link nos templates do Supabase.
  const html = boasVindasHtml
    .replaceAll('ROTULO_AQUI', p.rotulo)
    .replaceAll('{{TITULO}}', p.titulo(nomeUsuario))
    .replaceAll('ABERTURA_AQUI', p.abertura);

  for (const marcador of ['ROTULO_AQUI', '{{TITULO}}', 'ABERTURA_AQUI']) {
    if (html.includes(marcador)) throw new Error(`marcador ${marcador} ficou sem substituir`);
  }
  return html;
}

async function enviarPara(destinatario, nomeUsuario = '', perfil = 'novo') {
  const html = emailTemplate(nomeUsuario, perfil);

  const payload = {
    from: REMETENTE,
    to: [destinatario],
    subject: PERFIS[perfil].assunto,
    html,
    attachments: [
      {
        filename: 'PRISMA-Protocolo-de-Fotos.pdf',
        content: protocoloPdf.toString('base64'),
        contentType: 'application/pdf',
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

// --perfil novo|cliente. Sem a flag assume "novo", que era o único
// comportamento antes desta opção existir.
const iPerfil = args.indexOf('--perfil');
const perfil = iPerfil >= 0 ? args[iPerfil + 1] : 'novo';
if (!PERFIS[perfil]) {
  console.error(`Perfil inválido: ${perfil}. Use "novo" ou "cliente".`);
  process.exit(1);
}
const nomeIdx = args.indexOf('--nome');
const nome = nomeIdx >= 0 ? args[nomeIdx + 1] : '';

if (modoTeste) {
  const destino = args[args.indexOf('--teste') + 1];
  if (!destino) {
    console.error('Uso: node send-protocolo-email.mjs --teste seu@email.com [--perfil cliente] [--nome Guilherme]');
    process.exit(1);
  }
  console.log(`📧 Enviando pra ${destino}  (perfil: ${perfil}${nome ? ', nome: ' + nome : ''})`);
  console.log(`   assunto: ${PERFIS[perfil].assunto}`);
  try {
    const r = await enviarPara(destino, nome, perfil);
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
  console.log('  node marketing/send-protocolo-email.mjs --teste seu@email.com');
  console.log('  node marketing/send-protocolo-email.mjs --teste x@y.com --perfil cliente --nome Guilherme');
  console.log('  node marketing/send-protocolo-email.mjs --enviar');
  console.log('');
  console.log('Perfis:');
  for (const [k, v] of Object.entries(PERFIS)) {
    console.log(`  ${k.padEnd(8)} ${v.assunto}`);
  }
}
