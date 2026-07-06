import { NextResponse, NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@/utils/supabase/server';
import { calcularScoreVulnerabilidade } from '@/lib/vulnerabilidade';

// ── GET: RETORNA A FILA INTELIGENTE DE VULNERABILIDADE ────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    const { data: tecnico, error: tecError } = await supabaseAuth
      .from('tecnicos')
      .select('cargo, equipamento_id')
      .eq('id', user.id)
      .single();

    if (tecError || !tecnico) {
      // Verifica se é uma empresa parceira para dar retorno adequado
      const { data: company } = await supabaseAuth
        .from('empresas_parceiras')
        .select('id')
        .eq('id', user.id)
        .single();
      if (company) {
        return NextResponse.json({ error: 'Acesso negado para empresas.' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Perfil de técnico não encontrado.' }, { status: 403 });
    }

    const supabaseClient = getAdminClient();

    // 1. Busca os jovens cadastrados, aplicando isolamento de equipamento se for técnico
    let queryJovens = supabaseClient
      .from('jovens')
      .select('*, equipamentos(nome)');

    if (tecnico.cargo !== 'admin') {
      if (!tecnico.equipamento_id) {
        return NextResponse.json({ error: 'Técnico sem unidade de referência vinculada.' }, { status: 403 });
      }
      queryJovens = queryJovens.eq('equipamento_id', tecnico.equipamento_id);
    }

    const { data: jovens, error: jovensError } = await queryJovens;

    if (jovensError) {
      console.error('Erro ao buscar jovens:', jovensError);
      return NextResponse.json({ error: 'Erro ao buscar dados dos jovens.' }, { status: 500 });
    }

    // 2. Busca acompanhamentos (limitado aos mais recentes para evitar payload excessivo)
    // [PERF-03] Limita a busca aos últimos 200 acompanhamentos para não exceder memória serverless
    let queryAcompanhamentos = supabaseClient
      .from('acompanhamentos')
      .select('jovem_id, assiduidade, desempenho, comportamento')
      .order('data_registro', { ascending: false })
      .limit(200);

    if (tecnico.cargo !== 'admin') {
      queryAcompanhamentos = supabaseClient
        .from('acompanhamentos')
        .select('jovem_id, assiduidade, desempenho, comportamento, jovens!inner(equipamento_id)')
        .eq('jovens.equipamento_id', tecnico.equipamento_id)
        .order('data_registro', { ascending: false })
        .limit(200);
    }

    const { data: acompanhamentos, error: acError } = await queryAcompanhamentos;

    if (acError) {
      console.error('Erro ao buscar acompanhamentos:', acError);
      return NextResponse.json({ error: 'Erro ao buscar acompanhamentos.' }, { status: 500 });
    }

    // Agrupa acompanhamentos por jovem_id
    const acompanhamentosPorJovem: Record<string, Array<{ assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null }>> = {};
    if (acompanhamentos) {
      (acompanhamentos as Array<{ jovem_id: string; assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null }>).forEach((ac) => {
        if (!acompanhamentosPorJovem[ac.jovem_id]) {
          acompanhamentosPorJovem[ac.jovem_id] = [];
        }
        acompanhamentosPorJovem[ac.jovem_id].push(ac);
      });
    }

    // 3. Processa cada jovem aplicando o Motor de Pontuação de Vulnerabilidade (módulo compartilhado)
    const filaInteligente = (jovens as Array<{ id: string; nome_social?: string | null; nome_completo: string; idade?: number | null; bairro?: string | null; turno_escolar?: string | null; escolaridade?: string | null; tipo_inscricao?: string | null; codigo_acesso?: string | null; fez_pre_aprendizagem?: boolean | null; passou_pre_aprendizagem?: boolean | null; equipamentos?: { nome: string } | { nome: string }[] | null }>).map((jovem) => {
      const acs = acompanhamentosPorJovem[jovem.id] || [];
      const resultadoVulnerabilidade = calcularScoreVulnerabilidade(jovem, acs);

      const eq = jovem.equipamentos;
      const equipamentoNome = Array.isArray(eq)
        ? (eq[0]?.nome || 'Sem equipamento')
        : (eq?.nome || 'Sem equipamento');

      return {
        id: jovem.id,
        nome: jovem.nome_social || jovem.nome_completo,
        nome_completo: jovem.nome_completo,
        nome_social: jovem.nome_social,
        idade: jovem.idade,
        bairro: jovem.bairro,
        turno_escolar: jovem.turno_escolar,
        escolaridade: jovem.escolaridade,
        tipo_inscricao: jovem.tipo_inscricao,
        codigo_acesso: jovem.codigo_acesso,
        equipamento: equipamentoNome,
        score: resultadoVulnerabilidade.score,
        classificacao: resultadoVulnerabilidade.classificacao,
        cor: resultadoVulnerabilidade.cor,
        motivos: resultadoVulnerabilidade.motivos
      };
    });

    // 4. Ordena a fila de forma decrescente pelo score (Maior Vulnerabilidade Primeiro)
    filaInteligente.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      fila: filaInteligente,
      total_jovens: filaInteligente.length,
      atualizado_em: new Date().toISOString()
    });

  } catch (err: unknown) {
    console.error("Erro na API motor-vulnerabilidade:", err);
    return NextResponse.json(
      { error: 'Erro interno ao processar a fila de vulnerabilidade.' },
      { status: 500 }
    );
  }
}
