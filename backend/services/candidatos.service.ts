import { getAdminClient } from '@/backend/lib/supabase-admin';
import type { Referral, ReferralStatus } from '@/backend/types';

/**
 * Busca todos os encaminhamentos de candidatos para as vagas pertencentes a uma empresa.
 */
export async function getReferralsByCompany(companyId: string): Promise<Referral[]> {
  const supabase = getAdminClient();

  // 1. Busca as vagas da empresa
  const { data: vacancies, error: vacErr } = await (supabase.from('vagas_disponiveis') as any)
    .select('id')
    .eq('empresa_id', companyId);

  if (vacErr) throw vacErr;
  if (!vacancies || vacancies.length === 0) return [];

  const vacancyIds = (vacancies as Array<{ id: string }>).map((v) => v.id);

  // 2. Busca os encaminhamentos para essas vagas
  const { data: referrals, error: refErr } = await (supabase.from('encaminhamentos_vagas') as any)
    .select('*, jovens(*), vagas_disponiveis(titulo)')
    .in('vaga_id', vacancyIds)
    .order('created_at', { ascending: false });

  if (refErr) throw refErr;
  return (referrals as unknown as Referral[]) || [];
}

/**
 * Atualiza o status e feedback de um encaminhamento, com validação de propriedade (IDOR ASVS 6.1).
 */
export async function updateReferralStatusByCompany(
  companyId: string,
  referralId: string,
  status: ReferralStatus,
  feedbackEmpresa?: string | null
): Promise<void> {
  const supabase = getAdminClient();

  // 1. Validação de Propriedade (Prevenção contra IDOR/BOLA)
  const { data: referral, error: refErr } = await (supabase.from('encaminhamentos_vagas') as any)
    .select('id, vaga_id, vagas_disponiveis(empresa_id)')
    .eq('id', referralId)
    .single();

  if (refErr || !referral) {
    throw new Error('Encaminhamento não encontrado');
  }

  const vaga = (referral as any).vagas_disponiveis as { empresa_id?: string } | null;
  if (vaga?.empresa_id !== companyId) {
    throw new Error('Acesso negado: este encaminhamento não pertence a sua empresa');
  }

  // 2. Executa a atualização
  const { error: updateErr } = await (supabase.from('encaminhamentos_vagas') as any)
    .update({
      status,
      feedback_empresa: feedbackEmpresa ? feedbackEmpresa.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', referralId);

  if (updateErr) throw updateErr;
}
