// Dados iniciais e constantes compartilhadas

export const CITIES = ['Pirapora', 'Buritizeiro', 'Jequitaí'];
export const ROLES = ['Coordenador', 'Assistente Social', 'Psicólogo', 'Psicóloga', 'Pedagogo', 'Técnico de Referência'];
export const UNITS = ['Unidade Central Sede', 'CRAS Centro', 'CRAS Norte', 'CRAS Sul', 'CREAS Sede', 'Sede Administrativa'];
export const INTERESTS = ['Administrativo', 'Comércio', 'Tecnologia', 'Logística', 'Saúde', 'Outros'];
export const INTEREST_EMOJIS: Record<string, string> = {
  Administrativo: '📋', Comércio: '🛒', Tecnologia: '💻',
  Logística: '🚛', Saúde: '🏥', Outros: '➕',
};

export function isFormDirty(
  current: Record<string, unknown>,
  initial?: Record<string, unknown>
): boolean {
  if (initial) {
    const allKeys = new Set([...Object.keys(current), ...Object.keys(initial)]);
    for (const key of allKeys) {
      const valCurr = current[key];
      const valInit = initial[key];

      if (Array.isArray(valCurr) || Array.isArray(valInit)) {
        const arrCurr = Array.isArray(valCurr) ? valCurr : [];
        const arrInit = Array.isArray(valInit) ? valInit : [];
        if (arrCurr.length !== arrInit.length) return true;
        const sortedCurr = [...arrCurr].map(String).sort();
        const sortedInit = [...arrInit].map(String).sort();
        for (let i = 0; i < sortedCurr.length; i++) {
          if (sortedCurr[i] !== sortedInit[i]) return true;
        }
        continue;
      }

      const normCurr = valCurr === null || valCurr === undefined ? '' : String(valCurr).trim();
      const normInit = valInit === null || valInit === undefined ? '' : String(valInit).trim();
      if (normCurr !== normInit) {
        return true;
      }
    }
    return false;
  }

  return Object.values(current).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== false && v !== 0 && v !== null && v !== undefined;
  });
}

export function vulnerClass(v: string) {
  return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
