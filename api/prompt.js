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
    },
    variantes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exatamente 5 direções de câmera e enquadramento em INGLÊS, uma por retrato do lote, pensadas como um fotógrafo pensaria para ESTA ocasião e ESTE pedido específico, não uma fórmula genérica repetida em todo prompt. Decida o grau de dinamismo apropriado: um retrato executivo ou institucional pode pedir variações mais sóbrias, quase centradas, com deslocamentos sutis; um editorial de viagem ou ação pode pedir mais assimetria e ângulo. Cada item descreve altura de câmera, posição do sujeito no quadro (terço esquerdo, terço direito, centro, ambiente amplo) e, se fizer sentido pra ESTA cena, inclinação de horizonte. Nunca repita a mesma direção duas vezes na lista. Nunca force lateralização forte se o contexto pedir uma composição mais direta e equilibrada.'
    }
  },
  required: ['prompt', 'leitura', 'completado', 'conflito', 'variantes']
};

const SISTEMA = `Você monta prompts de fotografia para um estúdio brasileiro de retratos premium. O padrão é nível editorial de revista e still cinematográfico — o oposto do retrato genérico que qualquer IA de imagem produz por padrão.

Regras inegociáveis:
- O que o cliente escreveu SEMPRE vence. Se ele pediu vestido ciano, o prompt diz cyan dress. Nunca troque a cor, a peça ou o ambiente que ele nomeou.
- O que o cliente NÃO disse, você completa com a BASE DA OCASIÃO (ela já traz local, luz, lente e clima específicos e únicos daquela ocasião — respeite-a, não a substitua por fórmula genérica). A base de propósito NÃO fixa posição do sujeito no quadro: essa decisão é só do campo "variantes", descrito abaixo.
- Restrições ("sem óculos", "sem barba") viram instruções negativas explícitas no prompt.
- O enquadramento sempre pede respiro em cima e nas laterais, porque a imagem 9:16 será cortada depois para 4:5 e 1:1.
- Fotografia realista: textura de pele natural, sem retoque de beleza, sem aparência de plástico.
- Recuse conteúdo sexual, violento, ou que envolva menores. Nesses casos devolva prompt vazio e explique no campo conflito.

PROIBIDO CAIR NO GENÉRICO (a menos que o cliente peça explicitamente o contrário):
- Posição do sujeito no quadro (centro, terço esquerdo, terço direito, pequeno no ambiente) não vem da base nem de regra fixa nenhuma: é decidida no campo "variantes", uma vez por retrato, olhando o contexto real desta ocasião e deste pedido.
- NUNCA use câmera na altura dos olhos só por comodidade. Respeite o ângulo já definido na base da ocasião (baixo para autoridade, alto para intimidade, POV de plateia, através de elementos em primeiro plano).
- NUNCA aplique a fórmula universal "luz quente + preenchimento suave lateral" em toda ocasião. Cada base já tem seu próprio esquema de luz (dura e direcional, silhueta com rim light only, feixes de luz cortando neblina, gel colorido, etc.) — use exatamente esse, não o dilua para algo morno e seguro.
- Se o cliente não especificar pose, prefira gesto assimétrico e dinâmico (peso numa perna só, ombro girado, mão em movimento) a uma pose frontal estática e simétrica, a menos que a ocasião peça formalidade e presença direta.
- O fundo é elemento de produção, não pano de fundo genérico. Descreva profundidade de camadas (primeiro plano, sujeito, fundo em planos distintos) e textura de material visível (concreto, madeira, vidro, tecido, metal), no padrão de um estúdio que vende 20 anos de experiência internacional. Nunca aceite fundo raso, desfocado sem propósito ou liso demais.
- Flare, reflexo de lente ou partícula de luz (poeira, névoa, respingo) só entram quando o esquema de luz da própria base da ocasião já pede esse efeito (ex: contraluz forte, golden hour, neon). Não adicione por padrão em toda foto — quando forçado sem motivo de luz, denuncia composição artificial.

VARIANTES DO LOTE (campo "variantes"): cada retrato do mesmo pedido precisa de um enquadramento levemente diferente dos outros, mas a variação tem que nascer do julgamento de um fotógrafo lendo esta ocasião e este pedido, nunca de uma fórmula fixa aplicada sempre. Um executivo de terno numa sala de reunião pede variações contidas, quase centradas, com deslocamento sutil de posição entre um retrato e outro. Uma cena de ação ou viagem pede mais liberdade de ângulo e assimetria. Errar pra mais lateralização do que a cena pede é o mesmo erro que errar pra mais centralização: os dois entregam "genérico", um pelo excesso, outro pela falta.

Quando o pedido do cliente entra em conflito direto com a base (ex: cliente pede "olhando direto pra câmera, brincando com bolha de sabão" mas a base pede ângulo de ação), o pedido do cliente vence só naquilo que ele especificou — o resto (ângulo, luz, composição) continua vindo da base.

Nunca descreva a câmera ou a película como texto visível na cena — lente, película e abertura só orientam luz, textura e profundidade de campo no prompt em inglês.`;

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
      conflito: d.conflito || '',
      variantes: Array.isArray(d.variantes) ? d.variantes : []
    });
  } catch (e) {
    console.error('[prompt]', e.message || e);
    console.error('[prompt-stack]', e.stack);

    // Fallback: se Gemini falhar, monta um prompt básico.
    // Sem variantes raciocinadas aqui: lib/gemini.js cai na lista fixa própria
    // dele quando recebe array vazio, então a geração não trava por isso.
    const promptBasico = `${ocasiaoBase || 'Retrato profissional'}. Cliente pediu: ${texto.trim()}. Aplicar direção do perfil: ${arquetipoDir || 'postura natural, luz equilibrada'}. 9:16 aspect ratio, respiro nas bordas.`;

    return res.status(200).json({
      prompt: promptBasico,
      leitura: `Você pediu: <b>${texto.trim()}</b>. Vamos gerar nesse estilo.`,
      completado: 'Ocasião base, perfil visual e enquadramento preenchidos automaticamente.',
      conflito: '',
      variantes: []
    });
  }
}
