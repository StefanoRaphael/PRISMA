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

// Reserva de segurança: só entra em cena se api/prompt.js não devolver
// variantes raciocinadas (fallback de erro do Gemini, ou geração antiga).
// O caminho normal é receber variantes já pensadas para aquela ocasião e
// aquele pedido — uma lista fixa aplicada sempre foi o que causava
// lateralização exagerada em cenas que pediam composição mais contida.
const VARIANTES_ENQUADRAMENTO = [
  'SHOT VARIANT FOR THIS FRAME: slightly low camera angle (shooting up), subject placed in the right third of frame, generous negative space to the left.',
  'SHOT VARIANT FOR THIS FRAME: slightly elevated camera angle (shooting down), subject placed in the left third of frame, environment framing the composition asymmetrically.',
  'SHOT VARIANT FOR THIS FRAME: eye-level camera with a subtle canted/Dutch horizon (3-5 degrees), tight crop with a foreground element partially entering one edge of the frame.',
  'SHOT VARIANT FOR THIS FRAME: wide environmental composition, subject smaller in frame within the setting, rule-of-thirds placement, deep visible context around them.'
];

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function partesDeReferencia(referencias) {
  return referencias.slice(0, MAX_REFERENCIAS).map(dataUrl => {
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
    if (!m) return null;
    return { inline_data: { mime_type: m[1], data: m[2] } };
  }).filter(Boolean);
}

export async function gerarUmRetrato(prompt, referencias, coresMarca = [], variante = '') {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error('GEMINI_API_KEY não configurada');

  let textoPrompt = `${REFORCO_FIDELIDADE}\n\n${prompt}`;

  if (variante) {
    textoPrompt += `\n\n${variante}`;
  }

  // Se houver cores de marca, adiciona instrução estratégica
  if (coresMarca && coresMarca.length > 0) {
    const coresFormatadas = coresMarca.join(', ');
    textoPrompt += `\n\nBRAND COLORS: Incorporate these colors strategically in clothing, accessories, or background: ${coresFormatadas}. Colors should feel natural, never forced or overwhelming.`;
  }

  const corpo = {
    contents: [{
      parts: [
        { text: textoPrompt },
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
 * Gera N retratos em paralelo (N varia por plano: 4 para Básico/Pro, 5 para
 * o Starter avulso, 1 para o Legacy). Uma chamada falhar não derruba as
 * outras — o cliente recebe o que deu certo.
 * @param {string[]} variantesReasoned Variantes já raciocinadas por api/prompt.js
 *   para esta ocasião e este pedido específicos. Vazio ou ausente cai na lista
 *   fixa genérica, só como reserva de segurança.
 * @returns {Promise<{urls:string[], parcial:boolean, erros:string[]}>}
 */
export async function gerarRetratos(prompt, referencias, quantidade = 4, coresMarca = [], variantesReasoned = []) {
  // Embaralha as variantes e repete o ciclo se quantidade > tamanho da lista,
  // pra nunca cair sempre na mesma ordem nem repetir o mesmo ângulo lado a lado.
  const base = variantesReasoned.length ? variantesReasoned : VARIANTES_ENQUADRAMENTO;
  const variantes = embaralhar(base);
  const resultados = await Promise.allSettled(
    Array.from({ length: quantidade }, (_, i) =>
      gerarUmRetrato(prompt, referencias, coresMarca, variantes[i % variantes.length])
    )
  );

  const urls = resultados.filter(r => r.status === 'fulfilled').map(r => r.value);
  const erros = resultados
    .filter(r => r.status === 'rejected')
    .map(r => r.reason?.message || String(r.reason));

  if (urls.length === 0) {
    throw new Error(erros[0] || `Todas as ${quantidade} gerações falharam.`);
  }

  return { urls, parcial: urls.length < quantidade, erros };
}
