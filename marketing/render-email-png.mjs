import puppeteer from 'puppeteer';

const htmlPath = '/Users/stefanoraphael/PRISMA/marketing/email-desculpas-falha.html';
const pngPath  = '/Users/stefanoraphael/PRISMA/marketing/PRISMA-EMAIL-CORRECAO.png';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 720 de largura acomoda os 600px do e-mail com respiro nas laterais.
  // deviceScaleFactor 2 gera em retina, legível quando o Stefano abrir no celular.
  await page.setViewport({ width: 720, height: 1200, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: pngPath, fullPage: true });

  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight
  }));
  console.log(`PNG gerado: ${pngPath}`);
  console.log(`Dimensoes da pagina: ${width}x${height} (saida em 2x)`);
  await browser.close();
})();
