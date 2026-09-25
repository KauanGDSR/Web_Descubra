import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com service_role para operações de backend.
 * NUNCA expor ao browser — usar apenas em API routes ou scripts de backend.
 *
 * Implementado como Singleton para evitar múltiplas instâncias por requisição
 * em ambiente serverless.
 */
let _adminClientInstance: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (_adminClientInstance) {
    return _adminClientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para operações de backend.'
    );
  }

  _adminClientInstance = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _adminClientInstance;
}

/**
 * Sanitiza um valor NUMÉRICO para uso seguro em filtros PostgREST como `.or()`.
 * Remove qualquer caractere que não seja dígito, garantindo que apenas IDs
 * numéricos (ex: Telegram IDs) sejam interpolados em strings de query.
 *
 * ATENÇÃO: Esta função é específica para valores numéricos.
 * Para UUIDs, use a validação de regex UUID antes da query.
 * Para strings de nome/texto, NÃO interpole diretamente — use métodos tipados do SDK.
 */
export function sanitizeNumericId(value: string): string {
  return value.replace(/\D/g, '').trim();
}
