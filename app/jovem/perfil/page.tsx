import { redirect } from 'next/navigation';

/**
 * O perfil do aluno foi unificado na aba Configurações.
 */
export default function PerfilRedirectPage() {
  redirect('/jovem/configuracoes?tab=perfil');
}
