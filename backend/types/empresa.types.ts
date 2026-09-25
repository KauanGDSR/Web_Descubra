export type SeloEmpresa = 'Ouro' | 'Prata' | 'Bronze' | 'Nenhum';

export interface Company {
  razao: string;
  fantasia: string;
  cnpj: string;
  cep: string;
  email: string;
  phone: string;
  owner: string;
  status: string;
  pontos_engajamento?: number;
  selo?: SeloEmpresa;
}

export interface DbCompany {
  id: string;
  razao_social: string;
  cnpj: string;
  cidade_id: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  cep: string | null;
  responsavel_nome: string | null;
  telefone: string | null;
  email: string | null;
  cidades?: {
    nome: string;
  } | null;
  selo?: SeloEmpresa;
  pontos_engajamento?: number;
}

export interface CompanyData {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cep: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  responsavel_nome: string | null;
  cidades?: {
    nome: string;
  } | null;
  selo?: SeloEmpresa;
  pontos_engajamento?: number;
}

export interface EmpresaStats {
  totalVagas: number;
  vagasAbertas: number;
  vagasPreenchidas: number;
  totalEncaminhamentos: number;
  encaminhamentosPendentes: number;
  encaminhamentosAprovados: number;
}
