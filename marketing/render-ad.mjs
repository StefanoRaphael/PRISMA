import { chromium } from 'playwright';
import path from 'path';

const name = process.argv[2];
const file = `file://${path.resolve('.', name + '.html')}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

await page.goto(file);
await page.waitForTimeout(900);
await page.screenshot({ path: `${name}.png` });
console.log(`OK: ${name}.png (1080x1920)`);

await page.goto(file + '#guias');
await page.reload();
await page.waitForTimeout(900);
await page.screenshot({ path: `${name}-guias.png` });
console.log(`OK: ${name}-guias.png (conferência das safe zones)`);

await browser.close();
