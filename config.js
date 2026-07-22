/**
 * PRISMA — configuração pública do app (roda no navegador)
 *
 * Só entram aqui chaves que o público pode ver.
 * A chave anon do Supabase é pública por natureza: quem protege os dados
 * é a RLS do banco, não o segredo da chave.
 *
 * NUNCA coloque aqui: SUPABASE_SERVICE_ROLE_KEY, MAGNIFIC_API_KEY,
 * ANTHROPIC_API_KEY ou MP_ACCESS_TOKEN. Essas vivem só nas variáveis
 * de ambiente da Vercel.
 */

window.PRISMA_CONFIG = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'COLE-AQUI-A-CHAVE-ANON'
};
