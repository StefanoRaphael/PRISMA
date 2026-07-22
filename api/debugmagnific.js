/**
 * PRISMA — rota temporária de diagnóstico
 *
 * Só serve para descobrir o formato certo de chamada à Magnific para
 * modelos com referência de rosto. Repassa exatamente o corpo que eu
 * mandar e devolve a resposta crua da Magnific, sem tocar em crédito
 * do cliente nem nas tabelas do banco.
 *
 * APAGAR este arquivo assim que o formato certo for confirmado.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const chave = process.env.MAGNIFIC_API_KEY;
  if (!chave) return res.status(500).json({ erro: 'sem chave' });

  const { modelo, corpo } = req.body || {};
  if (!modelo || !corpo) return res.status(400).json({ erro: 'mande modelo e corpo' });

  const r = await fetch(`https://api.magnific.com/v1/ai/${modelo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-magnific-api-key': chave },
    body: JSON.stringify(corpo)
  });

  const texto = await r.text().catch(() => '');
  return res.status(200).json({ status: r.status, resposta: texto.slice(0, 1500) });
}
