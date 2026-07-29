/**
 * PRISMA — diagnóstico do Mercado Pago
 *
 * Em 29/07/2026 o checkout parou com 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES
 * em todos os planos. Esse código não diz o motivo: ele aparece tanto para
 * credencial de produção não ativada quanto para conta com pendência ou
 * aplicação sem o Checkout habilitado.
 *
 * Este script separa os casos. Ele NÃO cobra nada de ninguém: só consulta a
 * conta e tenta criar uma preferência de teste, que é um rascunho de cobrança
 * e não gera pagamento.
 *
 * Uso:
 *   MP_ACCESS_TOKEN=APP_USR-xxx node marketing/diagnostico-mercadopago.mjs
 */

const TOKEN = process.env.MP_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Falta MP_ACCESS_TOKEN. Rode assim:');
  console.error('  MP_ACCESS_TOKEN=APP_USR-xxx node marketing/diagnostico-mercadopago.mjs');
  process.exit(1);
}

const linha = (t = '') => console.log(t);
const titulo = (t) => { linha(); linha(`--- ${t} ---`); };

async function mp(caminho, opcoes = {}) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, {
    ...opcoes,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {})
    }
  });
  const corpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, corpo };
}

// 1. Que tipo de credencial é essa?
titulo('CREDENCIAL');
if (TOKEN.startsWith('TEST-')) {
  linha('Tipo: TESTE (começa com TEST-)');
  linha('');
  linha('PROBLEMA ENCONTRADO: credencial de teste não cobra dinheiro de verdade.');
  linha('No painel do Mercado Pago, vá em Suas integrações > sua aplicação >');
  linha('Credenciais de PRODUÇÃO e use o Access Token de lá (começa com APP_USR-).');
} else if (TOKEN.startsWith('APP_USR-')) {
  linha('Tipo: PRODUÇÃO (começa com APP_USR-)');
} else {
  linha(`Tipo: DESCONHECIDO (começa com "${TOKEN.slice(0, 8)}...")`);
  linha('Um Access Token do Mercado Pago começa com APP_USR- ou TEST-.');
  linha('Confira se você não copiou a Public Key por engano.');
}

// 2. A conta responde?
titulo('CONTA');
const me = await mp('/users/me');
if (me.ok) {
  const u = me.corpo;
  linha(`Conta:     ${u.nickname || u.id}`);
  linha(`E-mail:    ${u.email || 'não informado'}`);
  linha(`País:      ${u.site_id || '?'}`);
  linha(`Tipo:      ${u.user_type || '?'}`);
  if (Array.isArray(u.status?.list)) linha(`Situação:  ${u.status.list.join(', ')}`);
  if (u.status?.site_status) linha(`Status:    ${u.status.site_status}`);
} else {
  linha(`Falhou (HTTP ${me.status}).`);
  linha(JSON.stringify(me.corpo, null, 2));
  if (me.status === 401) {
    linha('');
    linha('PROBLEMA ENCONTRADO: o token é inválido ou foi revogado.');
    linha('Gere um novo em Suas integrações > sua aplicação > Credenciais de produção.');
    process.exit(1);
  }
}

// 3. Consegue criar uma preferência? É exatamente o que o checkout faz.
titulo('CRIAÇÃO DE COBRANÇA (o passo que está falhando)');
const teste = await mp('/checkout/preferences', {
  method: 'POST',
  body: JSON.stringify({
    items: [{
      id: 'diagnostico',
      title: 'PRISMA — teste de diagnóstico',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: 1.00
    }],
    statement_descriptor: 'PRISMA'
  })
});

if (teste.ok) {
  linha('FUNCIONOU. A conta consegue criar cobrança.');
  linha(`Preferência de teste: ${teste.corpo.id}`);
  linha('');
  linha('Se o app ainda falha, o problema está na variável MP_ACCESS_TOKEN da');
  linha('Vercel, e não na conta: confira se o valor lá é este mesmo token e');
  linha('refaça o deploy depois de salvar.');
} else {
  linha(`FALHOU (HTTP ${teste.status})`);
  linha(JSON.stringify(teste.corpo, null, 2));
  linha('');

  const codigo = teste.corpo?.code || '';
  if (teste.status === 403 && codigo === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
    linha('PROBLEMA ENCONTRADO: a conta está barrada por política do Mercado Pago.');
    linha('');
    linha('É quase sempre uma destas três coisas, nesta ordem de probabilidade:');
    linha('  1. As credenciais de produção nunca foram ATIVADAS. O Mercado Pago');
    linha('     exige preencher um formulário sobre o negócio antes de liberar.');
    linha('  2. A conta tem pendência de cadastro (documento, dados da empresa).');
    linha('  3. A aplicação foi criada sem o produto Checkout Pro marcado.');
    linha('');
    linha('Comece pelo item 1: mercadopago.com.br/developers/panel/app');
  } else if (teste.status === 401) {
    linha('PROBLEMA ENCONTRADO: token inválido ou revogado.');
  } else {
    linha('Me mande este bloco inteiro que eu interpreto.');
  }
}

linha();
