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

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${chave}&pageSize=200`);
  const texto = await r.text().catch(() => '');
  return res.status(200).json({ status: r.status, resposta: texto });
}
