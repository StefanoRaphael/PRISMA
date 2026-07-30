import { chaveResend } from './lib-env.mjs';
import { PERFIS, montarEmailBoasVindas, lerProtocoloPdf } from './lib-boas-vindas.mjs';

const RESEND_API_KEY = chaveResend();
const protocoloPdf = lerProtocoloPdf();

const REMETENTE = 'PRISMA <contato@prismaretrato.com.br>';  // domínio verificado no Resend em 30/07/2026

const LISTA_REAL = [
  'vidjow@gmail.com',
  'andre.estudiomzn@gmail.com',
  'erikagilberti@gmail.com',
  'baezztati@gmail.com',
];

async function enviarPara(destinatario, nomeUsuario = '', perfil = 'novo') {
  const { assunto, html } = montarEmailBoasVindas(nomeUsuario, perfil);

  const payload = {
    from: REMETENTE,
    to: [destinatario],
    subject: assunto,
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
