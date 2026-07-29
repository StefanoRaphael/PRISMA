/**
 * PRISMA — POST /api/me
 *
 * Garante o perfil do usuário logado e sincroniza o direito de acesso.
 *
 * Esta rota é a REDE DE SEGURANÇA do cadastro. Com "Confirm email" ligado no
 * Supabase, o signup não devolve sessão, então o cliente nunca chega a criar o
 * perfil pelo navegador: ele sai da tela, confirma o e-mail e volta já logado.
 * Se o gatilho ao_criar_usuario não estiver ativo no banco, o perfil nunca
 * nasce — e o cliente atravessa diagnóstico e envio de fotos para só descobrir
 * na hora de gerar que não existe perfil nenhum. Foi exatamente isso que
 * aconteceu em produção. Por isso a linha de perfil é garantida AQUI, no
 * servidor, com service role, em toda entrada no app.
 *
 * A checagem de conta interna é por e-mail e acontece no servidor, a partir do
 * token do Supabase. Nunca aceite o e-mail vindo do corpo da requisição:
 * qualquer pessoa se daria acesso ilimitado mandando o endereço certo.
 */

import { admin, usuarioDaRequisicao } from '../lib/auth.js';
import { ehIlimitada, ehTester } from '../lib/contas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Faça login de novo.' });

  const sb = admin();

  const { data: perfilAtual, error: erroLeitura } = await sb
    .from('perfis')
    .select('plano, creditos, validade, arquetipo')
    .eq('id', usuario.id)
    .maybeSingle();

  if (erroLeitura) {
    console.error('[me] leitura do perfil', erroLeitura);
    return res.status(500).json({ erro: 'Não consegui carregar sua conta.' });
  }

  // --- garantia de perfil -------------------------------------------------
  // Sem linha em perfis, nada depois funciona: o arquétipo do diagnóstico é
  // gravado com UPDATE (que não falha, só não afeta linha nenhuma) e a geração
  // morre. Criar aqui é idempotente — se o gatilho já criou, o insert conflita
  // no id e seguimos com o que existe.
  let perfil = perfilAtual;
  if (!perfil) {
    const { data: novo, error: erroCriacao } = await sb
      .from('perfis')
      .insert({
        id: usuario.id,
        nome: usuario.nome || '',
        plano: 'nenhum',
        creditos: 0
      })
      .select('plano, creditos, validade, arquetipo')
      .single();

    if (erroCriacao) {
      // 23505 = corrida com o gatilho: alguém criou entre a leitura e o insert.
      if (erroCriacao.code !== '23505') {
        console.error('[me] criação do perfil', erroCriacao);
        return res.status(500).json({ erro: 'Não consegui preparar sua conta.' });
      }
      const { data: relido } = await sb
        .from('perfis').select('plano, creditos, validade, arquetipo')
        .eq('id', usuario.id).maybeSingle();
      perfil = relido;
    } else {
      perfil = novo;
    }
  }

  // --- direito de acesso --------------------------------------------------
  if (ehIlimitada(usuario.email)) {
    const { error } = await sb.from('perfis').update({
      plano: 'ilimitado',
      creditos: 9999,
      validade: null,
      metodo: 'Conta do estúdio'
    }).eq('id', usuario.id);

    if (error) {
      console.error('[me] liberação ilimitada', error);
      return res.status(500).json({ erro: 'Não consegui liberar a conta.' });
    }
    return res.status(200).json({ plano: 'ilimitado', creditos: 9999, validade: null });
  }

  if (ehTester(usuario.email)) {
    // Concede só uma vez: se o e-mail já tem um plano de verdade (pagou
    // Básico/Pro depois de testar) ou já usou o teste, não sobrescreve.
    if (perfil?.plano === 'nenhum') {
      const validade = new Date();
      validade.setDate(validade.getDate() + 60);

      const { error } = await sb.from('perfis').update({
        plano: 'tester',
        creditos: 5,
        validade: validade.toISOString(),
        metodo: 'Teste PRISMA'
      }).eq('id', usuario.id);

      if (error) {
        console.error('[me] liberação tester', error);
        return res.status(500).json({ erro: 'Não consegui liberar a conta.' });
      }
      return res.status(200).json({ plano: 'tester', creditos: 5, validade: validade.toISOString() });
    }
  }

  return res.status(200).json({
    plano: perfil?.plano || 'nenhum',
    creditos: perfil?.creditos || 0,
    validade: perfil?.validade || null
  });
}
