import type { Metadata } from 'next';
import ReportTab from '@/components/admin/ReportTab';

export const metadata: Metadata = {
  title: 'Relatórios de Acompanhamento e IA',
  description: 'Consulte o histórico de acompanhamentos dos jovens e gere análises inteligentes por IA.',
};

export default function RelatoriosPage() {
  return <ReportTab />;
}
