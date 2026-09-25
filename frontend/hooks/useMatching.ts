'use client';

import { useState } from 'react';

export function useMatching() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const matchVaga = async (vagaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/matching-vagas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaga_id: vagaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar matching da vaga.');
      }
      setResult(data);
      return data;
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const matchJovem = async (jovemId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/matching-vagas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jovem_id: jovemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar matching do jovem.');
      }
      setResult(data);
      return data;
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    result,
    matchVaga,
    matchJovem,
    clearResult: () => setResult(null),
  };
}
