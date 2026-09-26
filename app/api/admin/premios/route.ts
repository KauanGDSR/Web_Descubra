import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

/**
 * GET /api/admin/premios
 * Retorna todos os prêmios cadastrados no catálogo para gerenciamento do admin/técnico.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await (supabase.from('premios_parceiros') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ premios: data || [] });
  } catch (err: any) {
    console.error('Erro em GET /api/admin/premios:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar prêmios.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/premios
 * Cadastra um novo prêmio no catálogo.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titulo, parceiro_nome, custo_pontos, descricao, ativo } = body;

    if (!titulo || !parceiro_nome || custo_pontos === undefined) {
      return NextResponse.json(
        { error: 'Título, nome do parceiro e custo em pontos são obrigatórios.' },
        { status: 400 }
      );
    }

    const pontos = Number(custo_pontos);
    if (isNaN(pontos) || pontos < 0) {
      return NextResponse.json(
        { error: 'O custo em pontos deve ser um número positivo.' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    const { data, error } = await (supabase.from('premios_parceiros') as any)
      .insert({
        titulo: titulo.trim(),
        parceiro_nome: parceiro_nome.trim(),
        custo_pontos: pontos,
        descricao: descricao?.trim() || '',
        ativo: ativo ?? true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: `Prêmio "${data.titulo}" cadastrado com sucesso!`,
      premio: data
    });
  } catch (err: any) {
    console.error('Erro em POST /api/admin/premios:', err);
    return NextResponse.json({ error: err.message || 'Erro ao criar prêmio.' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/premios
 * Atualiza um prêmio existente ou alterna seu status (ativo/inativo).
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, titulo, parceiro_nome, custo_pontos, descricao, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do prêmio é obrigatório.' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const updatePayload: Record<string, any> = {};

    if (titulo !== undefined) updatePayload.titulo = titulo.trim();
    if (parceiro_nome !== undefined) updatePayload.parceiro_nome = parceiro_nome.trim();
    if (custo_pontos !== undefined) updatePayload.custo_pontos = Number(custo_pontos);
    if (descricao !== undefined) updatePayload.descricao = descricao.trim();
    if (ativo !== undefined) updatePayload.ativo = Boolean(ativo);

    const { data, error } = await (supabase.from('premios_parceiros') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Prêmio atualizado com sucesso!',
      premio: data
    });
  } catch (err: any) {
    console.error('Erro em PUT /api/admin/premios:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar prêmio.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/premios
 * Exclui um prêmio do catálogo.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do prêmio é obrigatório.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verifica se há resgates vinculados
    const { count } = await (supabase.from('resgates_premios') as any)
      .select('*', { count: 'exact', head: true })
      .eq('premio_id', id);

    if (count && count > 0) {
      // Se houver resgates vinculados, desativa em vez de quebrar foreign key
      await (supabase.from('premios_parceiros') as any)
        .update({ ativo: false })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        mensagem: 'Este prêmio possui histórico de resgates e foi desativado do catálogo para novos alunos.',
        desativado: true
      });
    }

    const { error } = await (supabase.from('premios_parceiros') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Prêmio excluído com sucesso!'
    });
  } catch (err: any) {
    console.error('Erro em DELETE /api/admin/premios:', err);
    return NextResponse.json({ error: err.message || 'Erro ao excluir prêmio.' }, { status: 500 });
  }
}
