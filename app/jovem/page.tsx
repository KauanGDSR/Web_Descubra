import { redirect } from 'next/navigation';

/**
 * A aba Visão Geral foi removida da navegação do aluno conforme solicitado.
 * Ao acessar a raiz /jovem (ex: após login), o aluno é direcionado diretamente para o Mural de Vagas.
 */
export default function JovemPage() {
  redirect('/jovem/vagas');
}
