import puppeteer from 'puppeteer';

const htmlPath = '/Users/stefanoraphael/PRISMA/flyer-stories-criativo.html';
const pngPath = '/Users/stefanoraphael/PRISMA/PRISMA-STORY-CRIATIVO.png';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  await page.screenshot({
    path: pngPath,
    fullPage: false,
  });

  console.log(`✅ PNG criativo gerado: ${pngPath}`);
  await browser.close();
})();
