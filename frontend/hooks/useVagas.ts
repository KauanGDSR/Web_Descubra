'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Vacancy } from '@/backend/types';

export function useVagas() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/empresa/vagas');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao buscar vagas');
      }
      const data = await res.json();
      setVacancies(data || []);
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveVacancy = async (payload: { id?: string | null; [key: string]: any }) => {
    const isEdit = Boolean(payload.id);
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch('/api/empresa/vagas', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao salvar vaga');
    }

    await fetchVacancies();
  };

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  return {
    vacancies,
    loading,
    error,
    refresh: fetchVacancies,
    saveVacancy,
  };
}
