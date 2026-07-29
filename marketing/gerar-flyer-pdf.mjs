import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cores PRISMA (espectro)
const cores = {
  âmbar: '#FF9160',
  magenta: '#FF5FA2',
  violeta: '#A96BFF',
  ciano: '#4FC9F5',
  aurora: '#6FE3C4',
  fundo: '#050D18',
  texto: '#FFFFFF',
  textoCinzento: '#D0D8E0',
};

function criarFlyer() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
  });

  const stream = fs.createWriteStream(path.join(__dirname, 'flyer-convite-a4.pdf'));
  doc.pipe(stream);

  // Dimensões A4 em pontos (210mm x 297mm = 595x842 points)
  const largura = 595;
  const altura = 842;

  // Fundo
  doc.rect(0, 0, largura, altura).fill(cores.fundo);

  // Stripe topo (gradiente de cores PRISMA)
  const stripAltura = 12;
  const stripLargura = largura / 5;
  const coresSpectro = [cores.âmbar, cores.magenta, cores.violeta, cores.ciano, cores.aurora];
  coresSpectro.forEach((cor, i) => {
    doc.rect(i * stripLargura, 0, stripLargura, stripAltura).fill(cor);
  });

  // Conteúdo principal
  const margem = 60;
  let y = 80;

  // Logo PRISMA (cada letra com sua cor)
  doc.fontSize(72);
  doc.font('Helvetica-Bold');

  const letras = [
    { texto: 'P', cor: cores.âmbar },
    { texto: 'R', cor: cores.magenta },
    { texto: 'I', cor: cores.violeta },
    { texto: 'S', cor: cores.ciano },
  ];

  let xLogo = largura / 2 - 140;
  letras.forEach((letra) => {
    doc.fillColor(letra.cor);
    doc.text(letra.texto, xLogo, y, { width: 60, align: 'center' });
    xLogo += 60;
  });

  y += 85;

  // Segunda linha: M A
  xLogo = largura / 2 - 60;
  doc.fillColor(cores.aurora);
  doc.text('M', xLogo, y, { width: 60, align: 'center' });
  xLogo += 60;
  doc.fillColor(cores.âmbar);
  doc.text('A', xLogo, y, { width: 60, align: 'center' });

  y += 90;

  // Tagline
  doc.fontSize(32);
  doc.font('Helvetica-Bold');
  doc.fillColor(cores.texto);
  doc.text('Você foi convidado a fazer o teste.', margem, y, {
    width: largura - margem * 2,
    align: 'center',
    lineGap: 8,
  });

  y += 60;

  // Subtítulo
  doc.fontSize(13);
  doc.font('Helvetica');
  doc.fillColor(cores.textoCinzento);
  doc.text('Retratos com o seu rosto de verdade', margem, y, {
    width: largura - margem * 2,
    align: 'center',
  });

  y += 60;

  // Corpo do texto
  doc.fontSize(14);
  doc.font('Helvetica');
  doc.fillColor(cores.textoCinzento);
  doc.text('Você recebeu este convite porque acreditamos que sua presença e sua imagem merecem estar na sua melhor versão.', margem, y, {
    width: largura - margem * 2,
    align: 'center',
    lineGap: 6,
  });

  y += 70;

  // Destaque
  doc.fontSize(16);
  doc.font('Helvetica-Bold');
  doc.fillColor(cores.texto);
  doc.text('Neste teste, você envia 8 a 12 fotos suas e nossa IA gera retratos profissionais personalizados.', margem, y, {
    width: largura - margem * 2,
    align: 'center',
    lineGap: 8,
  });

  y += 80;

  // Texto final
  doc.fontSize(14);
  doc.font('Helvetica');
  doc.fillColor(cores.textoCinzento);
  doc.text('Exatamente como você imagina ser visto. Sem edição genérica. Sem clichês. Apenas você, ampliado e refinado.', margem, y, {
    width: largura - margem * 2,
    align: 'center',
    lineGap: 6,
  });

  y += 80;

  // CTA Box
  const boxX = margem + 40;
  const boxY = y;
  const boxWidth = largura - margem * 2 - 80;
  const boxHeight = 100;

  // Borda do box (ciano)
  doc.strokeColor(cores.ciano);
  doc.lineWidth(2);
  doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

  // Botão CTA (gradiente simulado com fundo sólido ciano+magenta)
  doc.fillColor(cores.magenta);
  doc.rect(boxX + 20, boxY + 15, boxWidth - 40, 38).fill();

  doc.fontSize(16);
  doc.font('Helvetica-Bold');
  doc.fillColor(cores.texto);
  doc.text('FAZER O TESTE AGORA', boxX, boxY + 20, {
    width: boxWidth,
    align: 'center',
  });

  // URL dentro do box
  doc.fontSize(13);
  doc.font('Helvetica-Bold');
  doc.fillColor(cores.ciano);
  doc.text('usarprisma.com.br', boxX, boxY + 60, {
    width: boxWidth,
    align: 'center',
  });

  y += boxHeight + 50;

  // Rodapé
  doc.fontSize(10);
  doc.font('Helvetica-Bold');
  doc.fillColor(cores.textoCinzento);
  doc.text('P R I S M A', margem, altura - 90, {
    width: largura - margem * 2,
    align: 'center',
  });

  doc.fontSize(9);
  doc.font('Helvetica');
  doc.text('Retratos com o seu rosto de verdade', margem, altura - 70, {
    width: largura - margem * 2,
    align: 'center',
  });

  doc.text('Segurança: suas fotos nunca são publicadas.', margem, altura - 50, {
    width: largura - margem * 2,
    align: 'center',
  });

  // Stripe rodapé
  coresSpectro.forEach((cor, i) => {
    doc.rect(i * stripLargura, altura - stripAltura, stripLargura, stripAltura).fill(cor);
  });

  doc.end();

  stream.on('finish', () => {
    console.log('✅ flyer-convite-a4.pdf gerado com sucesso!');
    console.log('📁 /Users/stefanoraphael/PRISMA/marketing/flyer-convite-a4.pdf');
  });

  stream.on('error', (err) => {
    console.error('❌ Erro ao gerar PDF:', err.message);
  });
}

criarFlyer();
