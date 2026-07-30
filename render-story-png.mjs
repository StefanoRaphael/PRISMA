import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const htmlPath = '/Users/stefanoraphael/PRISMA/flyer-stories-4-5.html';
const pngPath = '/Users/stefanoraphael/PRISMA/PRISMA-STORY-4-5.png';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Viewport 4:5 (1080x1920)
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

  console.log(`✅ PNG gerado: ${pngPath}`);
  console.log(`   Dimensões: 1080x1920 (4:5)`);
  await browser.close();
})();
