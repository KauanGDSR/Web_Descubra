'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Referral, ReferralStatus } from '@/backend/types';

export function useCandidatos() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/candidatos');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao carregar candidatos');
      }
      const data = await res.json();
      setReferrals(data);
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (
    referralId: string,
    status: ReferralStatus,
    feedbackEmpresa?: string | null
  ) => {
    const res = await fetch('/api/candidatos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referral_id: referralId,
        status,
        feedback_empresa: feedbackEmpresa,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao atualizar status');
    }

    await fetchReferrals();
  };

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  return {
    referrals,
    loading,
    error,
    refresh: fetchReferrals,
    updateStatus,
  };
}
