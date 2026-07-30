/**
 * PRISMA — gerador dos ícones do site e do aplicativo
 *
 * Desenho oficial (opção A, aprovada): triângulo em contorno com o gradiente do
 * espectro da marca. Um arquivo por tamanho, porque cada tamanho tem exigência
 * própria de plataforma:
 *
 * - 32 e 64 px  → fundo transparente, para a aba do navegador.
 * - 180 px      → fundo abissal OPACO. O iOS descarta transparência no ícone de
 *                 tela inicial e achata para preto puro; fixar o abissal aqui
 *                 mantém a cor da marca em vez de deixar o sistema decidir.
 * - 512 px      → fundo abissal opaco, com o triângulo dentro da zona segura de
 *                 80%. O Android recorta ícone em círculo ou squircle conforme o
 *                 lançador, e o que passa dessa margem é cortado fora.
 *
 * A espessura do traço não é a mesma em todos: em 32 px um traço proporcional
 * some, então ele é engrossado para sobreviver ao tamanho real. É a prática
 * normal de favicon, o desenho continua o mesmo.
 *
 * Uso: node marketing/gerar-favicon.mjs
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const ABISSAL = '#050D18';

// Espectro da marca, na ordem oficial (--sp1 a --sp5 do index.html).
const PARADAS = [
  { pos: '0%',   cor: '#FF9160' },
  { pos: '30%',  cor: '#FF5FA2' },
  { pos: '60%',  cor: '#A96BFF' },
  { pos: '82%',  cor: '#4FC9F5' },
  { pos: '100%', cor: '#6FE3C4' }
];

/**
 * @param {object} o
 * @param {number} o.traco     espessura do contorno, na escala de 32
 * @param {boolean} o.fundo    true = abissal opaco (ícone de app), false = transparente
 * @param {number} o.margem    recuo das pontas, para a zona segura do Android
 * @param {number} o.raio      arredondamento do fundo
 */
function svg({ traco, fundo, margem = 0, raio = 0 }) {
  const topo = 4 + margem;
  const base = 27 - margem;
  const esq = 3 + margem;
  const dir = 29 - margem;
  const paradas = PARADAS.map(p => `<stop offset="${p.pos}" stop-color="${p.cor}"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${paradas}</linearGradient></defs>
  ${fundo ? `<rect width="32" height="32" rx="${raio}" fill="${ABISSAL}"/>` : ''}
  <polygon points="16,${topo} ${dir},${base} ${esq},${base}"
           fill="none" stroke="url(#g)" stroke-width="${traco}" stroke-linejoin="round"/>
</svg>`;
}

// Cada saída com a regra da sua plataforma.
const SAIDAS = [
  { arquivo: 'favicon-32.png',        px: 32,  traco: 3.4, fundo: false },
  { arquivo: 'favicon-64.png',        px: 64,  traco: 3.0, fundo: false },
  { arquivo: 'apple-touch-icon.png',  px: 180, traco: 2.6, fundo: true, margem: 2.5, raio: 0 },
  { arquivo: 'icon-512.png',          px: 512, traco: 2.4, fundo: true, margem: 3.2, raio: 0 }
];

mkdirSync('assets/icons', { recursive: true });

// Master em SVG para a aba: escala sem perder nitidez em tela retina.
writeFileSync('assets/icons/favicon.svg', svg({ traco: 2.5, fundo: false }));
console.log('OK  assets/icons/favicon.svg');

// A versão do playwright instalada aqui pede um build de Chromium que não está
// no cache desta máquina, e o download do build exato falha. Aponta para o
// Chrome for Testing que já existe no cache: para renderizar SVG estático a
// diferença de build não tem efeito nenhum no resultado.
const CHROME_LOCAL = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234`
  + '/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const navegador = await chromium.launch({ executablePath: CHROME_LOCAL });

for (const s of SAIDAS) {
  const pagina = await navegador.newPage({
    viewport: { width: s.px, height: s.px },
    deviceScaleFactor: 1
  });

  const corpo = svg({ traco: s.traco, fundo: s.fundo, margem: s.margem, raio: s.raio });
  await pagina.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}
     svg{display:block;width:${s.px}px;height:${s.px}px}</style>${corpo}`
  );
  await pagina.waitForTimeout(120);

  // omitBackground preserva o alfa nos ícones de aba; nos de app o retângulo
  // abissal já cobre o quadro inteiro, então não muda nada lá.
  await pagina.screenshot({
    path: `assets/icons/${s.arquivo}`,
    omitBackground: true
  });
  await pagina.close();

  console.log(`OK  assets/icons/${s.arquivo}  ${s.px}x${s.px}${s.fundo ? '  (fundo abissal)' : '  (transparente)'}`);
}

await navegador.close();
