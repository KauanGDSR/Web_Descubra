export interface Technician {
  name: string;
  role: string;
  city: string;
  unit: string;
  cpf: string;
  email: string;
  phone: string;
  status: string;
}

export interface DbTechnician {
  id: string;
  nome: string;
  telefone_whatsapp: string;
  cargo: string;
  equipamento_id: string | null;
  telegram_id: string | null;
  equipamentos?: {
    nome: string;
    cidade_id: string | null;
    cidades?: {
      nome: string;
    };
  } | null;
}

export interface Equipment {
  id: string;
  nome: string;
  tipo?: string;
  cidade_id: string | null;
  cidades?: {
    nome: string;
  } | null;
}

export interface City {
  id: string;
  nome: string;
}

export interface ExtendedUnit {
  id: string;
  nome: string;
  tipo?: string;
  cidade_id: string | null;
  cidades?: {
    id: string;
    nome: string;
  } | null;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
  bairros_atendidos?: string[];
  publico_atendido?: string[];
}
