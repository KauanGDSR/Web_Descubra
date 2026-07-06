import type { Metadata } from 'next';
import ReferenceUnitTab from '@/components/admin/ReferenceUnitTab';

export const metadata: Metadata = {
  title: 'Cadastro de Unidades de Referência | Programa Descubra',
  description: 'Gerencie os pólos e unidades de referência do Programa Descubra.',
};

export default function UnidadesPage() {
  return <ReferenceUnitTab />;
}
