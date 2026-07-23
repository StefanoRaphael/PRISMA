import { chromium } from 'playwright';
import path from 'path';

const files = [
  'criativo-executivo-9x16',
  'criativo-viagem-9x16',
  'criativo-versatilidade-9x16',
  'criativo-basico-99-9x16',
  'criativo-pro-199-9x16'
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });

for (const name of files) {
  const filePath = path.resolve('.', `${name}.html`);
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${name}.png` });
  console.log(`OK: ${name}.png`);
}

await browser.close();
