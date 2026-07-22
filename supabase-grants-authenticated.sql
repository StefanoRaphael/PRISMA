-- PRISMA — devolve ao authenticated o acesso às tabelas que o app usa
--
-- O service_role (usado pelo servidor) já foi corrigido. Este é o papel que
-- o NAVEGADOR usa quando você está logado — a política de RLS de insert em
-- referencias está correta, então se o insert ainda falha, a explicação mais
-- provável é que authenticated perdeu o mesmo GRANT que o service_role tinha
-- perdido.
--
-- Cada GRANT aqui é limitado ao que a política de RLS da tabela já permite
-- (rode select * from pg_policies where schemaname='public' para conferir).
-- Rode este arquivo inteiro no SQL Editor do Supabase.

grant usage on schema public to authenticated;

-- perfis: ler e atualizar o próprio perfil (quiz grava o arquétipo aqui)
grant select, update on public.perfis to authenticated;

-- referencias: ler, enviar e remover as próprias fotos
grant select, insert, delete on public.referencias to authenticated;

-- geracoes e retratos: só leitura (quem escreve é o servidor)
grant select on public.geracoes to authenticated;
grant select on public.retratos to authenticated;
grant select on public.pagamentos to authenticated;

-- Conferência: deve listar as cinco tabelas.
select table_name, privilege_type
  from information_schema.role_table_grants
 where grantee = 'authenticated'
   and table_schema = 'public'
 order by table_name, privilege_type;
