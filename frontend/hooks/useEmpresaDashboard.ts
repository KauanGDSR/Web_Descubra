'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CompanyData, EmpresaStats, Vacancy } from '@/backend/types';

export function useEmpresaDashboard() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [stats, setStats] = useState<EmpresaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/empresa/dashboard');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao carregar painel da empresa');
      }
      const data = await res.json();
      setCompany(data.company);
      setVacancies(data.vacancies || []);
      setStats(data.stats);
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
    company,
    vacancies,
    stats,
    loading,
    error,
    refresh: fetchDashboard,
  };
}
