import { NextResponse, NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@/utils/supabase/server';
import { calcularScoreVulnerabilidade } from '@/lib/vulnerabilidade';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaga_id, jovem_id } = body;

    if (!vaga_id && !jovem_id) {
      return NextResponse.json({ error: 'É necessário informar vaga_id ou jovem_id.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY não configurada.");
      return NextResponse.json({ error: 'Erro de configuração do Gemini IA.' }, { status: 500 });
    }

    // 0. VERIFICAÇÃO DE SEGURANÇA
    const supabaseAuth = await createClient();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    const { data: tecnico } = await supabaseAuth
      .from('tecnicos')
      .select('cargo, equipamento_id')
      .eq('id', user.id)
      .single();

    const { data: company } = await supabaseAuth
      .from('empresas_parceiras')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!tecnico && !company) {
      return NextResponse.json({ error: 'Acesso negado. Usuário sem perfil adequado.' }, { status: 403 });
    }

    // Validação de UUIDs recebidos do body
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (vaga_id && !uuidRegex.test(vaga_id)) {
      return NextResponse.json({ error: 'vaga_id inválido.' }, { status: 400 });
    }
    if (jovem_id && !uuidRegex.test(jovem_id)) {
      return NextResponse.json({ error: 'jovem_id inválido.' }, { status: 400 });
    }

    const supabaseClient = getAdminClient();

    // ==========================================================
    // MODO 1: MATCHAR VAGA COM JOVENS (Empresas buscam candidatos)
    // ==========================================================
    if (vaga_id) {
      const { data: vaga, error: vagaError } = await (supabaseClient
        .from('vagas_disponiveis')
        .select('*, empresas_parceiras(*)')
        .eq('id', vaga_id)
        .single()) as { data: any; error: unknown };

      if (vagaError || !vaga) {
        return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
      }

      if (company && vaga.empresa_id !== user.id) {
        return NextResponse.json({ error: 'Acesso negado. Esta vaga pertence a outra empresa.' }, { status: 403 });
      }

      let queryJovens = (supabaseClient.from('jovens') as any).select('*, equipamentos(nome)');
      let queryAcompanhamentos = (supabaseClient.from('acompanhamentos') as any).select('jovem_id, assiduidade, desempenho, comportamento');

      if (tecnico && tecnico.cargo !== 'admin') {
        if (!tecnico.equipamento_id) {
          return NextResponse.json({ error: 'Técnico sem unidade de referência vinculada.' }, { status: 403 });
        }
        queryJovens = queryJovens.eq('equipamento_id', tecnico.equipamento_id);
        queryAcompanhamentos = (supabaseClient
          .from('acompanhamentos') as any)
          .select('jovem_id, assiduidade, desempenho, comportamento, jovens!inner(equipamento_id)')
          .eq('jovens.equipamento_id', tecnico.equipamento_id);
      }

      const [jovensRes, acsRes] = await Promise.all([queryJovens, queryAcompanhamentos]);

      if (jovensRes.error || !jovensRes.data) {
        return NextResponse.json({ error: 'Erro ao buscar jovens.' }, { status: 500 });
      }

      const acompanhamentosPorJovem: Record<string, Array<{ assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null }>> = {};
      if (acsRes.data) {
        (acsRes.data as Array<{ jovem_id: string; assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null }>).forEach((ac) => {
          if (!acompanhamentosPorJovem[ac.jovem_id]) acompanhamentosPorJovem[ac.jovem_id] = [];
          acompanhamentosPorJovem[ac.jovem_id].push(ac);
        });
      }

      const jovensProcessados = (jovensRes.data as Array<{ id: string; nome_social?: string | null; nome_completo: string; escolaridade?: string | null; turno_escolar?: string | null; bairro?: string | null; idade?: number | null; fez_pre_aprendizagem?: boolean | null; passou_pre_aprendizagem?: boolean | null; equipamentos?: { nome: string } | null }>).map((jovem) => {
        const calc = calcularScoreVulnerabilidade(jovem, acompanhamentosPorJovem[jovem.id] || []);
        return {
          id: jovem.id,
          nome: jovem.nome_social || jovem.nome_completo,
          escolaridade: jovem.escolaridade,
          turno_escolar: jovem.turno_escolar,
          bairro: jovem.bairro,
          idade: jovem.idade,
          fez_pre_aprendizagem: jovem.fez_pre_aprendizagem || jovem.passou_pre_aprendizagem || false,
          score_vulnerabilidade: calc.score,
          classificacao_risco: calc.classificacao,
          motivos: calc.motivos,
          equipamento: jovem.equipamentos?.nome || 'Geral'
        };
      });

      const prompt = `
        Você é o "Coordenador de Matching IA" do Programa Descubra 2.0. Sua função é analisar as exigências de uma vaga aberta e o perfil de jovens cadastrados, recomendando os TOP 3 candidatos ideais.
        DADOS DA VAGA:
        - Título: ${vaga.titulo}
        - Descrição: ${vaga.descricao}
        - Tipo: ${vaga.tipo} (Aprendizagem/Emprego)
        - Empresa Ofertante: ${vaga.empresas_parceiras?.razao_social}

        LISTA DE JOVENS CANDIDATOS:
        ${JSON.stringify(jovensProcessados.map(j => ({
          id: j.id, nome: j.nome, idade: j.idade, escolaridade: j.escolaridade, turno_escolar: j.turno_escolar, fez_pre_aprendizagem: j.fez_pre_aprendizagem, score_vulnerabilidade: j.score_vulnerabilidade, classificacao_risco: j.classificacao_risco
        })))}

        CRITÉRIOS CLAVE PARA SELEÇÃO:
        1. COMPATIBILIDADE DE TURNO (CRÍTICO): Conflitos de horário escolar devem ser evitados.
        2. ESCOLARIDADE: Nível minimamente coerente.
        3. INCLUSÃO PRODUTIVA (MUITO FORTE): Em igualdade de condições, PRIORIZE jovens com maior vulnerabilidade.

        Retorne os Top 3 candidatos sugeridos.
      `;

      const { object: matchingResult, usage } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: z.object({
          recomendacoes: z.array(
            z.object({
              jovem_id: z.string().describe('ID do jovem recomendado'),
              compatibilidade: z.number().min(0).max(100).describe('Porcentagem de matching'),
              justificativa: z.string().describe('Explicação detalhada'),
              plano_preparacao: z.string().describe('Conselho curto ao técnico')
            })
          ).min(1).max(3)
        }),
        prompt
      });

      console.log(
        `[TOKEN USAGE] matching-vagas Mode 1 | ` +
        `Prompt: ${usage?.inputTokens ?? '?'} | ` +
        `Resposta: ${usage?.outputTokens ?? '?'} | ` +
        `Total: ${usage?.totalTokens ?? '?'} tokens`
      );

      const recomendacoesDetalhadas = matchingResult.recomendacoes.map(rec => {
        const perfilCompleto = jovensProcessados.find(j => j.id === rec.jovem_id);
        return { ...rec, perfil: perfilCompleto || null };
      }).filter(r => r.perfil !== null);

      return NextResponse.json({
        vaga_id,
        vaga_titulo: vaga.titulo,
        empresa: vaga.empresas_parceiras?.razao_social,
        recomendacoes: recomendacoesDetalhadas,
        gerado_em: new Date().toISOString()
      });
    }

    // ==========================================================
    // MODO 2: MATCHAR JOVEM COM VAGAS (Técnicos buscam vagas)
    // ==========================================================
    if (jovem_id) {
      // [SEC-04] Aplicar filtro de equipamento para técnicos de campo
      // Impede IDOR — um técnico não pode consultar jovens de outro equipamento
      let queryJovem = (supabaseClient
        .from('jovens') as any)
        .select('*, equipamentos(nome)')
        .eq('id', jovem_id);

      if (tecnico && tecnico.cargo !== 'admin') {
        if (!tecnico.equipamento_id) {
          return NextResponse.json({ error: 'Técnico sem unidade de referência vinculada.' }, { status: 403 });
        }
        queryJovem = queryJovem.eq('equipamento_id', tecnico.equipamento_id);
      }

      const { data: jovem, error: jovemError } = await (queryJovem.single()) as { data: any; error: unknown };

      if (jovemError || !jovem) {
        return NextResponse.json({ error: 'Jovem não encontrado.' }, { status: 404 });
      }

      const { data: acs } = await (supabaseClient
        .from('acompanhamentos')
        .select('assiduidade, desempenho, comportamento')
        .eq('jovem_id', jovem_id)) as { data: Array<{ assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null }> | null };

      const calc = calcularScoreVulnerabilidade(jovem, acs || []);
      const jovemPerfil = {
        id: jovem.id,
        nome: jovem.nome_social || jovem.nome_completo,
        escolaridade: jovem.escolaridade,
        turno_escolar: jovem.turno_escolar,
        bairro: jovem.bairro,
        idade: jovem.idade,
        fez_pre_aprendizagem: jovem.fez_pre_aprendizagem || jovem.passou_pre_aprendizagem || false,
        score_vulnerabilidade: calc.score,
        classificacao_risco: calc.classificacao,
        motivos: calc.motivos
      };

      const { data: vagasAbertas, error: vagasError } = await (supabaseClient
        .from('vagas_disponiveis')
        .select('*, empresas_parceiras(razao_social, endereco, cidade_id)')
        .eq('status', 'Aberta')) as { data: any[] | null; error: unknown };

      if (vagasError || !vagasAbertas || vagasAbertas.length === 0) {
        return NextResponse.json({ error: 'Nenhuma vaga aberta encontrada no sistema.' }, { status: 404 });
      }

      const prompt = `
        Você é o "Coordenador de Matching IA" do Programa Descubra 2.0. Sua função é analisar o perfil de um jovem e encontrar as TOP 3 vagas disponíveis mais adequadas para ele.

        PERFIL DO JOVEM:
        - Nome: ${jovemPerfil.nome}
        - Idade: ${jovemPerfil.idade}
        - Escolaridade: ${jovemPerfil.escolaridade}
        - Turno Escolar: ${jovemPerfil.turno_escolar}
        - Bairro: ${jovemPerfil.bairro}
        - Concluiu Pré-Aprendizagem: ${jovemPerfil.fez_pre_aprendizagem ? 'Sim' : 'Não'}
        - Vulnerabilidade: ${jovemPerfil.classificacao_risco} (Score: ${jovemPerfil.score_vulnerabilidade})
        - Fatores Críticos: ${jovemPerfil.motivos.join(', ')}

        LISTA DE VAGAS ABERTAS:
        ${JSON.stringify(vagasAbertas.map(v => ({
          id: v.id,
          titulo: v.titulo,
          tipo: v.tipo,
          empresa: v.empresas_parceiras?.razao_social,
          idade_minima: v.idade_minima,
          escolaridade_exigida: v.escolaridade_exigida,
          horario: v.horario,
          bolsa: v.bolsa_auxilio
        })))}

        CRITÉRIOS CLAVE PARA SELEÇÃO:
        1. COMPATIBILIDADE DE TURNO (CRÍTICO): Conflitos de horário escolar devem ser evitados.
        2. IDADE MÍNIMA: O jovem deve ter a idade mínima exigida.
        3. PERFIL: A escolaridade e o perfil da vaga devem casar com o nível do jovem.

        Retorne as Top 3 vagas sugeridas para este jovem. Para cada uma, forneça a compatibilidade em porcentagem (0 a 100), uma justificativa humana baseada nos critérios acima e um conselho ao jovem.
      `;

      const { object: matchingResult, usage } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: z.object({
          recomendacoes: z.array(
            z.object({
              vaga_id: z.string().describe('ID da vaga recomendada'),
              compatibilidade: z.number().min(0).max(100).describe('Porcentagem de matching com o jovem'),
              justificativa: z.string().describe('Explicação detalhada da recomendação'),
              conselho: z.string().describe('Conselho ao jovem para se dar bem na entrevista desta vaga')
            })
          ).min(1).max(3)
        }),
        prompt
      });

      console.log(
        `[TOKEN USAGE] matching-vagas Mode 2 | ` +
        `Prompt: ${usage?.inputTokens ?? '?'} | ` +
        `Resposta: ${usage?.outputTokens ?? '?'} | ` +
        `Total: ${usage?.totalTokens ?? '?'} tokens`
      );

      const recomendacoesDetalhadas = matchingResult.recomendacoes.map(rec => {
        const vagaCompleta = vagasAbertas.find(v => v.id === rec.vaga_id);
        return { ...rec, vaga: vagaCompleta || null };
      }).filter(r => r.vaga !== null);

      return NextResponse.json({
        jovem_id,
        jovem_nome: jovemPerfil.nome,
        recomendacoes: recomendacoesDetalhadas,
        gerado_em: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });

  } catch (err: unknown) {
    console.error("Erro na rota de API de matching:", err);
    return NextResponse.json(
      { error: 'Erro interno ao processar o matching inteligente com IA.' },
      { status: 500 }
    );
  }
}
