-- =====================================================================
-- PRISMA — atendimento ao cliente que travou em 29/07/2026
-- guilhermeamarogw@gmail.com
--
-- IMPORTANTE: rode ANTES o supabase-reparo-perfis.sql. Ele já cria o perfil
-- que faltava para este e todos os outros cadastros órfãos.
--
-- NÃO é preciso zerar o cadastro dele. As 8 a 12 fotos que ele enviou estão
-- salvas em public.referencias, que é outra tabela e nunca foi afetada pelo
-- problema. Apagar tudo faria ele fotografar e enviar de novo à toa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Onde ele está agora
-- ---------------------------------------------------------------------
select u.email,
       u.email_confirmed_at,
       p.plano,
       p.creditos,
       p.arquetipo,
       (select count(*) from public.referencias r where r.user_id = u.id) as fotos_enviadas,
       (select count(*) from public.retratos   t where t.user_id = u.id) as retratos_gerados
  from auth.users u
  left join public.perfis p on p.id = u.id
 where u.email = 'guilhermeamarogw@gmail.com';

-- ---------------------------------------------------------------------
-- 2. RECOMENDADO — libera acesso de cortesia pelo transtorno
--    5 retratos, 12 ocasiões abertas, 60 dias. Mesmo pacote dos convidados.
--    Ele entra e continua exatamente de onde parou, com as fotos já lá.
-- ---------------------------------------------------------------------
update public.perfis
   set plano    = 'tester',
       creditos = 5,
       validade = now() + interval '60 days',
       metodo   = 'Cortesia PRISMA'
 where id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com');

-- ---------------------------------------------------------------------
-- 3. ALTERNATIVA — se ele preferir refazer o cadastro do zero
--    Apaga fotos, gerações e retratos, mantém a conta e o login.
--    Só rode se ele pedir: isto descarta as fotos que ele já enviou.
-- ---------------------------------------------------------------------
-- delete from public.referencias
--  where user_id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com');
--
-- delete from public.retratos
--  where user_id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com');
--
-- delete from public.geracoes
--  where user_id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com');
--
-- update public.perfis
--    set arquetipo = null
--  where id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com');

-- ---------------------------------------------------------------------
-- 4. Conferência
-- ---------------------------------------------------------------------
select u.email, p.plano, p.creditos, p.validade,
       (select count(*) from public.referencias r where r.user_id = u.id) as fotos_enviadas
  from auth.users u
  join public.perfis p on p.id = u.id
 where u.email = 'guilhermeamarogw@gmail.com';
