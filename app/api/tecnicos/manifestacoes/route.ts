import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tecnicos/manifestacoes
 * Retorna todas as manifestações de interesse e encaminhamentos com dados de alunos e empresas.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();

    // Valida se o usuário é técnico ou admin
    const { data: tecnico } = await (adminSupabase.from('tecnicos') as any)
      .select('id, cargo, equipamento_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!tecnico) {
      return NextResponse.json({ error: 'Acesso restrito à equipe técnica e administração.' }, { status: 403 });
    }

    // Busca encaminhamentos com dados completos
    const { data: encaminhamentos, error: queryErr } = await (adminSupabase.from('encaminhamentos_vagas') as any)
      .select(`
        id,
        vaga_id,
        jovem_id,
        tecnico_id,
        status,
        feedback_tecnico,
        feedback_jovem,
        feedback_empresa,
        created_at,
        updated_at,
        jovens:jovem_id (
          id,
          nome_completo,
          nome_social,
          cpf,
          data_nascimento,
          telefone_contato,
          telefone_whatsapp,
          email,
          pontuacao_atual,
          equipamentos:equipamento_id (
            id,
            nome,
            tipo,
            cidades:cidade_id (
              nome
            )
          )
        ),
        vagas_disponiveis:vaga_id (
          id,
          titulo,
          tipo,
          status,
          horario,
          cargo,
          bolsa_auxilio,
          empresas_parceiras:empresa_id (
            id,
            razao_social,
            nome_fantasia,
            cidades:cidade_id (
              nome
            )
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (queryErr) {
      console.error('Erro ao listar manifestações para técnicos:', queryErr);
      return NextResponse.json({ error: 'Falha ao buscar dados de encaminhamentos.' }, { status: 500 });
    }

    return NextResponse.json({
      manifestacoes: encaminhamentos || [],
    });
  } catch (err: any) {
    console.error('Erro em GET /api/tecnicos/manifestacoes:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * PATCH /api/tecnicos/manifestacoes
 * Atualiza o status e parecer técnico de uma manifestação de interesse / encaminhamento.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();

    // Valida se o usuário é técnico ou admin
    const { data: tecnico } = await (adminSupabase.from('tecnicos') as any)
      .select('id, cargo')
      .eq('id', user.id)
      .maybeSingle();

    if (!tecnico) {
      return NextResponse.json({ error: 'Acesso restrito à equipe técnica.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, feedback_tecnico } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e novo status são obrigatórios.' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await (adminSupabase.from('encaminhamentos_vagas') as any)
      .update({
        status,
        feedback_tecnico: feedback_tecnico || null,
        tecnico_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('Erro ao atualizar encaminhamento:', updateErr);
      return NextResponse.json({ error: 'Falha ao atualizar encaminhamento no banco.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Status atualizado com sucesso!',
      encaminhamento: updated,
    });
  } catch (err: any) {
    console.error('Erro em PATCH /api/tecnicos/manifestacoes:', err);
    return NextResponse.json({ error: 'Erro interno ao processar atualização.' }, { status: 500 });
  }
}
