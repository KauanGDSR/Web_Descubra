import { getAdminClient } from '@/backend/lib/supabase-admin';
import type { CompanyData, EmpresaStats, Vacancy } from '@/backend/types';

export interface EmpresaDashboardData {
  company: CompanyData;
  vacancies: Vacancy[];
  stats: EmpresaStats;
}

/**
 * Carrega todos os dados do dashboard da empresa (perfil, vagas e métricas calculadas).
 */
export async function getEmpresaDashboard(companyId: string): Promise<EmpresaDashboardData> {
  const supabase = getAdminClient();

  // 1. Perfil da Empresa
  const { data: company, error: companyErr } = await supabase
    .from('empresas_parceiras')
    .select('*, cidades(nome)')
    .eq('id', companyId)
    .single();

  if (companyErr || !company) {
    throw new Error('Empresa não encontrada ou não cadastrada.');
  }

  // 2. Vagas cadastradas pela empresa
  const { data: vacancies, error: vacErr } = await supabase
    .from('vagas_disponiveis')
    .select('*')
    .eq('empresa_id', companyId)
    .order('created_at', { ascending: false });

  if (vacErr) throw vacErr;

  const vList = (vacancies as unknown as Vacancy[]) || [];
  const vacancyIds = vList.map((v) => v.id);

  // 3. Encaminhamentos vinculados às vagas
  let referrals: Array<{ status: string }> = [];
  if (vacancyIds.length > 0) {
    const { data: refsData, error: refsErr } = await supabase
      .from('encaminhamentos_vagas')
      .select('status')
      .in('vaga_id', vacancyIds);

    if (refsErr) throw refsErr;
    referrals = refsData || [];
  }

  // 4. Cálculo de Estatísticas
  const totalVagas = vList.reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);
  const vagasAbertas = vList
    .filter((v) => v.status === 'Aberta')
    .reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);
  const vagasPreenchidas = vList
    .filter((v) => v.status === 'Preenchida')
    .reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);

  const totalEncaminhamentos = referrals.length;
  const encaminhamentosPendentes = referrals.filter(
    (r) => r.status === 'Pendente' || r.status === 'Entrevista Agendada'
  ).length;
  const encaminhamentosAprovados = referrals.filter((r) => r.status === 'Aprovado').length;

  return {
    company: company as unknown as CompanyData,
    vacancies: vList,
    stats: {
      totalVagas,
      vagasAbertas,
      vagasPreenchidas,
      totalEncaminhamentos,
      encaminhamentosPendentes,
      encaminhamentosAprovados,
    },
  };
}
