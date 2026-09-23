import type { Metadata } from 'next';
import CompanyTab from '@/components/admin/CompanyTab';

export const metadata: Metadata = {
  title: 'Cadastro de Empresas',
  description: 'Gerencie as empresas parceiras do DescubraHub.',
};

export default function EmpresasPage() {
  return <CompanyTab />;
}
