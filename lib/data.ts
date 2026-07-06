// Dados iniciais e constantes compartilhadas

export const CITIES = ['Pirapora', 'Buritizeiro', 'Jequitaí'];
export const ROLES = ['Coordenador', 'Assistente Social', 'Psicólogo', 'Psicóloga', 'Pedagogo', 'Técnico de Referência'];
export const UNITS = ['Unidade Central Sede', 'CRAS Centro', 'CRAS Norte', 'CRAS Sul', 'CREAS Sede', 'Sede Administrativa'];
export const INTERESTS = ['Administrativo', 'Comércio', 'Tecnologia', 'Logística', 'Saúde', 'Outros'];
export const INTEREST_EMOJIS: Record<string, string> = {
  Administrativo: '📋', Comércio: '🛒', Tecnologia: '💻',
  Logística: '🚛', Saúde: '🏥', Outros: '➕',
};

export function isFormDirty(data: Record<string, unknown>): boolean {
  return Object.values(data).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== false && v !== 0;
  });
}

export function vulnerClass(v: string) {
  return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
