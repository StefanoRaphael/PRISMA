-- PRISMA — reembolso de 2 créditos cobrados sem entrega
--
-- Guilherme gerou um lote de 4 retratos, só 2 saíram (2 falharam no motor de
-- geração), mas os 4 créditos foram debitados. Causa: api/generate.js debitava
-- o lote inteiro antes de gerar e nunca devolvia a diferença em falha parcial.
-- Corrigido no código (commit "Reembolsa crédito de imagem que falhou em
-- geração parcial") — daqui pra frente isso não acontece mais. Este script
-- só repõe o que já foi cobrado indevidamente antes da correção.

-- 1. Confirma a conta e o saldo atual antes de mexer
select id, nome, plano, creditos, validade
from perfis
where id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com');

-- 2. Devolve os 2 créditos (soma, não substitui — não apaga saldo de outra
--    origem que possa ter entrado nesse meio-tempo)
update perfis
set creditos = creditos + 2
where id = (select id from auth.users where email = 'guilhermeamarogw@gmail.com')
returning id, nome, plano, creditos;
