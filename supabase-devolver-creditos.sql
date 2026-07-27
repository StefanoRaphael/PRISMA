-- PRISMA — devolução atômica de créditos após falha de geração
--
-- Sintoma possível (raro, mas real): se uma geração falha e o reembolso é
-- feito sobrescrevendo o crédito com o valor de antes do débito, qualquer
-- mudança concorrente no meio do caminho (ex: o webhook do Mercado Pago
-- aprovando uma renovação enquanto a geração ainda estava rodando) é
-- apagada. O cliente paga a renovação, mas perde os créditos porque a
-- geração falhada "devolveu" o saldo antigo por cima do novo.
--
-- Correção: devolver crédito é sempre SOMA atômica no banco, nunca um
-- valor absoluto calculado no servidor Node.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.

create or replace function devolver_creditos(uid uuid, quantidade int)
returns int
language sql
security definer
set search_path = public
as $$
  update perfis
  set creditos = creditos + quantidade
  where id = uid
  returning creditos;
$$;

grant execute on function devolver_creditos(uuid, int) to service_role;
