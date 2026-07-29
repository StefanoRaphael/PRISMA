import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function gerarFlyer() {
  let browser;
  try {
    console.log('📄 Gerando flyer PDF com identidade visual PRISMA real...\n');
    
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });

    const htmlPath = `file://${path.join(__dirname, 'flyer-convite-a4-real.html')}`;
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });

    // Renderizar PDF com qualidade máxima
    await page.pdf({
      path: path.join(__dirname, 'flyer-convite-a4.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      scale: 2,
    });

    await page.close();
    console.log('✅ flyer-convite-a4.pdf gerado com sucesso!');
    console.log('📁 /Users/stefanoraphael/PRISMA/marketing/flyer-convite-a4.pdf\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

gerarFlyer();
