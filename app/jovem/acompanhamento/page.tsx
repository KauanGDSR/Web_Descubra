import { redirect } from 'next/navigation';

/**
 * A aba Meu Progresso foi descontinuada na navegação do aluno para simplificar o painel mobile.
 * Redirecionando para o Mural de Vagas.
 */
export default function AcompanhamentoPage() {
  redirect('/jovem/vagas');
}
