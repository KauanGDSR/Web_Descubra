'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Award,
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Calendar,
  Printer,
  Sparkles,
  ChevronRight,
  PieChart,
  BarChart3,
  Percent,
  ShieldAlert,
  DollarSign,
  Layers,
  ArrowUpRight,
  BookOpen,
  HeartHandshake
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { calcularScoreVulnerabilidade } from '@/backend/lib/vulnerabilidade';

export default function AnalyticsTab() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);

  // Raw Database Data
  const [jovens, setJovens] = useState<any[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<any[]>([]);
  const [encaminhamentos, setEncaminhamentos] = useState<any[]>([]);
  const [vagas, setVagas] = useState<any[]>([]);
  const [cidades, setCidades] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'jornada' | 'ocupacao' | 'demografico' | 'vulnerabilidade' | 'territorial'>('jornada');

  // Filters
  const [filtroCidade, setFiltroCidade] = useState('Todas');
  const [filtroEquipamento, setFiltroEquipamento] = useState('Todos');
  const [filtroFaixaEtaria, setFiltroFaixaEtaria] = useState('Todas');
  const [filtroTrabalho, setFiltroTrabalho] = useState('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');

  const isMounted = useRef(true);

  // Carrega dados integrados
  const loadData = async () => {
    setLoading(true);
    try {
      const [
        jovensRes,
        acompanhamentosRes,
        encaminhamentosRes,
        vagasRes,
        cidadesRes,
        equipamentosRes
      ] = await Promise.all([
        supabase.from('jovens').select('*, equipamentos(id, nome, cidade_id, cidades(id, nome))').order('created_at', { ascending: false }),
        supabase.from('acompanhamentos').select('id, jovem_id, assiduidade, desempenho, comportamento, data_registro'),
        supabase.from('encaminhamentos_vagas').select('*, vagas_disponiveis(id, titulo, tipo, empresas_parceiras(razao_social))'),
        supabase.from('vagas_disponiveis').select('*'),
        supabase.from('cidades').select('*').order('nome'),
        supabase.from('equipamentos').select('*, cidades(id, nome)').order('nome')
      ]);

      if (isMounted.current) {
        setJovens(jovensRes.data || []);
        setAcompanhamentos(acompanhamentosRes.data || []);
        setEncaminhamentos(encaminhamentosRes.data || []);
        setVagas(vagasRes.data || []);
        setCidades(cidadesRes.data || []);
        setEquipamentos(equipamentosRes.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de estatísticas:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Mapeamento de acompanhamentos por jovem
  const acsPorJovem = useMemo(() => {
    const map: Record<string, any[]> = {};
    acompanhamentos.forEach((ac) => {
      if (!map[ac.jovem_id]) map[ac.jovem_id] = [];
      map[ac.jovem_id].push(ac);
    });
    return map;
  }, [acompanhamentos]);

  // Mapeamento de encaminhamentos por jovem
  const encsPorJovem = useMemo(() => {
    const map: Record<string, any[]> = {};
    encaminhamentos.forEach((enc) => {
      if (!map[enc.jovem_id]) map[enc.jovem_id] = [];
      map[enc.jovem_id].push(enc);
    });
    return map;
  }, [encaminhamentos]);

  // Enriquecimento e cálculo de cada jovem
  const jovensProcessados = useMemo(() => {
    return jovens.map((j) => {
      const acs = acsPorJovem[j.id] || [];
      const encs = encsPorJovem[j.id] || [];
      const vuln = calcularScoreVulnerabilidade(j, acs);

      // Determinar se o jovem trabalha atualmente ou já foi contratado
      const temContrato = encs.some((e) => ['Aprovado', 'Contratado'].includes(e.status)) || j.passou_pela_aprendizagem;
      const trabalhaOuTrabalhou = j.trabalhou_anteriormente === true || temContrato;
      const emProcessoSeletivo = encs.some((e) => ['Pendente', 'Entrevista Agendada'].includes(e.status));
      const concluiuPreAprendizagem = j.fez_pre_aprendizagem || j.passou_pre_aprendizagem;

      // Calcular tempo entre cadastro e primeiro encaminhamento/hoje
      const dataCriacao = new Date(j.created_at);
      let dataDestino = new Date();
      if (encs.length > 0) {
        const primeiroEnc = encs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
        dataDestino = new Date(primeiroEnc.created_at);
      }
      const diasNoPrograma = Math.max(1, Math.round((dataDestino.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24)));

      const cidadeNome = j.equipamentos?.cidades?.nome || 'Não informada';
      const equipamentoNome = j.equipamentos?.nome || 'Sem unidade';

      return {
        ...j,
        score: vuln.score,
        classificacaoRisco: vuln.classificacao,
        motivosRisco: vuln.motivos,
        totalAcompanhamentos: acs.length,
        totalEncaminhamentos: encs.length,
        temContrato,
        trabalhaOuTrabalhou,
        emProcessoSeletivo,
        concluiuPreAprendizagem,
        diasNoPrograma,
        cidadeNome,
        equipamentoNome
      };
    });
  }, [jovens, acsPorJovem, encsPorJovem]);

  // Jovens filtrados
  const jovensFiltrados = useMemo(() => {
    return jovensProcessados.filter((j) => {
      // Filtro Cidade
      if (filtroCidade !== 'Todas' && j.cidadeNome !== filtroCidade) return false;

      // Filtro Equipamento
      if (filtroEquipamento !== 'Todos' && j.equipamentoNome !== filtroEquipamento) return false;

      // Filtro Faixa Etária
      if (filtroFaixaEtaria === '11-13' && !(j.idade >= 11 && j.idade <= 13)) return false;
      if (filtroFaixaEtaria === '14-17' && !(j.idade >= 14 && j.idade <= 17)) return false;
      if (filtroFaixaEtaria === '18-24' && !(j.idade >= 18 && j.idade <= 24)) return false;

      // Filtro Trabalho
      if (filtroTrabalho === 'trabalha' && !j.trabalhaOuTrabalhou) return false;
      if (filtroTrabalho === 'nao_trabalha' && j.trabalhaOuTrabalhou) return false;
      if (filtroTrabalho === 'contratado_programa' && !j.temContrato) return false;

      // Filtro Período
      if (filtroPeriodo !== 'Todos') {
        const diasAtras = (Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (filtroPeriodo === '30' && diasAtras > 30) return false;
        if (filtroPeriodo === '90' && diasAtras > 90) return false;
        if (filtroPeriodo === 'ano' && new Date(j.created_at).getFullYear() !== new Date().getFullYear()) return false;
      }

      return true;
    });
  }, [jovensProcessados, filtroCidade, filtroEquipamento, filtroFaixaEtaria, filtroTrabalho, filtroPeriodo]);

  // ==========================================
  // ESTATÍSTICAS E INDICADORES CALCULADOS
  // ==========================================
  const kpis = useMemo(() => {
    const total = jovensFiltrados.length;
    if (total === 0) {
      return {
        total: 0,
        trabalham: 0,
        taxaTrabalho: 0,
        nuncaTrabalharam: 0,
        contratadosDescubra: 0,
        emProcessoSeletivo: 0,
        capacitadosPre: 0,
        taxaCapacitacao: 0,
        tempoMedioDias: 0,
        riscoCritico: 0,
        riscoMedio: 0,
        riscoBaixo: 0,
        evasaoEscolar: 0,
        semComputador: 0,
        beneficiariosBolsa: 0,
        dificuldadeTransporte: 0
      };
    }

    const trabalham = jovensFiltrados.filter((j) => j.trabalhaOuTrabalhou).length;
    const nuncaTrabalharam = total - trabalham;
    const contratadosDescubra = jovensFiltrados.filter((j) => j.temContrato).length;
    const emProcessoSeletivo = jovensFiltrados.filter((j) => j.emProcessoSeletivo).length;
    const capacitadosPre = jovensFiltrados.filter((j) => j.concluiuPreAprendizagem).length;
    const tempoMedioDias = Math.round(jovensFiltrados.reduce((acc, j) => acc + j.diasNoPrograma, 0) / total);

    const riscoCritico = jovensFiltrados.filter((j) => j.score >= 60).length;
    const riscoMedio = jovensFiltrados.filter((j) => j.score >= 30 && j.score < 60).length;
    const riscoBaixo = jovensFiltrados.filter((j) => j.score < 30).length;

    const evasaoEscolar = jovensFiltrados.filter((j) => j.turno_escolar === 'Não estuda' || j.abandonou_escola === 'Sim').length;
    const semComputador = jovensFiltrados.filter((j) => j.possui_computador === 'Não').length;
    const beneficiariosBolsa = jovensFiltrados.filter((j) => j.recebe_bolsa_familia === 'Sim' || j.possui_cadunico === 'Sim').length;
    const dificuldadeTransporte = jovensFiltrados.filter((j) => j.dificuldades_transporte === 'Sim').length;

    return {
      total,
      trabalham,
      taxaTrabalho: Math.round((trabalham / total) * 100),
      nuncaTrabalharam,
      contratadosDescubra,
      emProcessoSeletivo,
      capacitadosPre,
      taxaCapacitacao: Math.round((capacitadosPre / total) * 100),
      tempoMedioDias,
      riscoCritico,
      riscoMedio,
      riscoBaixo,
      evasaoEscolar,
      semComputador,
      beneficiariosBolsa,
      dificuldadeTransporte
    };
  }, [jovensFiltrados]);

  // Distribuição por Faixa Etária
  const faixasEtarias = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    const f1 = jovensFiltrados.filter((j) => j.idade >= 11 && j.idade <= 13).length;
    const f2 = jovensFiltrados.filter((j) => j.idade >= 14 && j.idade <= 17).length;
    const f3 = jovensFiltrados.filter((j) => j.idade >= 18 && j.idade <= 24).length;
    return [
      { label: '11 a 13 anos (Formação Prévia)', count: f1, pct: Math.round((f1 / total) * 100), color: '#38bdf8' },
      { label: '14 a 17 anos (Aprendizagem Prioritária)', count: f2, pct: Math.round((f2 / total) * 100), color: '#10b981' },
      { label: '18 a 24 anos (Jovem Aprendiz & Emprego)', count: f3, pct: Math.round((f3 / total) * 100), color: '#f59e0b' }
    ];
  }, [jovensFiltrados]);

  // Distribuição por Turno Escolar
  const turnosEscolares = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    const counts: Record<string, number> = {
      Manhã: 0,
      Tarde: 0,
      Noite: 0,
      Integral: 0,
      'Não estuda': 0
    };

    jovensFiltrados.forEach((j) => {
      const t = j.turno_escolar || 'Não estuda';
      if (counts[t] !== undefined) counts[t]++;
      else counts['Não estuda']++;
    });

    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [jovensFiltrados]);

  // Distribuição por Escolaridade
  const escolaridades = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    const counts: Record<string, number> = {};
    jovensFiltrados.forEach((j) => {
      const e = j.escolaridade || 'Não informada';
      counts[e] = (counts[e] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [jovensFiltrados]);

  // Distribuição por Gênero
  const generos = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    const counts: Record<string, number> = { Feminino: 0, Masculino: 0, Outro: 0 };
    jovensFiltrados.forEach((j) => {
      const g = j.sexo || 'Outro';
      if (counts[g] !== undefined) counts[g]++;
      else counts['Outro']++;
    });
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [jovensFiltrados]);

  // Distribuição por Raça / Cor
  const racas = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    const counts: Record<string, number> = {};
    jovensFiltrados.forEach((j) => {
      const r = j.cor_pele || 'Não informada';
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [jovensFiltrados]);

  // Distribuição por Cidade
  const cidadesStats = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    const counts: Record<string, number> = {};
    jovensFiltrados.forEach((j) => {
      const c = j.cidadeNome;
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([cidade, count]) => ({
      cidade,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [jovensFiltrados]);

  // Desempenho por Equipamento (CRAS/CREAS)
  const equipamentosStats = useMemo(() => {
    const map: Record<string, { nome: string; cidade: string; total: number; trabalham: number; encaminhados: number; acsCount: number }> = {};

    jovensFiltrados.forEach((j) => {
      const eq = j.equipamentoNome;
      if (!map[eq]) {
        map[eq] = {
          nome: eq,
          cidade: j.cidadeNome,
          total: 0,
          trabalham: 0,
          encaminhados: 0,
          acsCount: 0
        };
      }
      map[eq].total++;
      if (j.trabalhaOuTrabalhou) map[eq].trabalham++;
      if (j.totalEncaminhamentos > 0) map[eq].encaminhados++;
      map[eq].acsCount += j.totalAcompanhamentos;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [jovensFiltrados]);

  // Fatores de Vulnerabilidade Mapeados
  const fatoresVulnerabilidade = useMemo(() => {
    const total = jovensFiltrados.length || 1;
    return [
      {
        titulo: 'Evasão Escolar ou Não Estuda',
        count: kpis.evasaoEscolar,
        pct: Math.round((kpis.evasaoEscolar / total) * 100),
        severidade: 'alta'
      },
      {
        titulo: 'Sem Computador em Casa',
        count: kpis.semComputador,
        pct: Math.round((kpis.semComputador / total) * 100),
        severidade: 'alta'
      },
      {
        titulo: 'Beneficiários de Programas Sociais (Bolsa Família / CadÚnico)',
        count: kpis.beneficiariosBolsa,
        pct: Math.round((kpis.beneficiariosBolsa / total) * 100),
        severidade: 'media'
      },
      {
        titulo: 'Dificuldades de Transporte até o Polo ou Trabalho',
        count: kpis.dificuldadeTransporte,
        pct: Math.round((kpis.dificuldadeTransporte / total) * 100),
        severidade: 'media'
      },
      {
        titulo: 'Já Trabalhou Precocemente / Informal',
        count: jovensFiltrados.filter((j) => j.trabalhou_anteriormente === true).length,
        pct: Math.round((jovensFiltrados.filter((j) => j.trabalhou_anteriormente === true).length / total) * 100),
        severidade: 'media'
      }
    ];
  }, [jovensFiltrados, kpis]);

  // Etapas do Funil da Jornada
  const funilJornada = useMemo(() => {
    const total = jovensFiltrados.length;
    const comAcompanhamento = jovensFiltrados.filter((j) => j.totalAcompanhamentos > 0).length;
    const concluiuPre = jovensFiltrados.filter((j) => j.concluiuPreAprendizagem).length;
    const encaminhados = jovensFiltrados.filter((j) => j.totalEncaminhamentos > 0).length;
    const emEntrevista = jovensFiltrados.filter((j) => j.emProcessoSeletivo).length;
    const empregados = jovensFiltrados.filter((j) => j.trabalhaOuTrabalhou).length;

    return [
      {
        etapa: '1. Acolhimento & Mapeamento',
        desc: 'Jovens cadastrados na rede e diagnosticados',
        count: total,
        pct: 100,
        cor: '#0d5c3a'
      },
      {
        etapa: '2. Acompanhamento Técnico',
        desc: 'Pelo menos um atendimento registrado por assistente social/psicólogo',
        count: comAcompanhamento,
        pct: total ? Math.round((comAcompanhamento / total) * 100) : 0,
        cor: '#0284c7'
      },
      {
        etapa: '3. Pré-Aprendizagem',
        desc: 'Concluiu curso preparatório introdutório',
        count: concluiuPre,
        pct: total ? Math.round((concluiuPre / total) * 100) : 0,
        cor: '#7c3aed'
      },
      {
        etapa: '4. Encaminhamento para Vaga',
        desc: 'Direcionado para oportunidade em empresa parceira',
        count: encaminhados,
        pct: total ? Math.round((encaminhados / total) * 100) : 0,
        cor: '#ea580c'
      },
      {
        etapa: '5. Entrevista / Seleção',
        desc: 'Em processo seletivo ou entrevista agendada',
        count: emEntrevista,
        pct: total ? Math.round((emEntrevista / total) * 100) : 0,
        cor: '#d97706'
      },
      {
        etapa: '6. Inserção no Trabalho',
        desc: 'Trabalhando atualmente (aprendiz contratado ou inserido)',
        count: empregados,
        pct: total ? Math.round((empregados / total) * 100) : 0,
        cor: '#16a34a'
      }
    ];
  }, [jovensFiltrados]);

  // Função para resetar filtros
  const handleResetFilters = () => {
    setFiltroCidade('Todas');
    setFiltroEquipamento('Todos');
    setFiltroFaixaEtaria('Todas');
    setFiltroTrabalho('Todos');
    setFiltroPeriodo('Todos');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      <style>{`
        .analytics-subnav {
          display: flex;
          gap: 0.5rem;
          background-color: rgba(10,37,64,0.04);
          padding: 0.35rem;
          border-radius: 8px;
          border: 1px solid rgba(10,37,64,0.08);
          overflow-x: auto;
        }
        .analytics-subnav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.95rem;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-text-light);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .analytics-subnav-btn:hover {
          color: var(--color-primary);
        }
        .analytics-subnav-btn.active {
          background-color: #ffffff;
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }
        .bar-track {
          width: 100%;
          height: 10px;
          background-color: rgba(10,37,64,0.06);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 0.35rem;
          margin-bottom: 0.5rem;
        }
        .bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .insight-card {
          border-radius: 8px;
          padding: 1.1rem;
          border-left: 4px solid var(--color-secondary);
          background: #ffffff;
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        @media print {
          .admin-sidebar, .analytics-subnav, .filter-row, .no-print {
            display: none !important;
          }
          .admin-main-area {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <BarChart3 size={14} />
            Inteligência de Dados & BI Social
          </div>
          <h2 className="admin-form-title">Análises & Estatísticas</h2>
          <p className="admin-form-subtitle">Acompanhe a trajetória completa dos alunos, taxas de inserção profissional e métricas de vulnerabilidade</p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-outline"
            style={{ borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Printer size={15} />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filter-row no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', width: '100%', alignItems: 'end' }}>
        <div className="filter-item">
          <label className="filter-lbl">Município Pólo</label>
          <select className="filter-input" value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)}>
            <option value="Todas">Todos os municípios</option>
            {cidades.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Unidade / Equipamento</label>
          <select className="filter-input" value={filtroEquipamento} onChange={(e) => setFiltroEquipamento(e.target.value)}>
            <option value="Todos">Todas as unidades</option>
            {equipamentos.map((eq) => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Faixa Etária</label>
          <select className="filter-input" value={filtroFaixaEtaria} onChange={(e) => setFiltroFaixaEtaria(e.target.value)}>
            <option value="Todas">Todas as idades</option>
            <option value="11-13">11 a 13 anos</option>
            <option value="14-17">14 a 17 anos (Aprendizes)</option>
            <option value="18-24">18 a 24 anos</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Situação Ocupacional</label>
          <select className="filter-input" value={filtroTrabalho} onChange={(e) => setFiltroTrabalho(e.target.value)}>
            <option value="Todos">Todas as situações</option>
            <option value="trabalha">Trabalham / Já trabalharam</option>
            <option value="nao_trabalha">Nunca trabalharam (1º Emprego)</option>
            <option value="contratado_programa">Contratados via Descubra</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Período de Entrada</label>
          <select className="filter-input" value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
            <option value="Todos">Todo o histórico</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="ano">Ano atual ({new Date().getFullYear()})</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleResetFilters}
            style={{ width: '100%', fontSize: '0.82rem', padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Grid de KPIs Executivos */}
      <div className="stats-grid-4">
        {/* Total de Jovens */}
        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(10, 37, 64, 0.08)', color: 'var(--color-primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="report-stat-val">{kpis.total}</div>
            <div className="report-stat-lbl">Alunos Mapeados</div>
          </div>
        </div>

        {/* Quantos Trabalham */}
        <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-secondary)' }}>
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(13, 92, 58, 0.1)', color: 'var(--color-secondary)' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div className="report-stat-val" style={{ color: 'var(--color-secondary)' }}>
              {kpis.trabalham} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>({kpis.taxaTrabalho}%)</span>
            </div>
            <div className="report-stat-lbl">Trabalham / Inseridos</div>
          </div>
        </div>

        {/* Em Processo Seletivo */}
        <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-orange)' }}>
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="report-stat-val" style={{ color: 'var(--color-orange)' }}>
              {kpis.emProcessoSeletivo}
            </div>
            <div className="report-stat-lbl">Em Processo Seletivo</div>
          </div>
        </div>

        {/* Tempo Médio */}
        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="report-stat-val" style={{ color: '#0284c7' }}>
              {kpis.tempoMedioDias} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>dias</span>
            </div>
            <div className="report-stat-lbl">Tempo Médio na Rede</div>
          </div>
        </div>
      </div>

      {/* Sub-navegação de Abas */}
      <div className="analytics-subnav no-print">
        <button
          className={`analytics-subnav-btn ${activeSubTab === 'jornada' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('jornada')}
        >
          <Layers size={15} />
          Jornada & Funil de Empregabilidade
        </button>

        <button
          className={`analytics-subnav-btn ${activeSubTab === 'ocupacao' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('ocupacao')}
        >
          <Briefcase size={15} />
          Trabalho & Renda Familiar
        </button>

        <button
          className={`analytics-subnav-btn ${activeSubTab === 'demografico' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('demografico')}
        >
          <GraduationCap size={15} />
          Perfil Demográfico & Educação
        </button>

        <button
          className={`analytics-subnav-btn ${activeSubTab === 'vulnerabilidade' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('vulnerabilidade')}
        >
          <ShieldAlert size={15} />
          Vulnerabilidade & Riscos Sociais
        </button>

        <button
          className={`analytics-subnav-btn ${activeSubTab === 'territorial' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('territorial')}
        >
          <Building2 size={15} />
          Cidades & Unidades de Atendimento
        </button>
      </div>

      {loading ? (
        <div style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid rgba(10,37,64,0.08)' }}>
          <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Compilando estatísticas e métricas analíticas...</p>
        </div>
      ) : jovensFiltrados.length === 0 ? (
        <div style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed rgba(10,37,64,0.15)' }}>
          <Users size={36} style={{ color: 'var(--color-text-light)', marginBottom: '0.75rem', opacity: 0.5 }} />
          <h4 style={{ color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nenhum dado encontrado para os filtros selecionados</h4>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', maxWidth: '400px' }}>
            Tente selecionar outros municípios, faixas etárias ou limpe os filtros para visualizar a base completa.
          </p>
          <button type="button" onClick={handleResetFilters} className="btn btn-outline" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            Resetar Filtros
          </button>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* ABA 1: JORNADA & FUNIL DE EMPREGABILIDADE */}
          {/* ========================================================= */}
          {activeSubTab === 'jornada' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                    Funil da Jornada do Aluno (Pipeline de Inclusão Produtiva)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: '0.25rem 0 0 0' }}>
                    Acompanhamento passo a passo: desde a entrada no Descubra até a conquista da vaga e autonomia no mercado
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {funilJornada.map((item, idx) => (
                    <div key={item.etapa} style={{ backgroundColor: 'rgba(10,37,64,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(10,37,64,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {item.etapa}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', display: 'block' }}>
                            {item.desc}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: item.cor }}>
                            {item.count} jovens
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-light)', display: 'block' }}>
                            {item.pct}% do total
                          </span>
                        </div>
                      </div>

                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.cor
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparativo de Situação de Emprego */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                    Situação Atual de Trabalho
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--color-secondary)' }}>Trabalham / Inseridos</span>
                        <span>{kpis.trabalham} ({kpis.taxaTrabalho}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${kpis.taxaTrabalho}%`, backgroundColor: 'var(--color-secondary)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--color-orange)' }}>Nunca Trabalharam (Buscando 1º Emprego)</span>
                        <span>{kpis.nuncaTrabalharam} ({100 - kpis.taxaTrabalho}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${100 - kpis.taxaTrabalho}%`, backgroundColor: 'var(--color-orange)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                    Capacitação Pré-Aprendizagem
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ color: '#0284c7' }}>Concluíram Pré-Aprendizagem</span>
                        <span>{kpis.capacitadosPre} ({kpis.taxaCapacitacao}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${kpis.taxaCapacitacao}%`, backgroundColor: '#0284c7' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--color-text-light)' }}>Ainda Não Capacitados</span>
                        <span>{kpis.total - kpis.capacitadosPre} ({100 - kpis.taxaCapacitacao}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${100 - kpis.taxaCapacitacao}%`, backgroundColor: 'rgba(10,37,64,0.2)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: TRABALHO & RENDA FAMILIAR */}
          {/* ========================================================= */}
          {activeSubTab === 'ocupacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    Experiência Profissional Prévia
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                    Identificação de trabalho anterior precoce ou informal
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span>Já trabalhou anteriormente</span>
                        <span>{kpis.trabalham} ({kpis.taxaTrabalho}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${kpis.taxaTrabalho}%`, backgroundColor: 'var(--color-secondary)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span>Sem experiência prévia</span>
                        <span>{kpis.nuncaTrabalharam} ({100 - kpis.taxaTrabalho}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${100 - kpis.taxaTrabalho}%`, backgroundColor: 'rgba(10,37,64,0.3)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    Acesso a Benefícios Sociais
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                    Inscrição em programas de transferência de renda
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span>Recebem Bolsa Família / CadÚnico</span>
                        <span>{kpis.beneficiariosBolsa} ({Math.round((kpis.beneficiariosBolsa / (kpis.total || 1)) * 100)}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.round((kpis.beneficiariosBolsa / (kpis.total || 1)) * 100)}%`, backgroundColor: 'var(--color-orange)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span>Não recebem auxílio social</span>
                        <span>{kpis.total - kpis.beneficiariosBolsa} ({100 - Math.round((kpis.beneficiariosBolsa / (kpis.total || 1)) * 100)}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${100 - Math.round((kpis.beneficiariosBolsa / (kpis.total || 1)) * 100)}%`, backgroundColor: 'rgba(10,37,64,0.2)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Vagas em Aberto e Encaminhamentos */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                  Oportunidades em Empresas Parceiras ({vagas.length} vagas registradas)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Título da Vaga</th>
                        <th>Modalidade</th>
                        <th>Horário</th>
                        <th>Bolsa Auxílio</th>
                        <th>Idade Mínima</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vagas.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-light)' }}>Nenhuma vaga cadastrada no momento.</td></tr>
                      ) : (
                        vagas.map((v) => (
                          <tr key={v.id}>
                            <td style={{ fontWeight: 600 }}>{v.titulo}</td>
                            <td><span className="badge-status badge-presenca">{v.tipo}</span></td>
                            <td>{v.horario || 'A definir'}</td>
                            <td>R$ {v.bolsa_auxilio ? Number(v.bolsa_auxilio).toLocaleString('pt-BR') : '0,00'}</td>
                            <td>{v.idade_minima ? `${v.idade_minima} anos` : 'Livre'}</td>
                            <td><span className="badge-status badge-presenca">{v.status}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: PERFIL DEMOGRÁFICO & EDUCAÇÃO */}
          {/* ========================================================= */}
          {activeSubTab === 'demografico' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Faixas Etárias */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                    Faixa Etária
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {faixasEtarias.map((f) => (
                      <div key={f.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                          <span>{f.label}</span>
                          <span>{f.count} ({f.pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Turno Escolar */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                    Turno Escolar dos Alunos
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {turnosEscolares.map((t) => (
                      <div key={t.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                          <span>{t.label}</span>
                          <span>{t.count} ({t.pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${t.pct}%`, backgroundColor: t.label === 'Não estuda' ? 'var(--color-error)' : 'var(--color-secondary)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Gênero */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                    Identificação de Gênero
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {generos.map((g) => (
                      <div key={g.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                          <span>{g.label}</span>
                          <span>{g.count} ({g.pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${g.pct}%`, backgroundColor: g.label === 'Feminino' ? '#ec4899' : '#3b82f6' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raça / Cor */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                    Diversidade Racial / Cor Declarada
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {racas.map((r) => (
                      <div key={r.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                          <span>{r.label}</span>
                          <span>{r.count} ({r.pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${r.pct}%`, backgroundColor: '#8b5cf6' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 4: VULNERABILIDADE & FATORES DE RISCO */}
          {/* ========================================================= */}
          {activeSubTab === 'vulnerabilidade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-error)' }}>
                  <div className="report-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <div className="report-stat-val" style={{ color: 'var(--color-error)' }}>{kpis.riscoCritico}</div>
                    <div className="report-stat-lbl">Risco Crítico (Score &ge; 60)</div>
                  </div>
                </div>

                <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-orange)' }}>
                  <div className="report-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="report-stat-val" style={{ color: 'var(--color-orange)' }}>{kpis.riscoMedio}</div>
                    <div className="report-stat-lbl">Risco Médio (Score 30-59)</div>
                  </div>
                </div>

                <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-secondary)' }}>
                  <div className="report-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-secondary)' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div className="report-stat-val" style={{ color: 'var(--color-secondary)' }}>{kpis.riscoBaixo}</div>
                    <div className="report-stat-lbl">Risco Baixo (Score &lt; 30)</div>
                  </div>
                </div>
              </div>

              {/* Fatores Críticos Mapeados */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Incidência de Fatores Críticos na Base
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '1.25rem' }}>
                  Percentual de alunos acometidos por cada fator socioeconômico e familiar mapeado
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {fatoresVulnerabilidade.map((fv) => (
                    <div key={fv.titulo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                        <span>{fv.titulo}</span>
                        <span style={{ color: fv.severidade === 'alta' ? 'var(--color-error)' : 'var(--color-primary)' }}>
                          {fv.count} alunos ({fv.pct}%)
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${fv.pct}%`,
                            backgroundColor: fv.severidade === 'alta' ? 'var(--color-error)' : 'var(--color-orange)'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 5: CIDADES & UNIDADES DE ATENDIMENTO */}
          {/* ========================================================= */}
          {activeSubTab === 'territorial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Distribuição por Cidade */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                  Distribuição por Município Pólo
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {cidadesStats.map((c) => (
                    <div key={c.cidade} style={{ backgroundColor: 'rgba(10,37,64,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(10,37,64,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <MapPin size={16} />
                        {c.cidade}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                        {c.count} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-light)' }}>({c.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela de Desempenho por Equipamento */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(10,37,64,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                  Desempenho por Unidade de Referência (CRAS / CREAS)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Unidade</th>
                        <th>Município</th>
                        <th>Alunos Mapeados</th>
                        <th>Atendimentos Realizados</th>
                        <th>Encaminhados</th>
                        <th>Trabalham / Inseridos</th>
                        <th>Taxa de Inserção</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipamentosStats.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-light)' }}>Nenhuma unidade com dados para este filtro.</td></tr>
                      ) : (
                        equipamentosStats.map((eq) => {
                          const taxa = eq.total ? Math.round((eq.trabalham / eq.total) * 100) : 0;
                          return (
                            <tr key={eq.nome}>
                              <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{eq.nome}</td>
                              <td>{eq.cidade}</td>
                              <td style={{ fontWeight: 600 }}>{eq.total}</td>
                              <td>{eq.acsCount}</td>
                              <td>{eq.encaminhados}</td>
                              <td style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>{eq.trabalham}</td>
                              <td>
                                <span className={`badge-status ${taxa >= 50 ? 'badge-presenca' : 'badge-falta'}`}>
                                  {taxa}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* DESTAQUES INTELIGENTES (DESCUBRA INSIGHTS) */}
          {/* ========================================================= */}
          <div style={{ backgroundColor: 'rgba(13, 92, 58, 0.03)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(13, 92, 58, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-secondary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>
              <Sparkles size={18} />
              Destaques Estratégicos & Recomendações Automáticas
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="insight-card">
                <Briefcase size={20} style={{ color: 'var(--color-secondary)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                    Empregabilidade Atual: {kpis.taxaTrabalho}%
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dark)', margin: 0, lineHeight: 1.5 }}>
                    {kpis.trabalham} de {kpis.total} alunos já estão inseridos no mercado ou possuem histórico de trabalho, enquanto {kpis.nuncaTrabalharam} ainda buscam o primeiro contrato de aprendizagem.
                  </p>
                </div>
              </div>

              <div className="insight-card" style={{ borderLeftColor: '#0284c7' }}>
                <Clock size={20} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                    Tempo Médio de Permanência: {kpis.tempoMedioDias} dias
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dark)', margin: 0, lineHeight: 1.5 }}>
                    Média de tempo entre a identificação do aluno na rede socioassistencial e o seu primeiro encaminhamento/oportunidade em empresa parceira.
                  </p>
                </div>
              </div>

              <div className="insight-card" style={{ borderLeftColor: 'var(--color-orange)' }}>
                <GraduationCap size={20} style={{ color: 'var(--color-orange)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                    Potencial de Pré-Aprendizagem: {100 - kpis.taxaCapacitacao}% Pendente
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dark)', margin: 0, lineHeight: 1.5 }}>
                    {kpis.total - kpis.capacitadosPre} alunos ainda não concluíram cursos de preparação introdutória, sendo este um dos principais fatores para acelerar a aprovação nas entrevistas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
