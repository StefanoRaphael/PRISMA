-- PRISMA — devolve ao service_role o acesso às tabelas
--
-- Sintoma: as rotas de servidor falham com
--   42501  permission denied for table perfis
-- e o app mostra "algo deu errado" na geração, enquanto as telas que leem
-- pela chave anon continuam funcionando.
--
-- Causa: o service_role perdeu os GRANTs no schema public. Ele é a chave que
-- só o servidor usa (nunca chega ao navegador) e é quem escreve crédito,
-- geração e retratos. Sem GRANT, nem a RLS chega a ser avaliada: o Postgres
-- barra antes.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.

grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

grant usage, select
  on all sequences in schema public
  to service_role;

-- Tabelas criadas daqui para frente já nascem acessíveis ao servidor.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;

-- Conferência: deve listar perfis, referencias, geracoes, retratos, pagamentos.
select table_name, privilege_type
  from information_schema.role_table_grants
 where grantee = 'service_role'
   and table_schema = 'public'
 order by table_name, privilege_type;
