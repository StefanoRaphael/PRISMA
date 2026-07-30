import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const htmlPath = '/Users/stefanoraphael/PRISMA/protocolo-final-lux.html';
const pdfPath = '/Users/stefanoraphael/PRISMA/PROTOCOLO-FOTOS-PRISMA.pdf';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    printBackground: true,
  });

  console.log(`✅ PDF gerado: ${pdfPath}`);
  await browser.close();
})();
