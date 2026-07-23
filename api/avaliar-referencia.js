/**
 * PRISMA — POST /api/avaliar-referencia
 *
 * Avalia UMA foto de referência recém-enviada (tremida, mal iluminada,
 * rosto não visível) e devolve um aviso, sem bloquear o envio. A decisão
 * final continua do cliente — isso só evita que ele descubra o problema
 * só depois de gastar crédito numa geração com fidelidade ruim.
 *
 * Falha aberta de propósito: se a chave sumir, o Gemini cair ou a
 * resposta vier fora do formato esperado, devolve ok:true. Um bug nosso
 * aqui nunca deve travar o cadastro de um cliente.
 */

import { usuarioDaRequisicao } from '../lib/auth.js';

const MODELO = 'gemini-2.5-flash';

const INSTRUCAO = [
  'Você avalia fotos de referência enviadas para gerar retratos com IA que',
  'exigem MÁXIMA fidelidade facial. Responda SOMENTE em JSON, sem texto',
  'fora do JSON, no formato exato: {"ok": true|false, "problema": string|null}.',
  'Valores possíveis para "problema": "tremida", "escura", "rosto_oculto", "baixa_resolucao".',
  'Marque ok:false SÓ SE isso realmente comprometer o reconhecimento facial:',
  'a foto está visivelmente desfocada/tremida, muito escura ou em forte contraluz,',
  'o rosto está de costas, cortado, ou coberto (óculos escuros, boné sobre os olhos),',
  'ou a resolução é baixa a ponto de perder detalhes do rosto.',
  'Pequenas imperfeições não contam. Na dúvida, responda ok:true.'
].join(' ');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const { url } = req.body || {};
  const m = /^data:([^;]+);base64,(.+)$/.exec(url || '');
  if (!m) return res.status(400).json({ erro: 'Foto inválida.' });

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return res.status(200).json({ ok: true });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: INSTRUCAO },
              { inline_data: { mime_type: m[1], data: m[2] } }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!r.ok) return res.status(200).json({ ok: true });

    const d = await r.json();
    const texto = d?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (!texto) return res.status(200).json({ ok: true });

    const veredito = JSON.parse(texto);
    const PROBLEMAS = ['tremida', 'escura', 'rosto_oculto', 'baixa_resolucao'];
    const problema = PROBLEMAS.includes(veredito.problema) ? veredito.problema : null;

    return res.status(200).json({ ok: veredito.ok !== false, problema });
  } catch (e) {
    console.error('[avaliar-referencia]', e);
    return res.status(200).json({ ok: true });
  }
}
