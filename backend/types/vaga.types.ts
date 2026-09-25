export interface Vacancy {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  quantidade_vagas: number;
  cargo: string | null;
  horario: string | null;
  bolsa_auxilio: number;
  idade_minima: number;
  escolaridade_exigida: string | null;
  competencias_desejadas: string[] | string | null;
  created_at: string;
  empresas_parceiras?: {
    razao_social: string;
    nome_fantasia?: string | null;
    selo?: string | null;
  } | null;
}

export interface VacancyFormData {
  titulo: string;
  descricao: string;
  tipo: string;
  quantidade_vagas: number;
  cargo: string;
  horario_inicio: string;
  horario_fim: string;
  bolsa_auxilio: number;
  idade_minima: number;
  escolaridade_exigida: string;
  competencias_desejadas: string;
}

export interface VacancyTitle {
  titulo: string;
}
