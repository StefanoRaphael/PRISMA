import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function gerarFlyer() {
  let browser;
  try {
    console.log('📄 Gerando flyer v2 (bordas corrigidas)...\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    const htmlPath = `file://${path.join(__dirname, 'flyer-convite-a4-v2.html')}`;
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: path.join(__dirname, 'flyer-convite-a4.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    await page.close();
    console.log('✅ flyer-convite-a4.pdf gerado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

gerarFlyer();
