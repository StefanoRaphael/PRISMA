/**
 * PRISMA — montagem do e-mail de boas-vindas + protocolo
 *
 * Usado em dois lugares: marketing/send-protocolo-email.mjs (envio manual,
 * qualquer perfil) e api/send-welcome-email.js (disparo automático no
 * cadastro, sempre perfil "novo"). Centralizado aqui pra não ter duas cópias
 * do mesmo texto podendo divergir uma da outra.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const boasVindasHtmlPath = path.join(__dirname, 'emails', 'boas-vindas.html');
const boasVindasHtml = readFileSync(boasVindasHtmlPath, 'utf-8');

const protocoloPdfPath = path.join(__dirname, '..', 'PROTOCOLO-FOTOS-PRISMA.pdf');

/**
 * Dois públicos, dois textos.
 *
 * "novo" é quem acabou de se cadastrar: precisa saber o que é o PRISMA antes
 * de qualquer coisa. "cliente" é quem já está dentro e já usou o produto:
 * receber "bem-vindo, isto é o PRISMA" soa como se a gente não soubesse
 * quem ele é. Para esse, o assunto e a abertura vão direto ao que ele ainda
 * não tem, que é o protocolo.
 */
export const PERFIS = {
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

/**
 * Monta o HTML do e-mail para o perfil pedido.
 *
 * replaceAll em cada marcador: replace simples trocaria só a primeira
 * ocorrência, o mesmo erro que já deixou um botão sem link nos templates
 * do Supabase mais cedo. O assert depois garante que nenhum marcador
 * sobrou sem substituir antes do e-mail sair.
 */
export function montarEmailBoasVindas(nomeUsuario, perfil = 'novo') {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);

  const html = boasVindasHtml
    .replaceAll('ROTULO_AQUI', p.rotulo)
    .replaceAll('{{TITULO}}', p.titulo(nomeUsuario))
    .replaceAll('ABERTURA_AQUI', p.abertura);

  for (const marcador of ['ROTULO_AQUI', '{{TITULO}}', 'ABERTURA_AQUI']) {
    if (html.includes(marcador)) throw new Error(`marcador ${marcador} ficou sem substituir`);
  }

  return { assunto: p.assunto, html };
}

/** PDF do protocolo, para anexar ao e-mail. */
export function lerProtocoloPdf() {
  return readFileSync(protocoloPdfPath);
}
