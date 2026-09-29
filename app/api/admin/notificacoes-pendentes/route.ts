import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

// Força execução dinâmica para garantir contagens sempre frescas
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/notificacoes-pendentes
 * Retorna as contagens de resgates de prêmios e manifestações de interesse / encaminhamentos pendentes.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    const [resgatesRes, manifestacoesRes] = await Promise.all([
      (supabase.from('resgates_premios') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pendente'),
      (supabase.from('encaminhamentos_vagas') as any)
        .select('id', { count: 'exact', head: true })
        .or('status.eq.Pendente,status.eq.Interesse Manifestado')
    ]);

    const resgatesPendentes = resgatesRes.count || 0;
    const manifestacoesPendentes = manifestacoesRes.count || 0;

    return NextResponse.json({
      resgatesPendentes,
      manifestacoesPendentes,
      totalPendentes: resgatesPendentes + manifestacoesPendentes
    });
  } catch (err: any) {
    console.error('Erro em GET /api/admin/notificacoes-pendentes:', err);
    return NextResponse.json({
      resgatesPendentes: 0,
      manifestacoesPendentes: 0,
      totalPendentes: 0,
      error: err.message
    }, { status: 500 });
  }
}
