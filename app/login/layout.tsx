import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acesso ao Portal',
  description: 'Acesse o portal do Programa Descubra para gerenciar contratações, vagas de aprendizagem profissional e cursos em Minas Gerais.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
