'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface NotificationCounts {
  resgatesPendentes: number;
  depoimentosPendentes: number;
  totalPendentes: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAdminNotificationCounts(): NotificationCounts {
  const [resgatesPendentes, setResgatesPendentes] = useState<number>(0);
  const [depoimentosPendentes, setDepoimentosPendentes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const originalTitleRef = useRef<string>('');

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notificacoes-pendentes', {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setResgatesPendentes(data.resgatesPendentes || 0);
        setDepoimentosPendentes(data.depoimentosPendentes || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar contagens de notificações pendentes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Busca inicial
    fetchCounts();

    // 2. Intervalo de checagem periódica a cada 20 segundos
    const interval = setInterval(fetchCounts, 20000);

    // 3. Atualização ao focar novamente na aba da janela
    const handleFocus = () => {
      fetchCounts();
    };
    window.addEventListener('focus', handleFocus);

    // 4. Ouvinte de evento customizado disparado após aprovação/rejeição ou envio
    const handleCustomUpdate = () => {
      fetchCounts();
    };
    window.addEventListener('update-admin-badges', handleCustomUpdate);

    // 5. Supabase Realtime Channel para reagir instantaneamente a inserções e updates
    const supabase = createClient();
    const channel = supabase
      .channel('sidebar-realtime-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resgates_premios' },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'depoimentos_alunos' },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('update-admin-badges', handleCustomUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchCounts]);

  // Atualização dinâmica do título da aba do navegador: ex "(3) Descubra - Painel do Técnico"
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title.replace(/^\(\d+\)\s*/, '');
    }

    const total = resgatesPendentes + depoimentosPendentes;
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');

    if (total > 0) {
      document.title = `(${total}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    return () => {
      if (originalTitleRef.current && typeof document !== 'undefined') {
        document.title = document.title.replace(/^\(\d+\)\s*/, '');
      }
    };
  }, [resgatesPendentes, depoimentosPendentes]);

  return {
    resgatesPendentes,
    depoimentosPendentes,
    totalPendentes: resgatesPendentes + depoimentosPendentes,
    loading,
    refresh: fetchCounts
  };
}
