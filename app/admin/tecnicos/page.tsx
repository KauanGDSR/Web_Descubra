import type { Metadata } from 'next';
import TechnicianTab from '@/components/admin/TechnicianTab';

export const metadata: Metadata = {
  title: 'Cadastro de Técnicos',
  description: 'Gerencie os técnicos de referência do Programa Descubra.',
};

export default function TechnicosPage() {
  return <TechnicianTab />;
}
