-- PRISMA — diagnóstico do insert de referências
--
-- As 12 fotos aparecem na tela mas "0 foram salvas". Isso é o navegador
-- (papel authenticated) tentando inserir em public.referencias e falhando.
-- O GRANT que já rodamos foi só para o service_role (usado pelo servidor);
-- este aqui confere se authenticated também tem os privilégios que precisa.
--
-- Rode as duas consultas e me mande o resultado.

-- 1) o authenticated tem INSERT e SELECT em referencias?
select grantee, table_name, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name = 'referencias'
   and grantee in ('authenticated', 'anon')
 order by grantee, privilege_type;

-- 2) a política de RLS de insert existe e está correta?
select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename = 'referencias';
