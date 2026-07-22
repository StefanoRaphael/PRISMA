# PRISMA

**Você tem mais de um lado. Mostre todos.**

Retratos profissionais em todas as ocasiões da vida do cliente, com o rosto dele de verdade.

---

## Arquivos

```
PRISMA/
├─ index.html        o app inteiro: todas as telas, navegação, estilo
├─ config.js         chaves públicas (Supabase URL e anon key)
├─ supabase.sql      esquema do banco, RLS e gatilhos
├─ package.json      dependências
├─ vercel.json       tempo limite das funções e cabeçalhos de segurança
├─ .env.example      modelo das variáveis de ambiente
├─ lib/
│  ├─ auth.js        valida o token do Supabase no servidor
│  └─ magnific.js    camada de geração de imagem
└─ api/
   ├─ prompt.js      texto livre do cliente vira master prompt
   ├─ generate.js    debita crédito e dispara a geração
   ├─ status.js      acompanha e grava os retratos prontos
   ├─ checkout.js    cria a preferência no Mercado Pago
   └─ webhook.js     confirma o pagamento e libera os créditos
```

---

## O que falta você fazer

Na ordem. Cada passo leva poucos minutos.

### 1. Supabase

1. Crie um projeto novo em supabase.com. Use a conta `stefanoclicks@gmail.com`, a mesma do VESTE, para não estourar o limite da conta pessoal.
2. Abra o SQL Editor, cole o conteúdo de `supabase.sql` inteiro e rode.
3. Em Settings > API, copie três valores:
   - Project URL
   - `anon` public key
   - `service_role` key
4. Cole a URL e a chave anon dentro de `config.js`.
5. Em Authentication > Providers, deixe Email ligado. Se quiser que o cliente entre sem confirmar e-mail, desligue "Confirm email".

### 2. Vercel

1. Suba a pasta como projeto novo.
2. Em Settings > Environment Variables, cadastre tudo que está em `.env.example`.
3. Aponte o domínio `usarprisma.com.br` (livre, verificado em 21/07/2026).

Atenção à armadilha que já te pegou antes: confira que o projeto na Vercel é o do PRISMA, não o projeto chamado "output".

### 3. Mercado Pago

1. Pegue o Access Token de produção no painel de desenvolvedor.
2. Cadastre a URL de notificação: `https://usarprisma.com.br/api/webhook`.
3. Teste primeiro com `MP_SANDBOX=1`. Depois apague essa variável.

### 4. Marca

Deposite PRISMA no INPI nas classes 9, 41 e 42. A GM tem Prisma registrado na classe 12 (veículos), que não colide com as suas. O carro saiu de linha em 2020.

---

## Pendências técnicas

**Character Reference do Magnific.** Os testes que validaram os 90% de fidelidade usaram o sistema de biblioteca de personagem, que hoje aparece nas ferramentas MCP mas não na referência REST pública (`docs.magnific.com`). O `lib/magnific.js` está escrito com o caminho documentado: imagens de referência direto na chamada, modelo `flux-2-klein`, que aceita até 4 referências.

Duas saídas, e as duas cabem sem mexer no resto do app:

1. Perguntar ao suporte da Magnific qual é o endpoint REST da biblioteca de personagem e trocar só o `lib/magnific.js`.
2. Rodar um teste comparando os dois caminhos com as fotos da Cláudia e ver se a fidelidade se mantém sem a biblioteca.

Todo o resto do sistema conversa com esse arquivo por duas funções (`gerarRetratos` e `consultarGeracao`), então a troca é cirúrgica.

**Plano mensal.** Os 20 retratos por mês e os R$ 149 estão como referência em `api/checkout.js`. O número real precisa fechar com a sua margem antes de ir ao ar.

**Modelo do Claude.** O `api/prompt.js` usa `claude-opus-4-8`. É a escolha de maior qualidade na hora de interpretar o que a cliente escreveu, e é a etapa onde um erro custa crédito de imagem. Se o volume crescer e o custo pesar, dá para baixar para `claude-sonnet-5` trocando uma linha.

---

## Decisões que já estão tomadas no código

**RLS estrita por usuário.** Diferente do ATLAS STUDIO, onde a RLS ficou permissiva porque era admin único. Aqui são clientes pagantes com fotos de rosto guardadas, e vazamento entre contas seria grave. Cada política em `supabase.sql` compara `auth.uid()` com o dono da linha.

**Preços no servidor.** A tabela de planos vive em `api/checkout.js` e o webhook confere o valor recebido antes de liberar crédito. Se os preços estivessem no navegador, qualquer pessoa assinaria o Pro por um real.

**Nada de user_id vindo do cliente.** Toda rota extrai o usuário do token do Supabase. Aceitar o id pelo corpo da requisição deixaria qualquer pessoa gastar crédito na conta de outra.

**Crédito volta quando a falha é nossa.** O débito acontece antes de chamar o motor. Se o motor recusar ou falhar no meio, `generate.js` e `status.js` devolvem os 4 créditos.

**Master 9:16.** A geração sai sempre no formato mais alto. Feed (4:5) e perfil (1:1) saem por corte no próprio navegador, sem consumir crédito. Uma geração, três entregas.

**Marca nunca diz IA.** Mesma regra do VESTE. O cliente compra o resultado, não o motor.

---

## Espectro da marca

Cinco paradas fixas, sempre nesta ordem. Nunca acrescente amarelo, verde-limão ou azul-royal: é o que separa prisma de arco-íris.

| Cor | Código | Uso |
|-----|--------|-----|
| Âmbar | `#FF9160` | primeira parada |
| Magenta | `#FF5FA2` | |
| Violeta | `#A96BFF` | |
| Ciano | `#4FC9F5` | |
| Aurora | `#6FE3C4` | validação |
| Abissal | `#050D18` | fundo |

O espectro entra em bordas, divisores, luz de fundo e movimento. **Nunca sobre o rosto.** A promessa é fidelidade, e a interface não abre exceção contra o próprio produto.
