import puppeteer from 'puppeteer';

const html = 'file:///Users/stefanoraphael/PRISMA/marketing/email-correcao-prova-a4.html';
const base = '/Users/stefanoraphael/PRISMA/marketing/PRISMA-EMAIL-A4';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(html, { waitUntil: 'networkidle0' });

  // PDF A4 real, para ler e imprimir. printBackground preserva o fundo abissal.
  await page.pdf({ path: `${base}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log(`PDF:  ${base}.pdf`);

  // PNG por página, em 150 DPI (A4 = 1240x1754), para ver rápido no celular.
  await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1.5 });
  const paginas = await page.$$('.pagina');
  for (let i = 0; i < paginas.length; i++) {
    const caminho = `${base}-p${i + 1}.png`;
    await paginas[i].screenshot({ path: caminho });
    console.log(`PNG:  ${caminho}`);
  }

  await browser.close();
})();
