import { Suspense } from 'react';
import type { Metadata } from 'next';
import ReportTab from '@/frontend/components/admin/ReportTab';

export const metadata: Metadata = {
  title: 'Relatórios de Acompanhamento e IA',
  description: 'Consulte o histórico de acompanhamentos dos jovens e gere análises inteligentes por IA.',
};

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Carregando relatórios...</div>}>
      <ReportTab />
    </Suspense>
  );
}
