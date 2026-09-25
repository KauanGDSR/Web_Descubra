'use client';

import { useState, useEffect, useCallback } from 'react';
import type { JovemData } from '@/backend/types';

export function useJovemDashboard() {
  const [jovem, setJovem] = useState<JovemData | null>(null);
  const [vagasCount, setVagasCount] = useState(0);
  const [acompanhamentosCount, setAcompanhamentosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jovem/dashboard');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao carregar dados do jovem');
      }
      const data = await res.json();
      setJovem(data.jovem);
      setVagasCount(data.vagasCount || 0);
      setAcompanhamentosCount(data.acompanhamentosCount || 0);
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    jovem,
    vagasCount,
    acompanhamentosCount,
    loading,
    error,
    refresh: fetchDashboard,
  };
}
