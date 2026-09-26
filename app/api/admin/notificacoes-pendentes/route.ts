import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

// Força execução dinâmica para garantir contagens sempre frescas
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/notificacoes-pendentes
 * Retorna as contagens de resgates de prêmios e depoimentos de alunos que aguardam aprovação.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    const [resgatesRes, depoimentosRes] = await Promise.all([
      (supabase.from('resgates_premios') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pendente'),
      (supabase.from('depoimentos_alunos') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status_aprovacao', 'Pendente')
    ]);

    const resgatesPendentes = resgatesRes.count || 0;
    const depoimentosPendentes = depoimentosRes.count || 0;

    return NextResponse.json({
      resgatesPendentes,
      depoimentosPendentes,
      totalPendentes: resgatesPendentes + depoimentosPendentes
    });
  } catch (err: any) {
    console.error('Erro em GET /api/admin/notificacoes-pendentes:', err);
    return NextResponse.json({
      resgatesPendentes: 0,
      depoimentosPendentes: 0,
      totalPendentes: 0,
      error: err.message
    }, { status: 500 });
  }
}
