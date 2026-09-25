import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getJovemDashboard } from '@/backend/services/jovem.service';

/**
 * GET /api/jovem/dashboard
 * Retorna os dados do painel do jovem autenticado ou conta de demonstração.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const dashboardData = await getJovemDashboard(user?.id);
    return NextResponse.json(dashboardData);
  } catch (err: any) {
    console.error('Erro em GET /api/jovem/dashboard:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao carregar dados do painel do jovem.' },
      { status: 500 }
    );
  }
}
