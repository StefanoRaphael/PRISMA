/**
 * PRISMA — GET /api/config
 *
 * Devolve a configuração pública do app a partir das variáveis de ambiente.
 *
 * Antes isso era um config.js estático no repositório. Ele foi para produção
 * com valores de exemplo e derrubou o cadastro em silêncio: o cliente Supabase
 * subia apontando para um domínio inexistente, então toda tentativa de criar
 * conta morria num erro genérico. Lendo do ambiente existe uma fonte só,
 * a mesma que as rotas de API já usam.
 *
 * Só entra aqui o que o navegador tem direito de ver: a URL do projeto e a
 * chave anon, que é pública por natureza (quem protege os dados é a RLS).
 * NUNCA exponha SUPABASE_SERVICE_ROLE_KEY, MAGNIFIC_API_KEY, ANTHROPIC_API_KEY
 * ou MP_ACCESS_TOKEN por aqui.
 */

import { supabaseUrl } from '../lib/auth.js';

export default function handler(req, res) {
  const cfg = {
    SUPABASE_URL: supabaseUrl(),
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
  };

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(`window.PRISMA_CONFIG=${JSON.stringify(cfg)};`);
}
