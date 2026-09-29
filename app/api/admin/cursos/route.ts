import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

/**
 * GET /api/admin/cursos
 * Retorna todos os cursos e capacitações para gestão da coordenação/admin.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await (supabase.from('cursos_capacitacoes') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({
          cursos: [],
          tableMissing: true,
          error: "Tabela 'cursos_capacitacoes' ainda não criada no banco."
        });
      }
      throw error;
    }

    return NextResponse.json({ cursos: data || [], tableMissing: false });
  } catch (err: any) {
    console.error('Erro em GET /api/admin/cursos:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar cursos.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/cursos
 * Cadastra um novo curso ou trilha de capacitação.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      titulo,
      parceiro_nome,
      descricao,
      carga_horaria,
      modalidade,
      status,
      link_inscricao,
      ativo,
      empresa_id
    } = body;

    if (!titulo?.trim() || !parceiro_nome?.trim()) {
      return NextResponse.json(
        { error: 'Título do curso e entidade/parceiro são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    const { data, error } = await (supabase.from('cursos_capacitacoes') as any)
      .insert({
        titulo: titulo.trim(),
        parceiro_nome: parceiro_nome.trim(),
        descricao: descricao?.trim() || '',
        carga_horaria: carga_horaria?.trim() || '',
        modalidade: modalidade || 'Presencial',
        status: status || 'Inscrições Abertas',
        link_inscricao: link_inscricao?.trim() || null,
        ativo: ativo ?? true,
        empresa_id: empresa_id || null,
        criado_por: 'admin'
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          { error: "Tabela 'cursos_capacitacoes' ainda não criada no banco. Execute o script SQL no Supabase." },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      mensagem: `Curso "${data.titulo}" cadastrado com sucesso!`,
      curso: data
    });
  } catch (err: any) {
    console.error('Erro em POST /api/admin/cursos:', err);
    return NextResponse.json({ error: err.message || 'Erro ao criar curso.' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cursos
 * Atualiza um curso existente ou altera seu status/visibilidade.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      titulo,
      parceiro_nome,
      descricao,
      carga_horaria,
      modalidade,
      status,
      link_inscricao,
      ativo
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do curso é obrigatório.' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const updatePayload: Record<string, any> = {};

    if (titulo !== undefined) updatePayload.titulo = titulo.trim();
    if (parceiro_nome !== undefined) updatePayload.parceiro_nome = parceiro_nome.trim();
    if (descricao !== undefined) updatePayload.descricao = descricao.trim();
    if (carga_horaria !== undefined) updatePayload.carga_horaria = carga_horaria.trim();
    if (modalidade !== undefined) updatePayload.modalidade = modalidade;
    if (status !== undefined) updatePayload.status = status;
    if (link_inscricao !== undefined) updatePayload.link_inscricao = link_inscricao ? link_inscricao.trim() : null;
    if (ativo !== undefined) updatePayload.ativo = Boolean(ativo);

    const { data, error } = await (supabase.from('cursos_capacitacoes') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Curso atualizado com sucesso!',
      curso: data
    });
  } catch (err: any) {
    console.error('Erro em PUT /api/admin/cursos:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar curso.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cursos
 * Remove um curso do sistema.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do curso é obrigatório.' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { error } = await (supabase.from('cursos_capacitacoes') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Curso removido com sucesso!'
    });
  } catch (err: any) {
    console.error('Erro em DELETE /api/admin/cursos:', err);
    return NextResponse.json({ error: err.message || 'Erro ao excluir curso.' }, { status: 500 });
  }
}
