import { Suspense } from 'react';
import type { Metadata } from 'next';
import CoursesManagementTab from '@/frontend/components/admin/CoursesManagementTab';

export const metadata: Metadata = {
  title: 'Gestão de Cursos e Capacitações | Programa Descubra',
  description: 'Gerencie o catálogo de turmas e capacitações ofertadas por parceiros e empresas aos alunos do Descubra.',
};

export default function AdminCursosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Carregando catálogo de cursos...</div>}>
      <CoursesManagementTab />
    </Suspense>
  );
}
