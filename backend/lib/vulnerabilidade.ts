/**
 * Motor de Pontuação de Vulnerabilidade Social — Módulo Compartilhado
 *
 * PONTO ÚNICO DE VERDADE: Este arquivo é a única fonte do algoritmo de scoring.
 * Ambas as rotas /api/motor-vulnerabilidade e /api/matching-vagas devem importar daqui.
 * Ao alterar a lógica de negócio, altere APENAS este arquivo.
 */

export interface VulnerabilidadeResultado {
  score: number;
  classificacao: 'Baixo' | 'Médio' | 'Crítico';
  cor: 'green' | 'orange' | 'red';
  motivos: string[];
}

/**
 * Calcula o score de vulnerabilidade social de um jovem com base em seus dados
 * cadastrais e no histórico de acompanhamentos.
 */
export function calcularScoreVulnerabilidade(
  jovem: {
    turno_escolar?: string | null;
    escolaridade?: string | null;
    fez_pre_aprendizagem?: boolean | null;
    passou_pre_aprendizagem?: boolean | null;
    bairro?: string | null;
  },
  acompanhamentos: Array<{
    assiduidade?: string | null;
    desempenho?: string | null;
    comportamento?: string | null;
  }>
): VulnerabilidadeResultado {
  let score = 0;
  const motivos: string[] = [];

  // 1. Frequência Escolar e Turno
  if (jovem.turno_escolar === 'Não estuda') {
    score += 30;
    motivos.push('Evasão Escolar: Não está estudando atualmente (+30 pts)');
  } else if (jovem.turno_escolar === 'Noite') {
    score += 10;
    motivos.push('Estuda no turno da noite (+10 pts)');
  }

  // 2. Escolaridade
  if (jovem.escolaridade === 'Fundamental Incompleto') {
    score += 15;
    motivos.push('Baixa escolaridade: Fundamental Incompleto (+15 pts)');
  } else if (jovem.escolaridade === 'Médio Incompleto') {
    score += 8;
    motivos.push('Ensino Médio Incompleto (+8 pts)');
  }

  // 3. Fatores de Trajetória Educacional
  const fezPre = jovem.fez_pre_aprendizagem || jovem.passou_pre_aprendizagem;
  if (!fezPre) {
    score += 10;
    motivos.push('Ausência de preparação introdutória / pré-aprendizagem (+10 pts)');
  }

  // 4. Vulnerabilidade Territorial
  const bairroNorm = (jovem.bairro || '').toLowerCase();
  if (
    bairroNorm.includes('vila maria') ||
    bairroNorm.includes('dom bosco') ||
    bairroNorm.includes('aparecida') ||
    bairroNorm.includes('sagrada familia')
  ) {
    score += 15;
    motivos.push('Vulnerabilidade Territorial: Residência em região periférica (+15 pts)');
  }

  // 5. Histórico de Acompanhamentos Relatados por IA
  if (acompanhamentos && acompanhamentos.length > 0) {
    let alertasFrequencia = 0;
    let alertasDesempenho = 0;
    let alertasComportamento = 0;

    acompanhamentos.forEach(ac => {
      const assid = (ac.assiduidade || '').toLowerCase();
      const desemp = (ac.desempenho || '').toLowerCase();
      const comp = (ac.comportamento || '').toLowerCase();

      if (
        assid.includes('faltou') ||
        assid.includes('ruim') ||
        assid.includes('ausente') ||
        assid.includes('baixa') ||
        assid.includes('falta')
      ) {
        alertasFrequencia++;
      }
      if (
        desemp.includes('dificuldade') ||
        desemp.includes('ruim') ||
        desemp.includes('baixo')
      ) {
        alertasDesempenho++;
      }
      if (
        comp.includes('agitado') ||
        comp.includes('indisciplinado') ||
        comp.includes('desatento') ||
        comp.includes('ruim')
      ) {
        alertasComportamento++;
      }
    });

    if (alertasFrequencia > 0) {
      const pontos = Math.min(alertasFrequencia * 10, 30);
      score += pontos;
      motivos.push(
        `Frequência Escassa (IA): ${alertasFrequencia} alerta(s) de assiduidade (+${pontos} pts)`
      );
    }
    if (alertasDesempenho > 0) {
      const pontos = Math.min(alertasDesempenho * 8, 24);
      score += pontos;
      motivos.push(
        `Dificuldade de Aprendizado (IA): ${alertasDesempenho} alerta(s) de desempenho (+${pontos} pts)`
      );
    }
    if (alertasComportamento > 0) {
      const pontos = Math.min(alertasComportamento * 8, 24);
      score += pontos;
      motivos.push(
        `Instabilidade de Comportamento (IA): ${alertasComportamento} alerta(s) de comportamento (+${pontos} pts)`
      );
    }
  }

  // Classificação do Risco Social
  let classificacao: VulnerabilidadeResultado['classificacao'] = 'Baixo';
  let cor: VulnerabilidadeResultado['cor'] = 'green';

  if (score >= 60) {
    classificacao = 'Crítico';
    cor = 'red';
  } else if (score >= 30) {
    classificacao = 'Médio';
    cor = 'orange';
  }

  return { score, motivos, classificacao, cor };
}
