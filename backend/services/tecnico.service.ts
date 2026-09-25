import { getAdminClient } from '@/backend/lib/supabase-admin';
import type { DbTechnician, Equipment, City } from '@/backend/types';

/**
 * Busca o perfil de um técnico de referência pelo seu ID de autenticação.
 */
export async function getTechnicianProfile(userId: string): Promise<DbTechnician | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('tecnicos_referencia')
    .select('*, equipamentos(nome, cidade_id, cidades(nome))')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DbTechnician | null;
}

/**
 * Lista todos os técnicos cadastrados no sistema.
 */
export async function listTechnicians(): Promise<DbTechnician[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('tecnicos_referencia')
    .select('*, equipamentos(nome, cidade_id, cidades(nome))')
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbTechnician[]) || [];
}

/**
 * Lista todos os equipamentos socioassistenciais cadastrados (CRAS/CREAS/etc).
 */
export async function listEquipments(): Promise<Equipment[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('equipamentos')
    .select('id, nome, tipo, cidade_id, cidades(nome)')
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data as unknown as Equipment[]) || [];
}

/**
 * Lista todas as cidades cadastradas.
 */
export async function listCities(): Promise<City[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('cidades')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data as unknown as City[]) || [];
}
