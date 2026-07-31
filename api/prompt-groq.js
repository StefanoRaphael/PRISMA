/**
 * PRISMA — Fallback Groq para /api/prompt
 *
 * Usa o MESMO sistema de prompt que Gemini, mas com Groq como motor.
 * Chamado automaticamente se Gemini falhar.
 */

const SISTEMA = `Você monta prompts de fotografia para um estúdio brasileiro de retratos premium. O padrão é nível editorial de revista e still cinematográfico — o oposto do retrato genérico que qualquer IA de imagem produz por padrão.

Regras inegociáveis:
- O que o cliente escreveu SEMPRE vence. Se ele pediu vestido ciano, o prompt diz cyan dress. Nunca troque a cor, a peça ou o ambiente que ele nomeou.
- O que o cliente NÃO disse, você completa com a BASE DA OCASIÃO (ela já traz local, luz, lente e clima específicos e únicos daquela ocasião — respeite-a, não a substitua por fórmula genérica). A base de propósito NÃO fixa posição do sujeito no quadro: essa decisão é só do campo "variantes", descrito abaixo.
- Restrições ("sem óculos", "sem barba") viram instruções negativas explícitas no prompt.
- O enquadramento sempre pede respiro em cima e nas laterais, porque a imagem 9:16 será cortada depois para 4:5 e 1:1.
- Fotografia realista: textura de pele natural, sem retoque de beleza, sem aparência de plástico.
- Recuse conteúdo sexual, violento, ou que envolva menores. Nesses casos devolva prompt vazio e explique no campo conflito.

PROIBIDO CAIR NO GENÉRICO:
- Posição do sujeito no quadro não vem da base nem de regra fixa nenhuma: é decidida no campo "variantes", uma vez por retrato.
- NUNCA escreva no prompt em inglês, por conta própria, termos de deslocamento lateral como "off-center", "generous negative space", "left third of frame" ou "right third of frame". Composição lateral entra pelo campo "variantes", que é o único lugar que enxerga o lote inteiro e sabe dosar.
- NUNCA use câmera na altura dos olhos só por comodidade. Respeite o ângulo já definido na base da ocasião.
- NUNCA aplique a fórmula universal "luz quente + preenchimento suave lateral" em toda ocasião.
- Se o cliente não especificar pose, prefira gesto assimétrico e dinâmico a uma pose frontal estática e simétrica.
- O fundo é elemento de produção, não pano de fundo genérico.`;

export async function gerarPromptComGroq(texto, ocasiao, ocasiaoBase, arquetipo, arquetipoDir) {
  const chave = process.env.GROQ_API_KEY;
  if (!chave) throw new Error('GROQ_API_KEY não configurada');

  const entrada = [
    `OCASIÃO: ${ocasiao || 'não informada'}`,
    `BASE DA OCASIÃO (invisível ao cliente): ${ocasiaoBase || 'retrato profissional'}`,
    `PERFIL VISUAL: ${arquetipo || 'não informado'}`,
    `DIREÇÃO DO PERFIL: ${arquetipoDir || 'postura natural, luz equilibrada'}`,
    '',
    'O QUE O CLIENTE ESCREVEU:',
    texto.trim()
  ].join('\n');

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SISTEMA}\n\n${entrada}` }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          leitura: { type: 'string' },
          completado: { type: 'string' },
          conflito: { type: 'string' },
          variantes: { type: 'array', items: { type: 'string' } }
        },
        required: ['prompt', 'leitura', 'completado', 'conflito', 'variantes']
      }
    }
  };

  // Groq usa OpenAI-compatible API, mas com JSON schema diferente
  // Simplificar: pedir JSON direto na mensagem de sistema
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chave}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: `${SISTEMA}\n\nResponda APENAS com JSON válido, sem markdown. Estrutura:\n{\n  "prompt": "...",\n  "leitura": "...",\n  "completado": "...",\n  "conflito": "",\n  "variantes": ["...", "...", "...", "...", "..."]\n}`
        },
        {
          role: 'user',
          content: entrada
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Groq ${r.status}: ${body.slice(0, 200)}`);
  }

  const resposta = await r.json();
  const textoResposta = resposta?.choices?.[0]?.message?.content;

  if (!textoResposta) throw new Error('Resposta Groq sem conteúdo');

  const d = JSON.parse(textoResposta);

  if (!d.prompt) {
    throw new Error(d.conflito || 'Groq não conseguiu gerar prompt');
  }

  return {
    prompt: d.prompt,
    leitura: d.leitura || `Você pediu: <b>${texto.trim()}</b>`,
    completado: d.completado || 'Ocasião base e perfil visual preenchidos automaticamente.',
    conflito: d.conflito || '',
    variantes: Array.isArray(d.variantes) ? d.variantes : []
  };
}
