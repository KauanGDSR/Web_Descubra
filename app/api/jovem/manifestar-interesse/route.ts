import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

// Força execução dinâmica
export const dynamic = 'force-dynamic';

/**
 * GET /api/jovem/manifestar-interesse
 * Retorna os IDs das vagas nas quais o jovem logado já manifestou interesse ou foi encaminhado.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      );
    }

    const adminSupabase = getAdminClient();
    const { data, error } = await (adminSupabase.from('encaminhamentos_vagas') as any)
      .select('id, vaga_id, status, created_at')
      .eq('jovem_id', user.id);

    if (error) {
      console.error('Erro ao buscar manifestações do jovem:', error);
      return NextResponse.json({ error: 'Erro ao consultar manifestações.' }, { status: 500 });
    }

    return NextResponse.json({
      manifestacoes: data || [],
    });
  } catch (err: any) {
    console.error('Erro inesperado em GET /api/jovem/manifestar-interesse:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * POST /api/jovem/manifestar-interesse
 * Registra a manifestação de interesse do aluno em uma vaga específica.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para manifestar interesse.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vagaId } = body;

    if (!vagaId) {
      return NextResponse.json({ error: 'ID da vaga é obrigatório.' }, { status: 400 });
    }

    const adminSupabase = getAdminClient();

    // 1. Verifica se a vaga existe e está aberta
    const { data: vaga, error: vagaErr } = await (adminSupabase.from('vagas_disponiveis') as any)
      .select('id, titulo, status')
      .eq('id', vagaId)
      .single();

    if (vagaErr || !vaga) {
      return NextResponse.json({ error: 'Vaga não encontrada ou indisponível.' }, { status: 404 });
    }

    // 2. Verifica se o jovem já manifestou interesse nesta mesma vaga
    const { data: existente } = await (adminSupabase.from('encaminhamentos_vagas') as any)
      .select('id, status')
      .eq('vaga_id', vagaId)
      .eq('jovem_id', user.id)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({
        alreadyRegistered: true,
        message: 'Você já manifestou interesse nesta oportunidade.',
        status: (existente as any).status
      });
    }

    // 3. Busca o técnico responsável pela unidade do jovem (se houver)
    const { data: jovem } = await (adminSupabase.from('jovens') as any)
      .select('id, equipamento_id, nome_completo, nome_social')
      .eq('id', user.id)
      .single();

    let tecnicoId = null;
    if (jovem?.equipamento_id) {
      const { data: tecnico } = await (adminSupabase.from('tecnicos') as any)
        .select('id')
        .eq('equipamento_id', jovem.equipamento_id)
        .limit(1)
        .maybeSingle();
      if (tecnico) tecnicoId = tecnico.id;
    }

    // 4. Insere o encaminhamento com status 'Interesse Manifestado'
    const { data: novoEncaminhamento, error: insertErr } = await (adminSupabase.from('encaminhamentos_vagas') as any)
      .insert({
        vaga_id: vagaId,
        jovem_id: user.id,
        tecnico_id: tecnicoId,
        status: 'Interesse Manifestado',
        feedback_jovem: 'Interesse manifestado pelo jovem através do portal DescubraHub.',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Erro ao registrar manifestação de interesse:', insertErr);
      return NextResponse.json({ error: 'Falha ao registrar manifestação de interesse.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Interesse manifestado com sucesso! A equipe técnica do seu equipamento avaliará seu perfil para o encaminhamento.',
      encaminhamento: novoEncaminhamento
    });

  } catch (err: any) {
    console.error('Erro inesperado em POST /api/jovem/manifestar-interesse:', err);
    return NextResponse.json({ error: 'Erro interno ao processar requisição.' }, { status: 500 });
  }
}
