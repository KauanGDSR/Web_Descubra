import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getAdminClient } from '@/backend/lib/supabase-admin';

const PROMPT_LIVRE_MAX_LENGTH = 500;

export function sanitizePromptLivre(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '') // Remove tags HTML/XML
    .replace(/[\r\n]{3,}/g, '\n\n') // Colapsa quebras de linha excessivas
    .substring(0, PROMPT_LIVRE_MAX_LENGTH)
    .trim();
}

const individualSchema = z.object({
  evolucao: z.string().describe('Análise geral sobre a evolução do jovem ao longo do tempo (baseado nos registros)'),
  pontos_fortes: z.array(z.string()).describe('Lista de até 4 pontos fortes observados'),
  pontos_atencao: z.array(z.string()).describe('Lista de até 3 pontos de atenção ou alerta'),
  recomendacoes: z.string().describe('Recomendações sugeridas aos técnicos/educadores para auxiliar este jovem'),
  contexto_social_regiao: z.string().describe('Análise de como a localidade/CEP onde o jovem reside pode estar influenciando seu desempenho ou assiduidade.'),
  nota_geral: z.string().describe('Uma breve avaliação em 2 ou 3 palavras (ex: Excelente progresso, Necessita intervenção, Evolução constante)'),
});

const geralSchema = z.object({
  resumo_geral: z.string().describe('Uma visão geral analítica e profissional sobre o momento atual de todos os jovens acompanhados'),
  tendencias: z.array(z.string()).describe('Padrões ou comportamentos que estão se repetindo no grupo em geral (até 4 tendências)'),
  alertas: z.array(z.string()).describe('Pontos críticos que afetam uma parte do grupo ou menção a áreas que exigem suporte extra (até 3 alertas)'),
  analise_geografica: z.string().describe('Análise de distribuição por CEP/região, identificando áreas de maior vulnerabilidade ou desafios.'),
  metricas_qualitativas: z.string().describe('Um resumo avaliativo focado no engajamento e qualidade dos relatórios gerados'),
  recomendacoes: z.string().describe('Ações institucionais ou diretrizes recomendadas para toda a equipe baseada nestes dados'),
});

/**
 * Gera relatório pedagógico e social individual de um jovem baseado em seus registros.
 */
export async function gerarRelatorioIndividual(
  jovemId: string,
  promptLivre?: string | null,
  tecnicoEquipamentoId?: string | null,
  isTecnicoAdmin: boolean = false
) {
  const supabase = getAdminClient();

  const { data: jovem, error: jovemError } = await (supabase
    .from('jovens')
    .select('nome_completo, nome_social, idade, bairro, equipamento_id, equipamentos(nome)')
    .eq('id', jovemId)
    .single()) as { data: any; error: unknown };

  if (jovemError || !jovem) {
    throw new Error('Jovem não encontrado.');
  }

  // Prevenção IDOR para técnicos de campo
  if (!isTecnicoAdmin && tecnicoEquipamentoId && jovem.equipamento_id !== tecnicoEquipamentoId) {
    throw new Error('Acesso negado: o jovem não pertence à sua unidade de referência.');
  }

  const eq = jovem.equipamentos;
  const eqNome = Array.isArray(eq) ? eq[0]?.nome || '' : eq?.nome || '';
  const nomeParaRelatorio = jovem.nome_social || jovem.nome_completo;

  const { data: acompanhamentos, error: acError } = await supabase
    .from('acompanhamentos')
    .select('data_registro, assiduidade, desempenho, comportamento, resumo')
    .eq('jovem_id', jovemId)
    .order('data_registro', { ascending: true });

  if (acError) throw acError;
  if (!acompanhamentos || acompanhamentos.length === 0) {
    throw new Error('Não há acompanhamentos suficientes para gerar um relatório deste jovem.');
  }

  const dadosFormatados = acompanhamentos
    .map((a: any) => {
      const data = new Date(a.data_registro).toLocaleDateString('pt-BR');
      return `Data: ${data}\nAssiduidade: ${a.assiduidade || 'N/A'}\nDesempenho: ${a.desempenho || 'N/A'}\nComportamento: ${a.comportamento || 'N/A'}\nResumo: ${a.resumo || 'N/A'}`;
    })
    .join('\n\n');

  const promptSanitizado = promptLivre ? sanitizePromptLivre(promptLivre) : null;
  const focusSection = promptSanitizado
    ? `\n<user_focus>\nFoco especial solicitado pelo usuário: ${promptSanitizado}\nIncorpore este foco na sua análise.\n</user_focus>`
    : '';

  const promptContext = `
Você é um psicopedagogo analista de dados avançado do DescubraHub.
O objetivo é gerar um relatório consolidado e inteligente do jovem abaixo com base no histórico de acompanhamentos registrados e em sua região/CEP de residência.

Jovem: ${nomeParaRelatorio} (Equipamento: ${eqNome})
Região/CEP de residência: ${jovem.bairro || 'Não informado'}
Total de registros: ${acompanhamentos.length}

Histórico (cronológico, do mais antigo ao mais atual):
---
${dadosFormatados}
---

Faça uma análise profunda deste histórico e do impacto de sua região de residência nas atividades do programa, e retorne os dados no formato solicitado.
${focusSection}
`;

  const { object: resultado, usage } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: individualSchema,
    prompt: promptContext,
  });

  console.log(
    `[TOKEN USAGE] relatorio-ia Individual | Prompt: ${usage?.inputTokens ?? '?'} | Output: ${usage?.outputTokens ?? '?'} | Total: ${usage?.totalTokens ?? '?'}`
  );

  return {
    dados_jovem: {
      nome: nomeParaRelatorio,
      equipamento: eqNome,
      idade: jovem.idade,
      bairro: jovem.bairro,
    },
    relatorio: resultado,
  };
}

/**
 * Gera relatório analítico institucional agregado do programa.
 */
export async function gerarRelatorioGeral(
  promptLivre?: string | null,
  tecnicoEquipamentoId?: string | null,
  isTecnicoAdmin: boolean = false
) {
  const supabase = getAdminClient();

  let queryAcompanhamentos = supabase.from('acompanhamentos').select(`
    data_registro, assiduidade, desempenho, comportamento, resumo,
    jovens(nome_social, nome_completo, bairro)
  `);

  if (!isTecnicoAdmin && tecnicoEquipamentoId) {
    queryAcompanhamentos = supabase
      .from('acompanhamentos')
      .select(`
        data_registro, assiduidade, desempenho, comportamento, resumo,
        jovens!inner(nome_social, nome_completo, bairro, equipamento_id)
      `)
      .eq('jovens.equipamento_id', tecnicoEquipamentoId);
  }

  const { data: acompanhamentos, error: acError } = await queryAcompanhamentos
    .order('data_registro', { ascending: false })
    .limit(50);

  if (acError) throw acError;
  if (!acompanhamentos || acompanhamentos.length === 0) {
    throw new Error('Não há acompanhamentos cadastrados no sistema.');
  }

  const dadosFormatados = acompanhamentos
    .map((a: any) => {
      const data = new Date(a.data_registro).toLocaleDateString('pt-BR');
      const j = Array.isArray(a.jovens) ? a.jovens[0] : a.jovens;
      const nome = j?.nome_social || j?.nome_completo || 'Anônimo';
      const localidade = j?.bairro || 'Não informada';
      return `Data: ${data} | Jovem: ${nome} | Localidade: ${localidade}\nAssid: ${a.assiduidade || '-'} | Desemp: ${a.desempenho || '-'} | Comp: ${a.comportamento || '-'}\nNota: ${a.resumo || '-'}`;
    })
    .join('\n\n');

  const promptSanitizado = promptLivre ? sanitizePromptLivre(promptLivre) : null;
  const focusSection = promptSanitizado
    ? `\n<user_focus>\nFoco especial solicitado pelo usuário: ${promptSanitizado}\nIncorpore este foco na sua análise estratégica global.\n</user_focus>`
    : '';

  const promptContext = `
Você é o gestor estratégico do DescubraHub.
O objetivo é gerar um painel analítico do cenário atual do programa com base nos **últimos ${acompanhamentos.length} registros** de acompanhamento, fornecendo especial atenção para a distribuição de jovens por bairro e CEP.

Amostra de registros recentes (inclui bairro/CEP de cada jovem):
---
${dadosFormatados}
---

Extraia as tendências principais, pontos de alerta generalizados, uma análise de distribuição geográfica por região/CEP e recomendações institucionais.
${focusSection}
`;

  const { object: resultado, usage } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: geralSchema,
    prompt: promptContext,
  });

  console.log(
    `[TOKEN USAGE] relatorio-ia Geral | Prompt: ${usage?.inputTokens ?? '?'} | Output: ${usage?.outputTokens ?? '?'} | Total: ${usage?.totalTokens ?? '?'}`
  );

  return {
    total_analisado: acompanhamentos.length,
    relatorio: resultado,
  };
}
