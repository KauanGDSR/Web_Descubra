import { Suspense } from 'react';
import type { Metadata } from 'next';
import AnalyticsTab from '@/frontend/components/admin/AnalyticsTab';

export const metadata: Metadata = {
  title: 'Análises & Estatísticas | Programa Descubra',
  description: 'Painel de Business Intelligence com métricas, funil de jornada do jovem, empregabilidade e comparativos territoriais.',
};

export default function AnalisesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Carregando painel de análises...</div>}>
      <AnalyticsTab />
    </Suspense>
  );
}
