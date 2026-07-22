/**
 * PRISMA — camada de geração de imagem (Magnific)
 *
 * Padrão da API, confirmado em docs.magnific.com:
 *   POST https://api.magnific.com/v1/ai/{modelo}   -> devolve { data: { task_id } }
 *   GET  https://api.magnific.com/v1/ai/{modelo}/{task_id} -> status + urls
 *   Autenticação pelo cabeçalho x-magnific-api-key
 *
 * ATENÇÃO, ponto em aberto:
 * O sistema de Character Reference (biblioteca de personagem) que validamos
 * nos testes é exposto pelas ferramentas MCP, mas NÃO aparece na referência
 * REST pública. Enquanto isso não for confirmado com o suporte da Magnific,
 * este wrapper usa imagens de referência direto na chamada, que é o caminho
 * documentado. Ver README, seção "Pendências".
 */

const BASE = 'https://api.magnific.com/v1/ai';

// Modelo usado na geração. Trocar aqui muda o app inteiro.
// "auto" escolhe o melhor modelo automaticamente (Nano Banana, Seedance ou outro)
// Validado com Stefano, Igor e Cláudia: ~90% fidelidade facial
const MODELO = 'auto';

// Reforço de fidelidade facial validado nos testes com Stefano, Igor e Cláudia.
const REFORCO_FIDELIDADE = [
  'CRITICAL INSTRUCTION: Preserve the subject\'s facial structure and features',
  'EXACTLY as they appear in the reference photos. Do NOT modify, alter, enhance,',
  'or change any facial characteristics whatsoever — no changes to face shape,',
  'nose, lips, eyes, cheekbones, jawline, skin texture, or any other facial',
  'feature. KEEP FACE IDENTICAL. Only change: clothing, setting, lighting, pose,',
  'and background. The face must remain completely unchanged from the references.'
].join(' ');

function cabecalhos() {
  const chave = process.env.MAGNIFIC_API_KEY;
  if (!chave) throw new Error('MAGNIFIC_API_KEY não configurada');
  return {
    'Content-Type': 'application/json',
    'x-magnific-api-key': chave
  };
}

/**
 * Dispara a geração de 4 retratos em 9:16.
 * @param {string} prompt        master prompt já montado
 * @param {string[]} referencias URLs ou data URLs das fotos do cliente
 * @returns {Promise<string>}    task_id
 */
export async function gerarRetratos(prompt, referencias) {
  const corpo = {
    prompt: `${REFORCO_FIDELIDADE}\n\n${prompt}`,
    // 9:16 é o master: dele saem os cortes 4:5 e 1:1 sem gastar crédito.
    aspect_ratio: '9:16',
    num_images: 4,
    reference_images: referencias.slice(0, 4)
  };

  const r = await fetch(`${BASE}/${MODELO}`, {
    method: 'POST',
    headers: cabecalhos(),
    body: JSON.stringify(corpo)
  });

  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new Error(`Magnific recusou a geração (${r.status}): ${texto.slice(0, 300)}`);
  }

  const d = await r.json();
  const id = d?.data?.task_id || d?.task_id;
  if (!id) throw new Error('Magnific não devolveu task_id');
  return id;
}

/**
 * Consulta o andamento de uma geração.
 * @returns {Promise<{status:'processando'|'pronto'|'erro', urls:string[], erro?:string}>}
 */
export async function consultarGeracao(taskId) {
  const r = await fetch(`${BASE}/${MODELO}/${encodeURIComponent(taskId)}`, {
    headers: cabecalhos()
  });

  if (!r.ok) {
    return { status: 'erro', urls: [], erro: `Consulta falhou (${r.status})` };
  }

  const d = await r.json();
  const bruto = (d?.data?.status || d?.status || '').toUpperCase();
  const urls = d?.data?.generated || d?.generated || d?.data?.images || [];

  if (bruto === 'COMPLETED') {
    return { status: 'pronto', urls: normalizar(urls) };
  }
  if (bruto === 'FAILED' || bruto === 'ERROR') {
    return { status: 'erro', urls: [], erro: d?.data?.error || 'Geração falhou no motor' };
  }
  return { status: 'processando', urls: normalizar(urls) };
}

function normalizar(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(i => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
}
