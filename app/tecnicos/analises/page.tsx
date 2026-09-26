import { Suspense } from 'react';
import type { Metadata } from 'next';
import AnalyticsTab from '@/frontend/components/admin/AnalyticsTab';

export const metadata: Metadata = {
  title: 'Análises & Estatísticas | Programa Descubra',
  description: 'Painel de métricas da jornada do jovem, taxa de empregabilidade e diagnósticos da rede socioassistencial.',
};

export default function TecnicoAnalisesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Carregando painel de análises...</div>}>
      <AnalyticsTab />
    </Suspense>
  );
}
