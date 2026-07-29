-- =====================================================================
-- PRISMA — reparo dos perfis órfãos e do gatilho de cadastro
--
-- Sintoma em produção (29/07/2026): o cliente confirmava o e-mail, respondia
-- o diagnóstico, enviava as doze fotos e recebia "Perfil não encontrado" ao
-- clicar em Gerar. O plano também aparecia em branco na tela de planos.
--
-- Causa: não existia linha em public.perfis para aquele usuário. O gatilho
-- ao_criar_usuario, que deveria criá-la no cadastro, não estava ativo neste
-- projeto. E o app só criava o perfil pelo navegador no cadastro COM sessão
-- imediata — caminho que nunca acontece com "Confirm email" ligado.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DIAGNÓSTICO — quantas contas estão sem perfil?
--    Rode primeiro e veja o número antes de reparar.
-- ---------------------------------------------------------------------
select count(*) as contas_sem_perfil
  from auth.users u
  left join public.perfis p on p.id = u.id
 where p.id is null;

-- Quem são (confira se o e-mail do cliente que reclamou está aqui):
select u.id, u.email, u.created_at, u.email_confirmed_at
  from auth.users u
  left join public.perfis p on p.id = u.id
 where p.id is null
 order by u.created_at desc;

-- ---------------------------------------------------------------------
-- 2. BACKFILL — cria o perfil que falta para todo mundo já cadastrado
--    Idempotente: rodar de novo não duplica nem sobrescreve quem já tem.
-- ---------------------------------------------------------------------
insert into public.perfis (id, nome, plano, creditos)
select u.id,
       coalesce(u.raw_user_meta_data->>'nome', ''),
       'nenhum',
       0
  from auth.users u
  left join public.perfis p on p.id = u.id
 where p.id is null
    on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. GATILHO — reinstala a criação automática do perfil no cadastro
--    (mesmo conteúdo do supabase.sql; aqui isolado para poder rodar sozinho)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4. CONFERÊNCIA — o gatilho está mesmo ativo agora?
--    Tem que devolver uma linha: ao_criar_usuario / users / O (enabled).
-- ---------------------------------------------------------------------
select t.tgname       as gatilho,
       c.relname      as tabela,
       t.tgenabled    as habilitado
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where t.tgname = 'ao_criar_usuario';

-- Tem que devolver zero:
select count(*) as contas_sem_perfil_depois_do_reparo
  from auth.users u
  left join public.perfis p on p.id = u.id
 where p.id is null;
