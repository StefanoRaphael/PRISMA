import { chromium } from 'playwright';
import path from 'path';

const nome = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`file://${path.resolve('.', nome + '.html')}`);
await page.waitForTimeout(500);
await page.pdf({
  path: `${nome}.pdf`,
  width: '1080px',
  height: '1920px',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
});
console.log(`OK: ${nome}.pdf`);
await browser.close();
