import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getAdminClient } from '@/backend/lib/supabase-admin';
import { calcularScoreVulnerabilidade } from '@/backend/lib/vulnerabilidade';

export interface MatchingVagaResponse {
  vaga_id: string;
  vaga_titulo: string;
  empresa: string;
  recomendacoes: any[];
  gerado_em: string;
}

export interface MatchingJovemResponse {
  jovem_id: string;
  jovem_nome: string;
  recomendacoes: any[];
  gerado_em: string;
}

/**
 * Modo 1: Encontra os melhores jovens candidatos para uma vaga aberta.
 */
export async function matchVagaComJovens(
  vagaId: string,
  userEmpresaId?: string,
  tecnicoEquipamentoId?: string | null,
  isTecnicoAdmin: boolean = false
): Promise<MatchingVagaResponse> {
  const supabase = getAdminClient();

  const { data: vaga, error: vagaError } = await (supabase
    .from('vagas_disponiveis')
    .select('*, empresas_parceiras(*)')
    .eq('id', vagaId)
    .single()) as { data: any; error: unknown };

  if (vagaError || !vaga) {
    throw new Error('Vaga não encontrada.');
  }

  // Prevenção contra IDOR: Empresa só pode consultar suas próprias vagas
  if (userEmpresaId && vaga.empresa_id !== userEmpresaId) {
    throw new Error('Acesso negado: esta vaga pertence a outra empresa parceira.');
  }

  let queryJovens = (supabase.from('jovens') as any).select('*, equipamentos(nome)');
  let queryAcompanhamentos = (supabase.from('acompanhamentos') as any).select(
    'jovem_id, assiduidade, desempenho, comportamento'
  );

  if (!isTecnicoAdmin && tecnicoEquipamentoId) {
    queryJovens = queryJovens.eq('equipamento_id', tecnicoEquipamentoId);
    queryAcompanhamentos = (supabase
      .from('acompanhamentos') as any)
      .select('jovem_id, assiduidade, desempenho, comportamento, jovens!inner(equipamento_id)')
      .eq('jovens.equipamento_id', tecnicoEquipamentoId);
  }

  const [jovensRes, acsRes] = await Promise.all([queryJovens, queryAcompanhamentos]);

  if (jovensRes.error || !jovensRes.data) {
    throw new Error('Erro ao buscar candidatos disponíveis.');
  }

  const acompanhamentosPorJovem: Record<string, any[]> = {};
  if (acsRes.data) {
    (acsRes.data as any[]).forEach((ac) => {
      if (!acompanhamentosPorJovem[ac.jovem_id]) acompanhamentosPorJovem[ac.jovem_id] = [];
      acompanhamentosPorJovem[ac.jovem_id].push(ac);
    });
  }

  const jovensProcessados = (jovensRes.data as any[]).map((jovem) => {
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
      equipamento: jovem.equipamentos?.nome || 'Geral',
    };
  });

  const prompt = `
    Você é o "Coordenador de Matching IA" do DescubraHub. Sua função é analisar as exigências de uma vaga aberta e o perfil de jovens cadastrados, recomendando os TOP 3 candidatos ideais.
    DADOS DA VAGA:
    - Título: ${vaga.titulo}
    - Descrição: ${vaga.descricao}
    - Tipo: ${vaga.tipo} (Aprendizagem/Emprego)
    - Empresa Ofertante: ${vaga.empresas_parceiras?.razao_social}

    LISTA DE JOVENS CANDIDATOS:
    ${JSON.stringify(
      jovensProcessados.map((j) => ({
        id: j.id,
        nome: j.nome,
        idade: j.idade,
        escolaridade: j.escolaridade,
        turno_escolar: j.turno_escolar,
        fez_pre_aprendizagem: j.fez_pre_aprendizagem,
        score_vulnerabilidade: j.score_vulnerabilidade,
        classificacao_risco: j.classificacao_risco,
      }))
    )}

    CRITÉRIOS CLAVE PARA SELEÇÃO:
    1. COMPATIBILIDADE DE TURNO (CRÍTICO): Conflitos de horário escolar devem ser evitados.
    2. ESCOLARIDADE: Nível minimamente coerente.
    3. INCLUSÃO PRODUTIVA (MUITO FORTE): Em igualdade de condições, PRIORIZE jovens com maior vulnerabilidade.

    Retorne até 3 candidatos recomendados. Para cada um, seja conciso e direto na justificativa e no plano de preparação (máximo 2 frases cada).
  `;

  const { object: matchingResult, usage } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: z.object({
      recomendacoes: z
        .array(
          z.object({
            jovem_id: z.string().describe('ID do jovem recomendado'),
            compatibilidade: z.number().min(0).max(100).describe('Porcentagem de matching'),
            justificativa: z.string().describe('Explicação resumida'),
            plano_preparacao: z.string().describe('Conselho curto ao técnico'),
          })
        )
        .max(3),
    }),
    prompt,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 512,
        },
      },
    },
  });

  console.log(
    `[TOKEN USAGE] matching-vagas Mode 1 | Input: ${usage?.inputTokens ?? '?'} | Output: ${usage?.outputTokens ?? '?'} | Total: ${usage?.totalTokens ?? '?'}`
  );

  const recomendacoesDetalhadas = matchingResult.recomendacoes
    .map((rec) => {
      const perfilCompleto = jovensProcessados.find((j) => j.id === rec.jovem_id);
      return { ...rec, perfil: perfilCompleto || null };
    })
    .filter((r) => r.perfil !== null);

  return {
    vaga_id: vagaId,
    vaga_titulo: vaga.titulo,
    empresa: vaga.empresas_parceiras?.razao_social,
    recomendacoes: recomendacoesDetalhadas,
    gerado_em: new Date().toISOString(),
  };
}

/**
 * Modo 2: Encontra as melhores vagas abertas para um determinado jovem.
 */
export async function matchJovemComVagas(
  jovemId: string,
  tecnicoEquipamentoId?: string | null,
  isTecnicoAdmin: boolean = false
): Promise<MatchingJovemResponse> {
  const supabase = getAdminClient();

  let queryJovem = (supabase.from('jovens') as any).select('*, equipamentos(nome)').eq('id', jovemId);

  if (!isTecnicoAdmin && tecnicoEquipamentoId) {
    queryJovem = queryJovem.eq('equipamento_id', tecnicoEquipamentoId);
  }

  const { data: jovem, error: jovemError } = await (queryJovem.single()) as { data: any; error: unknown };

  if (jovemError || !jovem) {
    throw new Error('Jovem não encontrado ou sem permissão de acesso.');
  }

  const { data: acs } = (await supabase
    .from('acompanhamentos')
    .select('assiduidade, desempenho, comportamento')
    .eq('jovem_id', jovemId)) as { data: any[] | null };

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
    motivos: calc.motivos,
  };

  const { data: vagasAbertas, error: vagasError } = (await supabase
    .from('vagas_disponiveis')
    .select('*, empresas_parceiras(razao_social, endereco, cidade_id)')
    .eq('status', 'Aberta')) as { data: any[] | null; error: unknown };

  if (vagasError || !vagasAbertas || vagasAbertas.length === 0) {
    throw new Error('Nenhuma vaga aberta encontrada no sistema.');
  }

  const prompt = `
    Você é o "Coordenador de Matching IA" do DescubraHub. Sua função é analisar o perfil de um jovem e encontrar as TOP 3 vagas disponíveis mais adequadas para ele.

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
    ${JSON.stringify(
      vagasAbertas.map((v) => ({
        id: v.id,
        titulo: v.titulo,
        tipo: v.tipo,
        empresa: v.empresas_parceiras?.razao_social,
        idade_minima: v.idade_minima,
        escolaridade_exigida: v.escolaridade_exigida,
        horario: v.horario,
        bolsa: v.bolsa_auxilio,
      }))
    )}

    CRITÉRIOS CLAVE PARA SELEÇÃO:
    1. COMPATIBILIDADE DE TURNO (CRÍTICO): Conflitos de horário escolar devem ser evitados.
    2. IDADE MÍNIMA: O jovem deve ter a idade mínima exigida.
    3. PERFIL: A escolaridade e o perfil da vaga devem casar com o nível do jovem.

    Retorne até as Top 3 vagas sugeridas para este jovem. Para cada uma:
    - vaga_id: ID exato da vaga
    - compatibilidade: número de 0 a 100
    - justificativa: texto curto e direto (máximo 2 frases) explicando a compatibilidade ou pontos de atenção (ex: se ainda não tiver idade mínima)
    - conselho: conselho prático e motivador ao jovem (máximo 2 frases).
  `;

  const { object: matchingResult, usage } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: z.object({
      recomendacoes: z
        .array(
          z.object({
            vaga_id: z.string().describe('ID da vaga recomendada'),
            compatibilidade: z.number().min(0).max(100).describe('Porcentagem de matching'),
            justificativa: z.string().describe('Explicação resumida'),
            conselho: z.string().describe('Conselho ao jovem'),
          })
        )
        .max(3),
    }),
    prompt,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 512,
        },
      },
    },
  });

  console.log(
    `[TOKEN USAGE] matching-vagas Mode 2 | Input: ${usage?.inputTokens ?? '?'} | Output: ${usage?.outputTokens ?? '?'} | Total: ${usage?.totalTokens ?? '?'}`
  );

  const recomendacoesDetalhadas = matchingResult.recomendacoes
    .map((rec) => {
      const vagaCompleta = vagasAbertas.find((v) => v.id === rec.vaga_id);
      return { ...rec, vaga: vagaCompleta || null };
    })
    .filter((r) => r.vaga !== null);

  return {
    jovem_id: jovemId,
    jovem_nome: jovemPerfil.nome,
    recomendacoes: recomendacoesDetalhadas,
    gerado_em: new Date().toISOString(),
  };
}
