export interface Youth {
  id?: string;
  name: string;
  age: number;
  city: string;
  vulner: string;
  interests: string[];
  cpf: string;
  status: string;
}

export interface YouthCandidate {
  id: string;
  nome_completo: string;
  nome_social: string | null;
  idade: number;
  escolaridade: string;
  telefone: string | null;
  whatsapp: string | null;
}

export interface DbYouth {
  id: string;
  nome_completo: string;
  possui_nome_social?: boolean;
  nome_social?: string | null;
  idade: number;
  bairro: string;
  cpf: string | null;
  codigo_acesso: string | null;
  pontuacao_atual: number | null;
  areas_interesse: string[] | null;
  equipamento_id: string | null;
  equipamentos?: {
    nome: string;
    cidades?: {
      nome: string;
    } | null;
  } | null;
  sexo: string | null;
  cor_pele: string | null;
  escolaridade: string;
  turno_escolar?: string | null;
  data_nascimento: string;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  nome_responsavel: string | null;
  grau_parentesco: string | null;
  telefone_responsavel: string | null;
  pessoas_residencia: number | null;
  pessoas_trabalham: number | null;
  recebe_bolsa_familia: boolean | null;
  possui_cadunico: boolean | null;
  esteve_medida_socioeducativa: boolean | null;
  possui_deficiencia: boolean | null;
  deficiencia_qual: string | null;
  possui_acesso_internet: boolean | null;
  possui_computador: boolean | null;
  trabalhou_anteriormente: boolean | null;
  abandonou_escola: boolean | null;
  dificuldades_transporte: boolean | null;
  acompanhamento_psicologico: boolean | null;
}

export interface JovemData {
  id: string;
  nome_completo: string;
  nome_social: string | null;
  bairro: string | null;
  escolaridade: string | null;
  turno_escolar: string | null;
  entidade_formadora: string | null;
  codigo_acesso: string | null;
  pontuacao_atual: number;
  passou_pre_aprendizagem: boolean;
  fez_pre_aprendizagem: boolean;
  areas_interesse: string[] | null;
  equipamentos?: {
    nome: string;
    tipo?: string;
  } | null;
}
