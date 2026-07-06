import type { Metadata } from 'next';
import YouthTab from '@/components/admin/YouthTab';

export const metadata: Metadata = {
  title: 'Cadastro de Jovens',
  description: 'Gerencie os jovens aprendizes cadastrados no Programa Descubra.',
};

export default function JovensPage() {
  return <YouthTab />;
}
