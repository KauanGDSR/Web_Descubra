import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEmpresaDashboard } from '@/backend/services/empresa.service';

/**
 * GET /api/empresa/dashboard
 * Retorna os dados agregados para o painel da empresa parceira.
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

    const dashboardData = await getEmpresaDashboard(user.id);
    return NextResponse.json(dashboardData);
  } catch (err: any) {
    console.error('Erro em GET /api/empresa/dashboard:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao carregar dados do painel da empresa.' },
      { status: 500 }
    );
  }
}
