import type { Metadata } from 'next';
import YouthTab from '@/frontend/components/admin/YouthTab';

export const metadata: Metadata = {
  title: 'Cadastro de Jovens',
  description: 'Gerencie os jovens aprendizes cadastrados no DescubraHub.',
};

export default function JovensPage() {
  return <YouthTab />;
}
