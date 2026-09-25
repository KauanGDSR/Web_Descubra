import { getAdminClient } from '@/backend/lib/supabase-admin';
import type { Vacancy } from '@/backend/types';

/**
 * Busca vagas cadastradas por uma empresa específica.
 */
export async function getVacanciesByCompany(companyId: string): Promise<Vacancy[]> {
  const supabase = getAdminClient();
  const { data, error } = await (supabase.from('vagas_disponiveis') as any)
    .select('*')
    .eq('empresa_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as Vacancy[]) || [];
}

/**
 * Cria uma nova oportunidade de vaga para a empresa.
 */
export async function createVacancy(
  companyId: string,
  payload: {
    titulo: string;
    descricao: string;
    tipo?: string;
    quantidade_vagas?: number;
    cargo?: string | null;
    horario?: string | null;
    bolsa_auxilio?: number;
    idade_minima?: number;
    escolaridade_exigida?: string | null;
    competencias_desejadas?: string[] | string | null;
  }
): Promise<Vacancy> {
  const supabase = getAdminClient();

  const insertData = {
    ...payload,
    empresa_id: companyId,
    status: 'Aberta',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase.from('vagas_disponiveis') as any)
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Vacancy;
}

/**
 * Atualiza uma vaga existente com validação de propriedade (IDOR ASVS 6.1).
 */
export async function updateVacancyByCompany(
  companyId: string,
  vacancyId: string,
  payload: Partial<Vacancy>
): Promise<Vacancy> {
  const supabase = getAdminClient();

  // Validação de Propriedade
  const { data: existing, error: findErr } = await (supabase.from('vagas_disponiveis') as any)
    .select('empresa_id')
    .eq('id', vacancyId)
    .single();

  if (findErr || !existing) throw new Error('Vaga não encontrada');
  if (existing.empresa_id !== companyId) {
    throw new Error('Acesso negado: a vaga pertence a outra empresa');
  }

  const { data, error } = await (supabase.from('vagas_disponiveis') as any)
    .update(payload)
    .eq('id', vacancyId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Vacancy;
}
