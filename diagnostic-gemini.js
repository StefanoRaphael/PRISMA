/**
 * DIAGNÓSTICO — Testa a Gemini API e identifica problemas
 *
 * Rodá: node diagnostic-gemini.js
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MODELO = 'gemini-2.5-flash';

async function testarGemini() {
  console.log('🔍 Iniciando diagnóstico da Gemini API...\n');

  // 1. Verificar chave
  const chave = process.env.GEMINI_API_KEY;
  console.log(`✓ GEMINI_API_KEY configurada? ${chave ? '✓ SIM' : '✗ NÃO'}`);
  if (!chave) {
    console.log('  ⚠️  Sem chave. Endpoint vai falhar.');
    process.exit(1);
  }
  console.log(`  Comprimento: ${chave.length} caracteres`);

  // 2. Teste de conexão simples
  console.log('\n📡 Testando conexão com Gemini...');
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10s
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Oi, tudo bem?' }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'object', properties: { resposta: { type: 'string' } }, required: ['resposta'] } }
        })
      }
    );

    console.log(`  Status HTTP: ${r.status} ${r.statusText}`);

    if (r.status === 401) {
      console.log('  ✗ ERRO 401 — Chave inválida ou expirada');
      process.exit(1);
    }
    if (r.status === 429) {
      console.log('  ✗ ERRO 429 — Rate limit excedido');
      process.exit(1);
    }
    if (r.status === 403) {
      console.log('  ✗ ERRO 403 — Conta sem permissão (créditos zerados?)');
      const body = await r.text();
      console.log('  Resposta:', body.slice(0, 200));
      process.exit(1);
    }
    if (!r.ok) {
      console.log(`  ✗ ERRO ${r.status}`);
      const body = await r.text();
      console.log('  Resposta:', body.slice(0, 300));
      process.exit(1);
    }

    const data = await r.json();
    console.log('  ✓ Resposta recebida');
    console.log(`  Finish reason: ${data?.candidates?.[0]?.finishReason}`);

  } catch (e) {
    console.log(`  ✗ ERRO de conexão: ${e.message}`);
    process.exit(1);
  }

  // 3. Teste com prompt real (como em /api/prompt)
  console.log('\n🎯 Testando com prompt estruturado...');
  try {
    const texto = 'Vestido ciano, sorrindo, luz natural';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Você monta prompts de fotografia. Devolva: prompt (string), leitura (string), completado (string), conflito (string), variantes (array).\n\nOcasião: executivo\nCliente pediu: ${texto}`
            }]
          }],
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
        })
      }
    );

    if (!r.ok) {
      const body = await r.text();
      console.log(`  ✗ ERRO ${r.status}: ${body.slice(0, 300)}`);
      process.exit(1);
    }

    const data = await r.json();
    const candidato = data?.candidates?.[0];
    const textoResposta = candidato?.content?.parts?.find(p => p.text)?.text;

    if (!textoResposta) {
      console.log('  ✗ Resposta vazia');
      process.exit(1);
    }

    const d = JSON.parse(textoResposta);
    console.log('  ✓ Prompt estruturado recebido');
    console.log(`  prompt: ${d.prompt.slice(0, 100)}...`);
    console.log(`  variantes: ${d.variantes.length} itens`);

  } catch (e) {
    console.log(`  ✗ ERRO: ${e.message}`);
    process.exit(1);
  }

  console.log('\n✅ Diagnóstico OK — Gemini API está operacional');
}

testarGemini();
