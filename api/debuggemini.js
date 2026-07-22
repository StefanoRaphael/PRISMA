/**
 * PRISMA — rota temporária de diagnóstico
 *
 * Lista os modelos Gemini de verdade disponíveis para a chave configurada,
 * pra confirmar o nome exato do modelo de geração de imagem e os métodos
 * que ele suporta, em vez de confiar em resumo de documentação.
 *
 * APAGAR assim que o modelo certo for confirmado.
 */

export default async function handler(req, res) {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return res.status(500).json({ erro: 'sem chave' });
  if (req.query?.v === 'check') return res.status(200).json({ versao: 'v3-strip-base64' });

  if (req.method === 'GET') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${chave}&pageSize=200`);
    const texto = await r.text().catch(() => '');
    return res.status(200).json({ status: r.status, resposta: texto });
  }

  // POST: testa generateContent de verdade com uma imagem mínima de teste
  const { modelo, corpo } = req.body || {};
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
  );
  const d = await r.json().catch(() => null);
  if (!d) return res.status(200).json({ status: r.status, resposta: 'resposta não era JSON' });

  // Resumo, sem o base64: quantos candidatos, quantas imagens por candidato
  const resumo = (d.candidates || []).map(c => ({
    partes: (c.content?.parts || []).map(p =>
      p.inlineData ? { tipo: 'imagem', mimeType: p.inlineData.mimeType, tamanho: p.inlineData.data.length }
      : p.text ? { tipo: 'texto', trecho: p.text.slice(0,80) }
      : { tipo: 'outro' }
    )
  }));
  return res.status(200).json({ status: r.status, numCandidatos: (d.candidates||[]).length, resumo, erro: d.error });
}
