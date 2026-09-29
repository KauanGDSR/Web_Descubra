import { redirect } from 'next/navigation';

/**
 * A aba Documentos foi descontinuada na área do jovem para simplificar a navegação mobile.
 * Redirecionando para o Mural de Vagas.
 */
export default function DocumentosPage() {
  redirect('/jovem/vagas');
}
