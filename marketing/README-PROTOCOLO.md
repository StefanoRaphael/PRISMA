# PRISMA — Protocolo de Fotos de Referência

## O que está aqui

- **protocolo-fotos-prisma.html** — documento completo (3 páginas) com guia visual de qualidade para envio de fotos
- **send-protocolo-email.mjs** — script Node.js para enviar o protocolo via Resend para os 5 emails cadastrados

## Como usar

### 1. Visualizar ou imprimir o protocolo

Abra no navegador:
```
file:///Users/stefanoraphael/PRISMA/protocolo-fotos-prisma.html
```

Ou use `cmd+p` (Mac) / `ctrl+p` (Windows) para imprimir/salvar como PDF.

### 2. Enviar para um único email (teste)

```bash
RESEND_API_KEY=seu_token_aqui node send-protocolo-email.mjs --teste seu@email.com
```

Exemplo:
```bash
RESEND_API_KEY=re_1234567890 node send-protocolo-email.mjs --teste contato@casalimago.com.br
```

### 3. Enviar para os 5 emails cadastrados (em batch)

Primeiro, edite o arquivo `send-protocolo-email.mjs` e preencha a `LISTA_REAL` com os 5 emails:

```javascript
const LISTA_REAL = [
  'email1@exemplo.com',
  'email2@exemplo.com',
  'email3@exemplo.com',
  'email4@exemplo.com',
  'email5@exemplo.com',
];
```

Depois, rode:

```bash
RESEND_API_KEY=seu_token_aqui node send-protocolo-email.mjs --enviar
```

## Conteúdo do Protocolo

O documento inclui:

- **Introdução** — resumo de quantidade, fundo, luz, roupas, posição, expressões
- **Posicionamento Profissional** — camera ao nível dos olhos (não selfie)
- **Fundo** — branco ou cinza claro, neutro
- **Luz** — natural, perto de janela (crítico)
- **Roupas** — básicas, neutras, sem logos
- **Acessórios** — o que usar e evitar
- **Ângulos** — 6+ variações (frontal, 3/4, perfil, corpo inteiro)
- **Expressões** — sorrindo, sorriso leve, sério, pensativo
- **Espelhamento de Selfie** — instruções iOS/Android para virar foto antes de enviar
- **Resumo e Próximos Passos**

## Endpoint API

Se o protocolo estiver deployado em Vercel, existem 2 endpoints:

**GET /api/protocolo-pdf**
- Retorna o HTML do protocolo (pode ser impresso como PDF)
- Uso: `curl https://usarprisma.com.br/api/protocolo-pdf > protocolo.html`

**POST /api/protocolo-pdf?email=usuario@email.com**
- Envia o protocolo anexado via Resend
- Usa a chave `RESEND_API_KEY` do ambiente
- Retorna: `{ success: true, id: "email_id" }`

## Notas

1. **Resend API Key**: obtenha em https://resend.com (env var `RESEND_API_KEY`)
2. **Anexo**: o e-mail leva o protocolo como HTML anexado (não PDF, mas abre em qualquer navegador)
3. **Print-friendly**: o CSS inclui `@media print` para gerar PDF com boa qualidade
4. **Throttling**: script aguarda 600ms entre envios para não sobrecarregar a API

## Para gerar PDF de verdade

Se quiser enviar PDF real em vez de HTML, instale uma biblioteca:

```bash
npm install html-pdf-node
```

E descomente o código no `api/protocolo-pdf.js` (seção "generatePdfFromHtml").

No Vercel, use `@sparticuz/chromium` para evitar limitações de tamanho.

## Checklist antes de enviar

- [ ] Protocolo visual completo e revisado
- [ ] 5 emails cadastrados preenchidos em `LISTA_REAL`
- [ ] `RESEND_API_KEY` configurada (env var)
- [ ] Teste enviado com sucesso (`--teste`)
- [ ] Pronto para envio em batch (`--enviar`)
