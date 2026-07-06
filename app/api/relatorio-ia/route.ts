import { NextResponse, NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase-admin';
import { createClient as createServerClient } from '@/utils/supabase/server';

// Tamanho máximo permitido para o campo de prompt livre do usuário
const PROMPT_LIVRE_MAX_LENGTH = 500;

/**
 * [SEC-03] Sanitiza o campo prompt_livre enviado pelo usuário antes de
 * interpolá-lo no prompt da IA.
 * - Remove tags HTML/XML que poderiam ser usadas em prompt injection
 * - Limita o tamanho a 500 caracteres
 * - Remove padrões comuns de "jailbreak" de prompt injection
 */
function sanitizePromptLivre(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')                      // Remove tags HTML/XML
    .replace(/[\r\n]{3,}/g, '\n\n')               // Colapsa múltiplas quebras de linha
    .substring(0, PROMPT_LIVRE_MAX_LENGTH)         // Limita tamanho
    .trim();
}

// ── SCHEMAS ZOD ──────────────────────────────────────────────────────────────
const individualSchema = z.object({
  evolucao: z.string().describe('Análise geral sobre a evolução do jovem ao longo do tempo (baseado nos registros)'),
  pontos_fortes: z.array(z.string()).describe('Lista de até 4 pontos fortes observados'),
  pontos_atencao: z.array(z.string()).describe('Lista de até 3 pontos de atenção ou alerta'),
  recomendacoes: z.string().describe('Recomendações sugeridas aos técnicos/educadores para auxiliar este jovem'),
  contexto_social_regiao: z.string().describe('Análise de como a localidade/CEP onde o jovem reside pode estar influenciando seu desempenho ou assiduidade (ex: desafios de locomoção, rede de apoio na região).'),
  nota_geral: z.string().describe('Uma breve avaliação em 2 ou 3 palavras (ex: Excelente progresso, Necessita intervenção, Evolução constante)'),
});

const geralSchema = z.object({
  resumo_geral: z.string().describe('Uma visão geral analítica e profissional sobre o momento atual de todos os jovens acompanhados'),
  tendencias: z.array(z.string()).describe('Padrões ou comportamentos que estão se repetindo no grupo em geral (até 4 tendências)'),
  alertas: z.array(z.string()).describe('Pontos críticos que afetam uma parte do grupo ou menção a áreas que exigem suporte extra (até 3 alertas)'),
  analise_geografica: z.string().describe('Análise de distribuição por CEP/região, identificando áreas de maior vulnerabilidade, maior engajamento ou desafios de transporte/acesso.'),
  metricas_qualitativas: z.string().describe('Um resumo avaliativo focado no engajamento e qualidade dos relatórios gerados'),
  recomendacoes: z.string().describe('Ações institucionais ou diretrizes recomendadas para toda a equipe baseada nestes dados'),
});

// ── API HANDLER ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Verificação de autenticação
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Busca o cargo do técnico/coordenador autenticado
    const { data: tecnico, error: tecError } = await supabaseAuth
      .from('tecnicos')
      .select('cargo, equipamento_id')
      .eq('id', user.id)
      .single();

    if (tecError || !tecnico) {
      return NextResponse.json({ error: 'Acesso negado. Usuário sem perfil adequado.' }, { status: 403 });
    }

    const body = await request.json();
    const { tipo, jovem_id, prompt_livre } = body;

    if (!tipo || !['individual', 'geral'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de relatório inválido. Requer "individual" ou "geral".' }, { status: 400 });
    }

    if (tipo === 'individual') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!jovem_id || !uuidRegex.test(jovem_id)) {
        return NextResponse.json({ error: 'ID do jovem inválido.' }, { status: 400 });
      }
    }

    // [SEC-03] Sanitiza o prompt_livre antes de qualquer uso
    const promptLivreSanitizado = prompt_livre && typeof prompt_livre === 'string'
      ? sanitizePromptLivre(prompt_livre)
      : null;

    const supabase = getAdminClient();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'Erro de configuração: Chave da IA não encontrada no backend.' }, { status: 500 });
    }

    if (tipo === 'individual') {
      // 1. Relatório Individual
      const { data: jovem, error: jovemError } = await (supabase
        .from('jovens')
        .select('nome_completo, nome_social, idade, bairro, equipamento_id, equipamentos(nome)')
        .eq('id', jovem_id)
        .single()) as { data: { nome_completo: string; nome_social: string | null; idade: number | null; bairro: string | null; equipamento_id: string | null; equipamentos: { nome: string } | { nome: string }[] | null } | null; error: unknown };

      if (jovemError || !jovem) {
        return NextResponse.json({ error: 'Jovem não encontrado.' }, { status: 404 });
      }

      // Validação de isolamento: Técnico de campo só pode gerar relatórios de jovens do seu equipamento
      if (tecnico.cargo !== 'admin') {
        if (!tecnico.equipamento_id || jovem.equipamento_id !== tecnico.equipamento_id) {
          return NextResponse.json({ error: 'Acesso negado. O jovem não está vinculado a sua unidade de referência.' }, { status: 403 });
        }
      }

      const eq = jovem.equipamentos as unknown as { nome: string } | { nome: string }[] | null;
      const eqNome = Array.isArray(eq) ? (eq[0]?.nome || '') : (eq?.nome || '');
      const nomeParaRelatorio = jovem.nome_social || jovem.nome_completo;

      let queryAcompanhamentos: ReturnType<typeof supabase.from> = (supabase
        .from('acompanhamentos') as any)
        .select('data_registro, assiduidade, desempenho, comportamento, resumo')
        .eq('jovem_id', jovem_id)
        .order('data_registro', { ascending: true });

      const { data: acompanhamentos, error: acError } = await queryAcompanhamentos;

      if (acError) {
        return NextResponse.json({ error: 'Erro ao buscar acompanhamentos.' }, { status: 500 });
      }

      if (!acompanhamentos || acompanhamentos.length === 0) {
        return NextResponse.json({ error: 'Não há acompanhamentos suficientes para gerar um relatório deste jovem.' }, { status: 400 });
      }

      const dadosFormatados = acompanhamentos.map((a: { data_registro: string; assiduidade: string | null; desempenho: string | null; comportamento: string | null; resumo: string | null }) => {
        const data = new Date(a.data_registro).toLocaleDateString('pt-BR');
        return `Data: ${data}
Assiduidade: ${a.assiduidade || 'N/A'}
Desempenho: ${a.desempenho || 'N/A'}
Comportamento: ${a.comportamento || 'N/A'}
Resumo: ${a.resumo || 'N/A'}`;
      }).join('\n\n');

      // [SEC-03] O prompt_livre sanitizado é isolado com delimitadores XML
      // para evitar que o usuário "quebre" o contexto do prompt de sistema.
      const focusSection = promptLivreSanitizado
        ? `\n<user_focus>\nFoco especial solicitado pelo usuário: ${promptLivreSanitizado}\nIncorpore este foco na sua análise.\n</user_focus>`
        : '';

      const promptContext = `
Você é um psicopedagogo analista de dados avançado do Programa Descubra.
O objetivo é gerar um relatório consolidado e inteligente do jovem abaixo com base no histórico de acompanhamentos registrados e em sua região/CEP de residência.

Jovem: ${nomeParaRelatorio} (Equipamento: ${eqNome})
Região/CEP de residência: ${jovem.bairro || 'Não informado'}
Total de registros: ${acompanhamentos.length}

Histórico (cronológico, do mais antigo ao mais atual):
---
${dadosFormatados}
---

Faça uma análise profunda deste histórico e do impacto de sua região de residência (como locomoção, rede de apoio, etc.) nas atividades do programa, e retorne os dados no formato solicitado.
${focusSection}
`;
      const { object: resultado, usage } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: individualSchema,
        prompt: promptContext,
      });

      console.log(
        `[TOKEN USAGE] relatorio-ia Individual | ` +
        `Prompt: ${usage?.inputTokens ?? '?'} | ` +
        `Resposta: ${usage?.outputTokens ?? '?'} | ` +
        `Total: ${usage?.totalTokens ?? '?'} tokens`
      );

      return NextResponse.json({
        success: true,
        dados_jovem: {
          nome: nomeParaRelatorio,
          equipamento: eqNome,
          idade: jovem.idade,
          bairro: jovem.bairro
        },
        relatorio: resultado
      });

    } else {
      // 2. Relatório Geral
      let queryAcompanhamentos: ReturnType<typeof supabase.from> = supabase
        .from('acompanhamentos')
        .select(`
          data_registro, assiduidade, desempenho, comportamento, resumo,
          jovens(nome_social, nome_completo, bairro)
        `);

      if (tecnico.cargo !== 'admin') {
        queryAcompanhamentos = supabase
          .from('acompanhamentos')
          .select(`
            data_registro, assiduidade, desempenho, comportamento, resumo,
            jovens!inner(nome_social, nome_completo, bairro, equipamento_id)
          `)
          .eq('jovens.equipamento_id', tecnico.equipamento_id);
      }

      queryAcompanhamentos = queryAcompanhamentos
        .order('data_registro', { ascending: false })
        .limit(50);

      const { data: acompanhamentos, error: acError } = await queryAcompanhamentos;

      if (acError) {
        return NextResponse.json({ error: 'Erro ao buscar dados gerais do programa.' }, { status: 500 });
      }

      if (!acompanhamentos || acompanhamentos.length === 0) {
        return NextResponse.json({ error: 'Não há acompanhamentos cadastrados no sistema.' }, { status: 400 });
      }

      const dadosFormatados = (acompanhamentos as Array<{ data_registro: string; assiduidade: string | null; desempenho: string | null; comportamento: string | null; resumo: string | null; jovens: { nome_social?: string; nome_completo?: string; bairro?: string } | { nome_social?: string; nome_completo?: string; bairro?: string }[] | null }>).map((a) => {
        const data = new Date(a.data_registro).toLocaleDateString('pt-BR');
        const j = Array.isArray(a.jovens) ? a.jovens[0] : a.jovens;
        const nome = j?.nome_social || j?.nome_completo || 'Anônimo';
        const localidade = j?.bairro || 'Não informada';
        return `Data: ${data} | Jovem: ${nome} | Localidade: ${localidade}
Assid: ${a.assiduidade || '-'} | Desemp: ${a.desempenho || '-'} | Comp: ${a.comportamento || '-'}
Nota: ${a.resumo || '-'}`;
      }).join('\n\n');

      // [SEC-03] O prompt_livre sanitizado é isolado com delimitadores XML
      const focusSection = promptLivreSanitizado
        ? `\n<user_focus>\nFoco especial solicitado pelo usuário: ${promptLivreSanitizado}\nIncorpore este foco na sua análise estratégica global.\n</user_focus>`
        : '';

      const promptContext = `
Você é o gestor estratégico do Programa Descubra.
O objetivo é gerar um painel analítico do cenário atual do programa com base nos **últimos ${acompanhamentos.length} registros** de acompanhamento, fornecendo especial atenção para a distribuição de jovens por bairro e CEP.

Amostra de registros recentes (inclui bairro/CEP de cada jovem):
---
${dadosFormatados}
---

Extraia as tendências principais, pontos de alerta generalizados (sem expor desnecessariamente nomes, mas citando se algo for crítico), uma análise de distribuição geográfica por região/CEP e recomendações institucionais.
${focusSection}
`;

      const { object: resultado, usage } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: geralSchema,
        prompt: promptContext,
      });

      console.log(
        `[TOKEN USAGE] relatorio-ia Geral | ` +
        `Prompt: ${usage?.inputTokens ?? '?'} | ` +
        `Resposta: ${usage?.outputTokens ?? '?'} | ` +
        `Total: ${usage?.totalTokens ?? '?'} tokens`
      );

      return NextResponse.json({
        success: true,
        total_analisado: acompanhamentos.length,
        relatorio: resultado
      });
    }

  } catch (err: unknown) {
    console.error("Erro em /api/relatorio-ia:", err);
    return NextResponse.json(
      { error: 'Erro interno na geração do relatório.' },
      { status: 500 }
    );
  }
}
