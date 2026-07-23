-- =====================================================================
-- PRISMA — permite o cliente apagar os próprios retratos
-- Rode no SQL Editor do Supabase.
--
-- Faltava esta política: "retratos proprios: ler" já existia, mas sem uma
-- de "apagar" o botão de excluir na galeria não tinha efeito nenhum (RLS
-- bloqueia por padrão qualquer operação sem policy explícita).
-- =====================================================================
create policy "retratos proprios: apagar" on public.retratos
  for delete using (auth.uid() = user_id);
