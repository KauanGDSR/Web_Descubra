import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getVacanciesByCompany,
  createVacancy,
  updateVacancyByCompany,
} from '@/backend/services/vagas.service';
import { vagaSchema } from '@/backend/lib/schemas';

/**
 * GET /api/empresa/vagas
 * Lista todas as vagas da empresa parceira autenticada.
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

    const vacancies = await getVacanciesByCompany(user.id);
    return NextResponse.json(vacancies);
  } catch (err: any) {
    console.error('Erro em GET /api/empresa/vagas:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao buscar vagas.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/empresa/vagas
 * Cria uma nova oportunidade de vaga para a empresa.
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
    const parsed = vagaSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(' | ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const newVacancy = await createVacancy(user.id, parsed.data);
    return NextResponse.json(newVacancy, { status: 201 });
  } catch (err: any) {
    console.error('Erro em POST /api/empresa/vagas:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao cadastrar vaga.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/empresa/vagas
 * Atualiza os dados de uma vaga (com verificação de IDOR).
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da vaga é obrigatório.' }, { status: 400 });
    }

    const updated = await updateVacancyByCompany(user.id, id, updateData);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Erro em PUT /api/empresa/vagas:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao atualizar vaga.' },
      { status: 500 }
    );
  }
}
