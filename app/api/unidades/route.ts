import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

// [SEC-02] Verificação de autorização direta — sem lógica de "self-healing" com
// e-mails hardcoded. O perfil DEVE existir na tabela `tecnicos` com cargo='admin'.
async function checkAdminAuth(): Promise<{ error?: string; status?: number; success?: true }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Não autorizado. Faça login primeiro.', status: 401 };
  }

  const { data: reqAdmin } = await supabase
    .from('tecnicos')
    .select('cargo')
    .eq('id', user.id)
    .single();

  if (!reqAdmin || reqAdmin.cargo !== 'admin') {
    return { error: 'Acesso negado. Apenas administradores podem gerenciar unidades.', status: 403 };
  }

  return { success: true };
}

// POST: Insert a new reference unit (equipamento)
export async function POST(request: Request) {
  try {
    const authCheck = await checkAdminAuth();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { nome, tipo, cidade_id } = await request.json();

    if (!nome) {
      return NextResponse.json({ error: 'O nome da unidade é obrigatório.' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await (admin
      .from('equipamentos') as any)
      .insert({
        nome,
        tipo,
        cidade_id: cidade_id || null
      })
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error('Erro ao inserir unidade no banco:', error);
      return NextResponse.json({ error: 'Erro ao cadastrar a unidade no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (err: unknown) {
    console.error('Erro na rota POST /api/unidades:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// PUT: Update an existing reference unit (equipamento)
export async function PUT(request: Request) {
  try {
    const authCheck = await checkAdminAuth();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id, nome, tipo, cidade_id } = await request.json();

    if (!id || !nome) {
      return NextResponse.json({ error: 'ID e Nome são campos obrigatórios.' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await (admin
      .from('equipamentos') as any)
      .update({
        nome,
        tipo,
        cidade_id: cidade_id || null
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar unidade no banco:', error);
      return NextResponse.json({ error: 'Erro ao atualizar a unidade no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Unidade atualizada com sucesso.' }, { status: 200 });
  } catch (err: unknown) {
    console.error('Erro na rota PUT /api/unidades:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// DELETE: Delete an existing reference unit (equipamento)
export async function DELETE(request: Request) {
  try {
    const authCheck = await checkAdminAuth();
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'O ID da unidade é obrigatório.' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from('equipamentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar unidade no banco:', error);
      return NextResponse.json({ error: 'Erro ao deletar a unidade no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Unidade deletada com sucesso.' }, { status: 200 });
  } catch (err: unknown) {
    console.error('Erro na rota DELETE /api/unidades:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
