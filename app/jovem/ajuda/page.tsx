import { redirect } from 'next/navigation';

/**
 * A central de suporte foi unificada na aba Configurações.
 */
export default function AjudaRedirectPage() {
  redirect('/jovem/configuracoes?tab=suporte');
}
