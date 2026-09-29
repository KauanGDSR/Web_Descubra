import { Suspense } from 'react';
import type { Metadata } from 'next';
import CoursesManagementTab from '@/frontend/components/admin/CoursesManagementTab';

export const metadata: Metadata = {
  title: 'Catálogo de Cursos e Capacitações | Painel do Técnico',
  description: 'Consulte e gerencie capacitações disponíveis para os jovens aprendizes do Programa Descubra.',
};

export default function TecnicoCursosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Carregando catálogo de cursos...</div>}>
      <CoursesManagementTab />
    </Suspense>
  );
}
