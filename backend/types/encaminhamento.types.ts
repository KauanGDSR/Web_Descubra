import type { YouthCandidate } from './jovem.types';
import type { VacancyTitle } from './vaga.types';

export type ReferralStatus = 'Pendente' | 'Entrevista Agendada' | 'Aprovado' | 'Reprovado';

export interface Referral {
  id: string;
  vaga_id: string;
  jovem_id: string;
  tecnico_id: string | null;
  status: ReferralStatus | string;
  feedback_tecnico: string | null;
  feedback_jovem?: string | null;
  feedback_empresa: string | null;
  created_at: string;
  updated_at: string;
  jovens?: YouthCandidate | null;
  vagas_disponiveis?: VacancyTitle | null;
}
