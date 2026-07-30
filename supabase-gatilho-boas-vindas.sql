-- =====================================================================
-- PRISMA — gatilho do e-mail de boas-vindas + protocolo (30/07/2026)
--
-- NÃO É ESTE ARQUIVO QUE VOCÊ COLA. Este repositório é público, então aqui
-- o segredo fica como COLE_AQUI_O_SEGREDO. O arquivo pronto, com o segredo
-- real já preenchido, é o supabase-gatilho-boas-vindas.LOCAL.sql, que fica
-- só na sua máquina (está no .gitignore). Abra esse e cole no SQL Editor.
--
-- COLE O ARQUIVO .LOCAL.sql INTEIRO no SQL Editor do Supabase e clique Run.
-- Roda uma vez só. Depois disso, todo cadastro novo recebe o e-mail de
-- boas-vindas com o protocolo em PDF anexado, sem nenhuma ação manual.
--
-- Por que não é um Database Webhook pela tela: a UI de Webhooks depende do
-- schema interno supabase_functions, que não existe neste projeto (erro
-- 3F000 ao tentar criar pela tela). Este gatilho chama o pg_net direto, que
-- é a mesma extensão que a feature de Webhooks usaria por baixo.
-- =====================================================================

-- 1. Limpeza de tentativas anteriores que não funcionaram -------------
drop trigger if exists trigger_send_welcome_email on auth.users;
drop function if exists public.send_welcome_email();
drop table if exists public.secrets;

-- 2. Garante que o perfil é criado no cadastro ------------------------
-- Sem linha em public.perfis não existe INSERT pra disparar o e-mail.
-- Este gatilho já deveria existir, mas sumiu do banco de produção uma vez
-- (incidente de 29/07), então é reinstalado aqui por segurança.
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

-- 3. O gatilho do e-mail ----------------------------------------------
-- Duas armadilhas resolvidas aqui, não desfazer:
--
--   a) http_post SEM qualificar o schema. O pg_net deste projeto está em
--      "extensions", então pg_net.http_post dá 3F000 e
--      extensions.pg_net.http_post dá 0A000. Com extensions e net no
--      search_path, a chamada sem qualificação resolve nos dois casos
--      (schema inexistente no search_path é ignorado em silêncio).
--
--   b) URL com www. O apex prismaretrato.com.br devolve 308 pro www e o
--      pg_net NÃO segue redirect: o POST morre no 308 e o e-mail nunca
--      sai, sem erro nenhum aparecer no banco.
create or replace function public.notificar_boas_vindas()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  perform http_post(
    url := 'https://www.prismaretrato.com.br/api/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-prisma-webhook-secret', 'COLE_AQUI_O_SEGREDO'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'perfis',
      'schema', 'public',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

drop trigger if exists ao_criar_perfil_notificar on public.perfis;
create trigger ao_criar_perfil_notificar
  after insert on public.perfis
  for each row execute function public.notificar_boas_vindas();

-- 4. Conferência -------------------------------------------------------
-- Deve devolver duas linhas: ao_criar_usuario e ao_criar_perfil_notificar.
select tgname as gatilho, tgrelid::regclass as tabela
from pg_trigger
where tgname in ('ao_criar_usuario', 'ao_criar_perfil_notificar');
