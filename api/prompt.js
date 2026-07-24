/**
 * PRISMA — POST /api/prompt
 *
 * Recebe o texto livre da cliente e devolve três coisas:
 *   prompt      — master prompt em inglês, pronto para o motor de imagem
 *   leitura     — a interpretação em português, com as palavras dela destacadas
 *   completado  — o que a IA preencheu sozinha
 *
 * As três camadas:
 *   1. base da ocasião (fixa, escrita pelo estúdio, invisível ao cliente)
 *   2. arquétipo (automático, vindo do diagnóstico)
 *   3. o que a cliente escreveu (manda em cima das outras duas)
 */

const MODELO = 'gemini-2.5-flash';

const ESQUEMA = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Master prompt em INGLÊS para o motor de imagem. Funde a base da ocasião, a direção do arquétipo e o pedido do cliente. O pedido do cliente sempre vence em caso de conflito. Descreve roupa, ambiente, luz, hora do dia, postura, expressão, lente e enquadramento. Enquadramento sempre com respiro em cima e nas laterais, para sobreviver a cortes.'
    },
    leitura: {
      type: 'string',
      description: 'A interpretação em PORTUGUÊS do Brasil, em uma ou duas frases corridas. Envolve em <b></b> exatamente as palavras que o cliente escreveu e que precisam aparecer na foto (cores, peças de roupa, restrições como "sem óculos"). Sem markdown, só a tag b.'
    },
    completado: {
      type: 'string',
      description: 'Uma frase em PORTUGUÊS listando o que foi preenchido automaticamente e o cliente não pediu: lente, enquadramento, fundo, paleta. Sem introdução.'
    },
    conflito: {
      type: 'string',
      description: 'Se o pedido do cliente tiver contradição impossível (praia e escritório na mesma foto), descreva em uma frase em português. String vazia se não houver conflito.'
    }
  },
  required: ['prompt', 'leitura', 'completado', 'conflito']
};

const SISTEMA = `Você monta prompts de fotografia para um estúdio brasileiro de retratos premium.

Regras inegociáveis:
- O que o cliente escreveu SEMPRE vence. Se ele pediu vestido ciano, o prompt diz cyan dress. Nunca troque a cor, a peça ou o ambiente que ele nomeou.
- O que o cliente NÃO disse, você completa com a base da ocasião, a direção do arquétipo e a referência técnica abaixo.
- Restrições ("sem óculos", "sem barba") viram instruções negativas explícitas no prompt.
- O enquadramento sempre pede respiro em cima e nas laterais, porque a imagem 9:16 será cortada depois para 4:5 e 1:1.
- Fotografia realista: textura de pele natural, sem retoque de beleza, sem aparência de plástico.
- Recuse conteúdo sexual, violento, ou que envolva menores. Nesses casos devolva prompt vazio e explique no campo conflito.

REFERÊNCIA TÉCNICA (só para completar o que o cliente não especificou; nunca sobrepõe o pedido dele):

Câmera e lente por gatilho:
- Autoridade/poder: ângulo levemente baixo, lente 85mm f/2.8, Cooke Speed Panchro ou ARRI Signature Primes, Rembrandt light ou Chiaroscuro suave.
- Acolhimento/confiança: shoulder-level, 85mm f/2.8, Kodak Portra 400, luz natural de janela.
- Sofisticação/exclusividade: Hasselblad look, 100mm f/2.8, Fujifilm Pro 400H, highlights arejados.
- Energia/ação: 35-50mm f/4, luz dura de meio-dia ou golden hour, contraste mais alto.
- Mistério/noturno: Cinestill 800T, halation vermelho em fontes de luz, rim light.
- Honestidade/seriedade: Ilford HP5 ou Kodak Tri-X (P&B), contraste equilibrado, sem dramatização excessiva.

Abertura (f/stop): f/1.4 fundo bem desfocado e dramático · f/2.8 equilíbrio, padrão para retrato · f/4 fundo ainda discernível · f/8-f/16 tudo em foco, só para planos abertos/ambiente.

Escolha a combinação que mais combina com o gatilho de neurociência da ocasião e do arquétipo. Nunca descreva a câmera ou a película como texto visível na cena, elas só orientam luz, textura e profundidade de campo no prompt em inglês.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Use POST' });
  }

  const { texto, ocasiao, ocasiaoBase, arquetipo, arquetipoDir } = req.body || {};

  if (!texto || typeof texto !== 'string' || texto.trim().length < 10) {
    return res.status(400).json({ erro: 'Descreva a foto com um pouco mais de detalhe.' });
  }
  if (texto.length > 4000) {
    return res.status(400).json({ erro: 'Texto longo demais.' });
  }

  const entrada = [
    `OCASIÃO: ${ocasiao || 'não informada'}`,
    `BASE DA OCASIÃO (invisível ao cliente): ${ocasiaoBase || 'retrato profissional'}`,
    `PERFIL VISUAL: ${arquetipo || 'não informado'}`,
    `DIREÇÃO DO PERFIL: ${arquetipoDir || 'postura natural, luz equilibrada'}`,
    '',
    'O QUE O CLIENTE ESCREVEU:',
    texto.trim()
  ].join('\n');

  try {
    const chave = process.env.GEMINI_API_KEY;
    if (!chave) throw new Error('GEMINI_API_KEY não configurada');

    // O esquema é o que garante os quatro campos. Sem ele o modelo devolve
    // só prompt e conflito, e a tela de confirmação fica sem a leitura.
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SISTEMA}\n\n${entrada}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA
          }
        })
      }
    );

    if (!r.ok) throw new Error(`Gemini recusou (${r.status}): ${(await r.text()).slice(0, 300)}`);

    const resposta = await r.json();
    const candidato = resposta?.candidates?.[0];

    if (candidato?.finishReason === 'SAFETY' || candidato?.finishReason === 'PROHIBITED_CONTENT') {
      return res.status(400).json({ erro: 'Não consigo gerar esse tipo de imagem.' });
    }

    const textoResposta = candidato?.content?.parts?.find(p => p.text)?.text;
    if (!textoResposta) throw new Error('resposta sem conteúdo');

    const d = JSON.parse(textoResposta);

    if (!d.prompt) {
      return res.status(400).json({ erro: d.conflito || 'Não consigo gerar essa imagem.' });
    }

    return res.status(200).json({
      prompt: d.prompt,
      leitura: d.leitura,
      completado: d.completado,
      conflito: d.conflito || ''
    });
  } catch (e) {
    console.error('[prompt]', e.message || e);
    console.error('[prompt-stack]', e.stack);

    // Fallback: se Gemini falhar, monta um prompt básico
    const promptBasico = `${ocasiaoBase || 'Retrato profissional'}. Cliente pediu: ${texto.trim()}. Aplicar direção do perfil: ${arquetipoDir || 'postura natural, luz equilibrada'}. 9:16 aspect ratio, respiro nas bordas.`;

    return res.status(200).json({
      prompt: promptBasico,
      leitura: `Você pediu: <b>${texto.trim()}</b>. Vamos gerar nesse estilo.`,
      completado: 'Ocasião base, perfil visual e enquadramento preenchidos automaticamente.',
      conflito: ''
    });
  }
}
