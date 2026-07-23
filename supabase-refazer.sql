-- =====================================================================
-- PRISMA — coluna de controle da refação grátis
-- Rode no SQL Editor do Supabase.
--
-- Cada retrato tem direito a UMA refação sem gastar crédito. Depois de
-- usada, refeita_gratis vira true e qualquer nova tentativa naquele
-- retrato cobra 1 crédito normal (ver api/regenerate.js).
-- =====================================================================
alter table public.retratos
  add column if not exists refeita_gratis boolean not null default false;
