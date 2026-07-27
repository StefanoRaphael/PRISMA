-- =====================================================================
-- PRISMA — Feature: Brand Colors Strategy
-- Adiciona suporte a cores de marca na geração
-- =====================================================================

-- Adicionar coluna na tabela geracoes para armazenar cores
alter table public.geracoes
add column if not exists cores_marca text[] default '{}',
add column if not exists usar_cores_marca boolean not null default false;

-- Criar índice pra facilitar buscas futuras
create index if not exists idx_geracoes_cores on public.geracoes(usar_cores_marca);

-- =====================================================================
-- Executar este script no SQL Editor do Supabase
-- =====================================================================
