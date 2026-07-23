-- =====================================================================
-- PRISMA — esquema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
--
-- IMPORTANTE: a RLS aqui é ESTRITA por usuário, diferente do ATLAS STUDIO.
-- Lá era admin único. Aqui são clientes pagantes com fotos de rosto
-- guardadas, e vazamento entre contas seria grave.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFIS
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text,
  arquetipo     text,
  plano         text        not null default 'nenhum',   -- nenhum | mensal | anual | pro
  creditos      int         not null default 0,          -- 1 crédito = 1 retrato
  validade      timestamptz,                             -- fim do acesso (planos anuais)
  renova_dia    int,                                     -- dia do mês (plano mensal)
  metodo        text,                                    -- "Pix · anual", "Cartão · mensal"
  mp_customer   text,                                    -- id do cliente no Mercado Pago
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. REFERÊNCIAS (as 8 a 12 fotos que o cliente envia)
-- ---------------------------------------------------------------------
create table if not exists public.referencias (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  url       text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_referencias_user on public.referencias(user_id);

-- ---------------------------------------------------------------------
-- 3. GERAÇÕES (cada clique em "Gerar" = 1 linha, 4 retratos)
-- ---------------------------------------------------------------------
create table if not exists public.geracoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ocasiao     text not null,
  direcao     text,                                      -- o que o cliente escreveu
  prompt      text,                                      -- master prompt montado
  status      text not null default 'fila',              -- fila | processando | pronto | erro
  externo_id  text,                                      -- id no motor de geração
  urls        text[] not null default '{}',
  erro        text,
  criado_em   timestamptz not null default now(),
  concluido_em timestamptz,
  aceitou_qualidade_baixa boolean not null default false  -- true se o cliente seguiu apesar do aviso de fidelidade
);

create index if not exists idx_geracoes_user on public.geracoes(user_id, criado_em desc);

-- ---------------------------------------------------------------------
-- 4. RETRATOS (cada imagem pronta)
-- ---------------------------------------------------------------------
create table if not exists public.retratos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  geracao_id uuid references public.geracoes(id) on delete cascade,
  ocasiao    text not null,
  url        text not null,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_retratos_user on public.retratos(user_id, criado_em desc);

-- ---------------------------------------------------------------------
-- 5. PAGAMENTOS
-- ---------------------------------------------------------------------
create table if not exists public.pagamentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plano       text not null,
  valor       numeric(10,2) not null,
  status      text not null default 'pendente',          -- pendente | aprovado | recusado
  mp_id       text,                                      -- id do pagamento no Mercado Pago
  mp_pref     text,                                      -- id da preferência
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_pagamentos_user on public.pagamentos(user_id);
create unique index if not exists idx_pagamentos_mp on public.pagamentos(mp_id) where mp_id is not null;

-- =====================================================================
-- ROW LEVEL SECURITY
-- Cada cliente enxerga e altera SOMENTE o que é dele.
-- =====================================================================
alter table public.perfis      enable row level security;
alter table public.referencias enable row level security;
alter table public.geracoes    enable row level security;
alter table public.retratos    enable row level security;
alter table public.pagamentos  enable row level security;

-- PERFIS
create policy "perfil proprio: ler"     on public.perfis for select using (auth.uid() = id);
create policy "perfil proprio: criar"   on public.perfis for insert with check (auth.uid() = id);
create policy "perfil proprio: alterar" on public.perfis for update using (auth.uid() = id) with check (auth.uid() = id);

-- REFERÊNCIAS
create policy "referencias proprias: ler"    on public.referencias for select using (auth.uid() = user_id);
create policy "referencias proprias: criar"  on public.referencias for insert with check (auth.uid() = user_id);
create policy "referencias proprias: apagar" on public.referencias for delete using (auth.uid() = user_id);

-- GERAÇÕES (o cliente lê; quem escreve é o servidor, com a service role)
create policy "geracoes proprias: ler" on public.geracoes for select using (auth.uid() = user_id);

-- RETRATOS (idem)
create policy "retratos proprios: ler" on public.retratos for select using (auth.uid() = user_id);

-- PAGAMENTOS (idem)
create policy "pagamentos proprios: ler" on public.pagamentos for select using (auth.uid() = user_id);

-- =====================================================================
-- GATILHO: cria o perfil automaticamente quando alguém se cadastra
-- =====================================================================
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- =====================================================================
-- GATILHO: mantém atualizado_em em dia
-- =====================================================================
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists perfis_atualizado on public.perfis;
create trigger perfis_atualizado before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists pagamentos_atualizado on public.pagamentos;
create trigger pagamentos_atualizado before update on public.pagamentos
  for each row execute function public.tocar_atualizado_em();
