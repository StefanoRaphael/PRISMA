import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function gerarPDFs() {
  let browser;
  try {
    console.log('📄 Gerando PDFs...\n');
    browser = await puppeteer.launch({ headless: 'new' });

    // Gerar PDF do flyer
    const flyerPath = `file://${path.join(__dirname, 'flyer-convite-a4.html')}`;
    const flyerPage = await browser.newPage();
    await flyerPage.goto(flyerPath, { waitUntil: 'networkidle0' });
    await flyerPage.pdf({
      path: path.join(__dirname, 'flyer-convite-a4.pdf'),
      format: 'A4',
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await flyerPage.close();
    console.log('✅ flyer-convite-a4.pdf');

    // Gerar PDF do protocolo
    const protocoloPath = `file://${path.join(__dirname, '..', 'protocolo-fotos-prisma.html')}`;
    const protocoloPage = await browser.newPage();
    await protocoloPage.goto(protocoloPath, { waitUntil: 'networkidle0' });
    await protocoloPage.pdf({
      path: path.join(__dirname, 'protocolo-fotos-prisma.pdf'),
      format: 'A4',
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await protocoloPage.close();
    console.log('✅ protocolo-fotos-prisma.pdf');

    console.log('\n✨ PDFs gerados com sucesso!');
    console.log('Localização: /Users/stefanoraphael/PRISMA/marketing/');
  } catch (error) {
    console.error('❌ Erro ao gerar PDFs:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

gerarPDFs();
