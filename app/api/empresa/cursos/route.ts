import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

/**
 * GET /api/empresa/cursos
 * Retorna os cursos e capacitações ofertados pela empresa parceira autenticada.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminDb = getAdminClient();

    // Buscar dados da empresa para obter o nome
    const { data: companyData } = await (adminDb.from('empresas_parceiras') as any)
      .select('id, razao_social, nome_fantasia')
      .eq('id', user.id)
      .maybeSingle();

    const company = companyData as { id: string; razao_social?: string; nome_fantasia?: string } | null;

    const { data: cursos, error: cursosError } = await (adminDb.from('cursos_capacitacoes') as any)
      .select('*')
      .eq('empresa_id', user.id)
      .order('created_at', { ascending: false });

    if (cursosError) {
      if (cursosError.code === 'PGRST205' || cursosError.message?.includes('schema cache')) {
        return NextResponse.json({
          cursos: [],
          companyName: company?.nome_fantasia || company?.razao_social || 'Empresa Parceira',
          tableMissing: true,
          error: "Tabela 'cursos_capacitacoes' ainda não criada no banco."
        });
      }
      throw cursosError;
    }

    return NextResponse.json({
      cursos: cursos || [],
      companyName: company?.nome_fantasia || company?.razao_social || 'Empresa Parceira',
      tableMissing: false
    });
  } catch (err: any) {
    console.error('Erro em GET /api/empresa/cursos:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao buscar cursos.' }, { status: 500 });
  }
}

/**
 * POST /api/empresa/cursos
 * Cria uma nova oficina ou curso de capacitação ofertado pela empresa.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      titulo,
      descricao,
      carga_horaria,
      modalidade,
      status,
      link_inscricao
    } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ error: 'O título do curso/capacitação é obrigatório.' }, { status: 400 });
    }

    const adminDb = getAdminClient();

    // Obter nome da empresa
    const { data: companyData } = await (adminDb.from('empresas_parceiras') as any)
      .select('id, razao_social, nome_fantasia')
      .eq('id', user.id)
      .maybeSingle();

    const company = companyData as { id: string; razao_social?: string; nome_fantasia?: string } | null;
    const parceiroNome = company?.nome_fantasia || company?.razao_social || 'Empresa Parceira';

    const { data, error } = await (adminDb.from('cursos_capacitacoes') as any)
      .insert({
        titulo: titulo.trim(),
        parceiro_nome: parceiroNome,
        descricao: descricao?.trim() || '',
        carga_horaria: carga_horaria?.trim() || '',
        modalidade: modalidade || 'Presencial',
        status: status || 'Inscrições Abertas',
        link_inscricao: link_inscricao?.trim() || null,
        empresa_id: user.id,
        ativo: true,
        criado_por: 'empresa'
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          { error: "Tabela 'cursos_capacitacoes' ainda não criada no banco." },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      mensagem: `Capacitação "${data.titulo}" cadastrada com sucesso!`,
      curso: data
    });
  } catch (err: any) {
    console.error('Erro em POST /api/empresa/cursos:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao criar curso.' }, { status: 500 });
  }
}

/**
 * PUT /api/empresa/cursos
 * Atualiza um curso da própria empresa (IDOR protected).
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, titulo, descricao, carga_horaria, modalidade, status, link_inscricao, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do curso é obrigatório.' }, { status: 400 });
    }

    const adminDb = getAdminClient();
    const updatePayload: Record<string, any> = {};

    if (titulo !== undefined) updatePayload.titulo = titulo.trim();
    if (descricao !== undefined) updatePayload.descricao = descricao.trim();
    if (carga_horaria !== undefined) updatePayload.carga_horaria = carga_horaria.trim();
    if (modalidade !== undefined) updatePayload.modalidade = modalidade;
    if (status !== undefined) updatePayload.status = status;
    if (link_inscricao !== undefined) updatePayload.link_inscricao = link_inscricao ? link_inscricao.trim() : null;
    if (ativo !== undefined) updatePayload.ativo = Boolean(ativo);

    const { data, error } = await (adminDb.from('cursos_capacitacoes') as any)
      .update(updatePayload)
      .eq('id', id)
      .eq('empresa_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Capacitação atualizada com sucesso!',
      curso: data
    });
  } catch (err: any) {
    console.error('Erro em PUT /api/empresa/cursos:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar curso.' }, { status: 500 });
  }
}

/**
 * DELETE /api/empresa/cursos
 * Remove um curso da própria empresa (IDOR protected).
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do curso é obrigatório.' }, { status: 400 });
    }

    const adminDb = getAdminClient();
    const { error } = await (adminDb.from('cursos_capacitacoes') as any)
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Capacitação excluída com sucesso!'
    });
  } catch (err: any) {
    console.error('Erro em DELETE /api/empresa/cursos:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir curso.' }, { status: 500 });
  }
}
