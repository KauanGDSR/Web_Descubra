import { Suspense } from 'react';
import type { Metadata } from 'next';
import PrizeManagementTab from '@/frontend/components/admin/PrizeManagementTab';

export const metadata: Metadata = {
  title: 'Gestão de Prêmios e Resgates | Programa Descubra',
  description: 'Gerencie o catálogo de prêmios ofertados aos alunos e valide as entregas de resgates solicitados.',
};

export default function TecnicoResgatesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Carregando gestão de prêmios...</div>}>
      <PrizeManagementTab />
    </Suspense>
  );
}
