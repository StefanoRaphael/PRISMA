/**
 * PRISMA — geração de imagem via Gemini (Nano Banana Pro)
 *
 * Substitui a Magnific. Confirmado por teste direto contra a API real
 * (não por suposição de documentação, que veio contraditória entre duas
 * consultas — uma delas descrevia uma "Interactions API" que não bate com
 * o generateContent clássico usado aqui):
 *
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key=CHAVE
 *   corpo: { contents: [{ parts: [{ text }, ...imagens de referência] }],
 *            generationConfig: { imageConfig: { aspectRatio } } }
 *
 * Diferente da Magnific, aqui NÃO existe fila: a chamada devolve a imagem
 * pronta na mesma resposta. Cada chamada devolve UMA imagem só, por isso
 * disparamos 4 em paralelo para os 4 retratos da geração.
 *
 * Referências: o app já manda foto como data URL (base64), então não
 * precisa baixar nada da rede — só separar o cabeçalho do conteúdo.
 */

const MODELO = 'gemini-3-pro-image';
const MAX_REFERENCIAS = 8;

const REFORCO_FIDELIDADE = [
  'CRITICAL: Preserve the facial identity from the reference photos EXACTLY.',
  'Do not alter face shape, eyes, nose, lips, skin tone, or any facial feature.',
  'Only change clothing, setting, lighting, pose, and background.'
].join(' ');

function partesDeReferencia(referencias) {
  return referencias.slice(0, MAX_REFERENCIAS).map(dataUrl => {
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
    if (!m) return null;
    return { inline_data: { mime_type: m[1], data: m[2] } };
  }).filter(Boolean);
}

export async function gerarUmRetrato(prompt, referencias) {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error('GEMINI_API_KEY não configurada');

  const corpo = {
    contents: [{
      parts: [
        { text: `${REFORCO_FIDELIDADE}\n\n${prompt}` },
        ...partesDeReferencia(referencias)
      ]
    }],
    generationConfig: {
      imageConfig: { aspectRatio: '9:16' }
    }
  };

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
  );

  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new Error(`Gemini recusou a geração (${r.status}): ${texto.slice(0, 300)}`);
  }

  const d = await r.json();

  if (d?.candidates?.[0]?.finishReason === 'PROHIBITED_CONTENT') {
    throw new Error('Gemini recusou por conteúdo restrito.');
  }

  const partes = d?.candidates?.[0]?.content?.parts || [];
  const bloco = partes.find(p => p.inlineData || p.inline_data);
  const inline = bloco?.inlineData || bloco?.inline_data;
  if (!inline?.data) throw new Error('Gemini não devolveu imagem nesta chamada.');

  const mime = inline.mimeType || inline.mime_type || 'image/jpeg';
  return `data:${mime};base64,${inline.data}`;
}

/**
 * Gera até 4 retratos, em paralelo. Uma chamada falhar não derruba as
 * outras — o cliente recebe o que deu certo.
 * @returns {Promise<{urls:string[], parcial:boolean, erros:string[]}>}
 */
export async function gerarRetratos(prompt, referencias) {
  const resultados = await Promise.allSettled(
    Array.from({ length: 4 }, () => gerarUmRetrato(prompt, referencias))
  );

  const urls = resultados.filter(r => r.status === 'fulfilled').map(r => r.value);
  const erros = resultados
    .filter(r => r.status === 'rejected')
    .map(r => r.reason?.message || String(r.reason));

  if (urls.length === 0) {
    throw new Error(erros[0] || 'Todas as 4 gerações falharam.');
  }

  return { urls, parcial: urls.length < 4, erros };
}
