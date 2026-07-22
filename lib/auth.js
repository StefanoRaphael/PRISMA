/**
 * PRISMA — autenticação do lado do servidor
 *
 * As rotas de API confiam APENAS no token do Supabase enviado pelo cliente.
 * Nunca aceite user_id vindo do corpo da requisição: qualquer pessoa poderia
 * gerar retratos e gastar crédito na conta de outra.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * URL do projeto, normalizada.
 *
 * A variável de ambiente foi salva uma vez como o endereço do endpoint REST
 * (".../rest/v1/") em vez da URL do projeto. O cliente monta /rest/v1 e
 * /auth/v1 sozinho, então qualquer caminho depois do domínio faz TODA chamada
 * cair em 404, tanto de login quanto das rotas de servidor. Normalizar aqui
 * deixa o app imune a esse erro de digitação.
 */
export function supabaseUrl() {
  return (process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage|realtime)\/v1$/, '');
}

/** Cliente com service role. Ignora RLS. Use só no servidor. */
export function admin() {
  return createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

/**
 * Extrai e valida o usuário a partir do cabeçalho Authorization.
 * @returns {Promise<{id:string, email:string}|null>}
 */
export async function usuarioDaRequisicao(req) {
  const cabecalho = req.headers?.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  if (!token) return null;

  const sb = createClient(
    supabaseUrl(),
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email };
}
