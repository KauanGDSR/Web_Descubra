// Tipos compartilhados do Programa Descubra!

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
  selo?: 'Ouro' | 'Prata' | 'Bronze' | 'Nenhum';
}

export interface Youth {
  name: string;
  age: number;
  city: string;
  vulner: string;
  interests: string[];
  cpf: string;
  status: string;
}

export type DialogType = 'success' | 'warning' | 'danger';
export type AdminTab = 'overview' | 'technician' | 'youth' | 'company';
