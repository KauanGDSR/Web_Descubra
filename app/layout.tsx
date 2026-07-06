import type { Metadata } from 'next';
import './globals.css';
import { DialogProvider } from '@/components/ui/CustomDialog';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: { default: 'Programa Descubra! - Governo de Minas Gerais', template: '%s | Programa Descubra!' },
  description: 'O Programa Descubra incentiva a aprendizagem profissional e insere adolescentes e jovens de Minas Gerais em situação de vulnerabilidade no mercado de trabalho protegido.',
  keywords: ['Programa Descubra', 'Aprendizagem Profissional', 'Minas Gerais', 'MPMG', 'Inclusão Social', 'Jovens Aprendizes'],
  openGraph: {
    type: 'website',
    url: 'https://programadescubra.mg.gov.br/',
    title: 'Programa Descubra! - Trabalho Protegido para Jovens em Minas Gerais',
    description: 'Iniciativa interinstitucional que insere adolescentes e jovens em vulnerabilidade extrema no mercado de trabalho protegido através da aprendizagem.',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0A2540',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230A2540'/><path d='M35,30 L70,50 L35,70 Z' fill='%23F97316'/></svg>" />
      </head>
      <body>
        <PwaRegister />
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}

