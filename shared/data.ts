
// Dados iniciais e constantes compartilhadas

export const CITIES = ['Pirapora', 'Buritizeiro', 'Jequitaí'];
export const ROLES = ['Coordenador', 'Assistente Social', 'Psicólogo', 'Psicóloga', 'Pedagogo', 'Técnico de Referência'];
export const UNITS = ['Unidade Central Sede', 'CRAS Centro', 'CRAS Norte', 'CRAS Sul', 'CREAS Sede', 'Sede Administrativa'];
export const INTERESTS = ['Administrativo', 'Comércio', 'Tecnologia', 'Logística', 'Saúde', 'Outros'];
export const INTEREST_EMOJIS: Record<string, string> = {
  Administrativo: '📋', Comércio: '🛒', Tecnologia: '💻',
  Logística: '🚛', Saúde: '🏥', Outros: '➕',
};

export const BAIRROS_POR_CIDADE: Record<string, string[]> = {
  pirapora: [
    'Bom Jesus',
    'Centro',
    'Cidade Jardim',
    'Cinquentenário',
    'Cícero Passos',
    'Industrial',
    'Jardim Primavera',
    'Morada do Sol',
    'Nossa Senhora Aparecida',
    'Nossa Senhora de Fátima',
    'Nova Pirapora',
    'Primavera',
    'Sagrada Família',
    'Santa Mariana',
    'Santa Terezinha',
    'Santo Antônio',
    'Santos Dumont',
    'São Geraldo',
    'São João',
    'Shekinah',
    'Área Rural'
  ],
  buritizeiro: [
    'Alvorada',
    'Bandeirantes',
    'Centro',
    'Cruzeiro',
    'Guimarães',
    'Industrial',
    'Jardim das Palmeiras',
    'Jardim dos Buritis',
    'Minas Novas',
    'Morada do Sol',
    'Novo Horizonte',
    'Planalto',
    'Santa Terezinha',
    'São Francisco',
    'São Geraldo',
    'Área Rural'
  ],
  jequitai: [
    'Boa Esperança',
    'Centro',
    'Novo Horizonte',
    'Santa Rita',
    'São Geraldo',
    'Vila Nova',
    'Área Rural'
  ]
};

export function getBairrosDaCidade(nomeCidade: string): string[] {
  if (!nomeCidade) return [];
  const normalized = nomeCidade
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return BAIRROS_POR_CIDADE[normalized] || [];
}

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
