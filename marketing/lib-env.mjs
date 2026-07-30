/**
 * Leitura da chave de API para os scripts de marketing/.
 *
 * Prioridade: variável de ambiente primeiro (útil para sobrescrever numa
 * chamada pontual), depois .env.local na raiz do projeto.
 *
 * Ler do arquivo é o que permite o disparo agendado pelo launchd funcionar
 * sem a chave escrita no plist, e evita ter que colar a chave na linha de
 * comando toda vez.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Lê uma variável do .env.local sem depender de pacote externo. */
export function doEnvLocal(nome) {
  const arquivo = path.join(RAIZ, '.env.local');
  if (!existsSync(arquivo)) return null;
  for (const linha of readFileSync(arquivo, 'utf-8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const i = limpa.indexOf('=');
    if (i > 0 && limpa.slice(0, i).trim() === nome) {
      return limpa.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

/**
 * Devolve a chave do Resend ou encerra com instrução de como resolver.
 * Sai em vez de lançar porque todo chamador é script de linha de comando.
 */
export function chaveResend() {
  const chave = process.env.RESEND_API_KEY || doEnvLocal('RESEND_API_KEY');
  if (!chave) {
    console.error('Falta RESEND_API_KEY.');
    console.error('Defina em .env.local na raiz do projeto (fora do git):');
    console.error('  RESEND_API_KEY=re_sua_chave');
    console.error('Ou passe na chamada: RESEND_API_KEY=re_xxx node <script>');
    process.exit(1);
  }
  return chave;
}
