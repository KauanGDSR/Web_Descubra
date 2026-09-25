import type { Metadata } from 'next';
import CompanyTab from '@/frontend/components/admin/CompanyTab';

export const metadata: Metadata = {
  title: 'Cadastro de Empresas',
  description: 'Gerencie as empresas parceiras do DescubraHub.',
};

export default function EmpresasPage() {
  return <CompanyTab />;
}
