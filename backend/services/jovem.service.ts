import { getAdminClient } from '@/backend/lib/supabase-admin';
import type { JovemData } from '@/backend/types';

export interface JovemDashboardData {
  jovem: JovemData | null;
  vagasCount: number;
  acompanhamentosCount: number;
}

/**
 * Carrega os dados do dashboard do jovem (perfil, total de oportunidades e histórico de acompanhamento).
 */
export async function getJovemDashboard(userId?: string): Promise<JovemDashboardData> {
  const supabase = getAdminClient();

  let loadedJovem: JovemData | null = null;

  if (userId) {
    const { data } = await supabase
      .from('jovens')
      .select('*, equipamentos(nome, tipo)')
      .eq('id', userId)
      .maybeSingle();

    if (data) loadedJovem = data as unknown as JovemData;
  }

  // Fallback para conta demo ou jovem mais recente cadastrado
  if (!loadedJovem) {
    const { data } = await supabase
      .from('jovens')
      .select('*, equipamentos(nome, tipo)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) loadedJovem = data as unknown as JovemData;
  }

  // 1. Contagem de Vagas Abertas
  const { count: vCount } = await supabase
    .from('vagas_disponiveis')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Aberta');

  // 2. Contagem de Acompanhamentos do Jovem
  let acompanhamentosCount = 0;
  if (loadedJovem?.id) {
    const { count: aCount } = await supabase
      .from('acompanhamentos')
      .select('*', { count: 'exact', head: true })
      .eq('jovem_id', loadedJovem.id);

    if (aCount !== null && aCount > 0) {
      acompanhamentosCount = aCount;
    } else {
      const { count: totalAcomp } = await supabase
        .from('acompanhamentos')
        .select('*', { count: 'exact', head: true });
      acompanhamentosCount = totalAcomp || 0;
    }
  }

  return {
    jovem: loadedJovem,
    vagasCount: vCount || 0,
    acompanhamentosCount,
  };
}
