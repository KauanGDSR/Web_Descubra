'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Sparkles,
  Clock,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useDialog } from '@/components/ui/CustomDialog';
import Modal from '@/components/ui/Modal';

interface JovemFila {
  id: string;
  nome: string;
  nome_completo: string;
  nome_social: string | null;
  idade: number;
  bairro: string;
  turno_escolar: string;
  escolaridade: string;
  tipo_inscricao: string;
  codigo_acesso: string | null;
  equipamento: string;
  score: number;
  classificacao: 'Crítico' | 'Médio' | 'Baixo';
  cor: 'red' | 'orange' | 'green';
  motivos: string[];
}

export default function FilaInteligentePage() {
  const router = useRouter();
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [fila, setFila] = useState<JovemFila[]>([]);
  const [jovemSelecionado, setJovemSelecionado] = useState<JovemFila | null>(null);

  // Modal de Matching
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingResults, setMatchingResults] = useState<any[]>([]);

  const handleMatching = async () => {
    if (!jovemSelecionado) return;
    setMatchingModalOpen(true);
    setMatchingLoading(true);
    setMatchingResults([]);
    try {
      const res = await fetch('/api/matching-vagas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jovem_id: jovemSelecionado.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no processamento do matching.');
      setMatchingResults(data.recomendacoes || []);
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro no Matching', err.message, 'danger');
      setMatchingModalOpen(false);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleEncaminhar = async (vagaId: string, justificativa: string) => {
    if (!jovemSelecionado) return;
    const ok = await dialog.confirm('Confirmar Encaminhamento', 'Deseja encaminhar este jovem para esta vaga? A empresa terá acesso ao perfil do jovem na aba de Candidatos.', 'warning');
    if (!ok) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('encaminhamentos_vagas').insert({
        vaga_id: vagaId,
        jovem_id: jovemSelecionado.id,
        tecnico_id: user?.id,
        status: 'Pendente',
        feedback_tecnico: justificativa,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      await dialog.alert('Sucesso', 'Jovem encaminhado com sucesso! A empresa foi notificada.', 'success');
      setMatchingModalOpen(false);
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro no Encaminhamento', err.message || 'Erro ao gravar o encaminhamento.', 'danger');
    }
  };

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroRisco, setFiltroRisco] = useState<string>('Todos');
  const [equipamentosDisponiveis, setEquipamentosDisponiveis] = useState<string[]>([]);
  const [filtroEquipamento, setFiltroEquipamento] = useState('Todos');
  const [filtroIdade, setFiltroIdade] = useState('Todos');
  const [filtroEscolaridade, setFiltroEscolaridade] = useState('Todos');
  const [filtroTurno, setFiltroTurno] = useState('Todos');
  const [filtroBairro, setFiltroBairro] = useState('Todos');
  const [filtroTipoInscricao, setFiltroTipoInscricao] = useState('Todos');
  const [filtroFaixaScore, setFiltroFaixaScore] = useState('Todos');

  const carregarFila = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/motor-vulnerabilidade');
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Erro ao processar a Fila de Vulnerabilidade.');
      }

      const lista = json.fila || [];
      setFila(lista);

      // Extrai os equipamentos únicos para os filtros
      const equips = new Set<string>();
      lista.forEach((j: JovemFila) => {
        if (j.equipamento) equips.add(j.equipamento);
      });
      setEquipamentosDisponiveis(Array.from(equips));

      // Seleciona automaticamente o primeiro caso nenhum esteja selecionado
      if (lista.length > 0) {
        setJovemSelecionado((prev) => {
          if (!prev) return lista[0];
          const atualizado = lista.find((j: JovemFila) => j.id === prev.id);
          return atualizado || lista[0];
        });
      }
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro de Conexão', err.message || 'Não foi possível carregar a Fila de Vulnerabilidade.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFila();
  }, []);

  // Filtros aplicados em memória
  const filaFiltrada = useMemo(() => {
    return fila.filter((j) => {
      const nomeCompleto = (j.nome_completo || '').toLowerCase();
      const nomeSocial = (j.nome_social || '').toLowerCase();
      const searchNorm = busca.toLowerCase();
      const matchesBusca = nomeCompleto.includes(searchNorm) || nomeSocial.includes(searchNorm);

      const matchesRisco = filtroRisco === 'Todos' || j.classificacao === filtroRisco;
      const matchesEquipamento = filtroEquipamento === 'Todos' || j.equipamento === filtroEquipamento;
      const matchesIdade = filtroIdade === 'Todos' || j.idade?.toString() === filtroIdade;
      const matchesEscolaridade = filtroEscolaridade === 'Todos' || j.escolaridade?.toLowerCase().includes(filtroEscolaridade.toLowerCase());
      const matchesTurno = filtroTurno === 'Todos' || j.turno_escolar?.toLowerCase() === filtroTurno.toLowerCase();
      const matchesBairro = filtroBairro === 'Todos' || j.bairro?.toLowerCase().includes(filtroBairro.toLowerCase());
      const matchesTipoInscricao = filtroTipoInscricao === 'Todos' || j.tipo_inscricao === filtroTipoInscricao;

      let matchesFaixaScore = true;
      if (filtroFaixaScore === '0-30') matchesFaixaScore = j.score >= 0 && j.score <= 30;
      else if (filtroFaixaScore === '31-60') matchesFaixaScore = j.score >= 31 && j.score <= 60;
      else if (filtroFaixaScore === '61-100') matchesFaixaScore = j.score >= 61;

      return (
        matchesBusca &&
        matchesRisco &&
        matchesEquipamento &&
        matchesIdade &&
        matchesEscolaridade &&
        matchesTurno &&
        matchesBairro &&
        matchesTipoInscricao &&
        matchesFaixaScore
      );
    });
  }, [
    fila,
    busca,
    filtroRisco,
    filtroEquipamento,
    filtroIdade,
    filtroEscolaridade,
    filtroTurno,
    filtroBairro,
    filtroTipoInscricao,
    filtroFaixaScore
  ]);

  // Estatísticas da Fila
  const stats = useMemo(() => {
    const total = fila.length;
    const criticos = fila.filter((j) => j.score >= 60).length;
    const atencao = fila.filter((j) => j.score >= 30 && j.score < 60).length;
    const scoreMedio = total > 0 ? Math.round(fila.reduce((acc, curr) => acc + curr.score, 0) / total) : 0;

    return { total, criticos, atencao, scoreMedio };
  }, [fila]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <Sparkles size={13} />
            Algoritmo de Priorização Ativo
          </div>
          <h2 className="admin-form-title">Fila Inteligente</h2>
          <p className="admin-form-subtitle">Jovens ordenados por índice de vulnerabilidade social e evasão escolar</p>
        </div>
        <button
          onClick={carregarFila}
          disabled={loading}
          className="btn btn-outline"
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(10,37,64,0.2)' }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-orange)' }} />
          ) : (
            <Clock size={14} style={{ color: 'var(--color-orange)' }} />
          )}
          Recalcular Score
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid-4">
        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(10, 37, 64, 0.1)', color: 'var(--color-primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="report-stat-val">{stats.total}</div>
            <div className="report-stat-lbl">Mapeados</div>
          </div>
        </div>

        <div className="report-stat-card" style={{ borderLeft: '3px solid var(--color-error)' }}>
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="report-stat-val" style={{ color: 'var(--color-error)' }}>{stats.criticos}</div>
            <div className="report-stat-lbl">Críticos</div>
          </div>
        </div>

        <div className="report-stat-card" style={{ borderLeft: '3px solid var(--color-orange)' }}>
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="report-stat-val" style={{ color: 'var(--color-orange)' }}>{stats.atencao}</div>
            <div className="report-stat-lbl">Atenção</div>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-yellow)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div className="report-stat-val" style={{ color: 'var(--color-yellow)' }}>{stats.scoreMedio}</div>
            <div className="report-stat-lbl">Média Fila</div>
          </div>
        </div>
      </div>

      {/* Filters Box */}
      <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', width: '100%' }}>
        {/* Busca por Nome */}
        <div className="filter-item" style={{ gridColumn: 'span 2', minWidth: '220px' }}>
          <label className="filter-lbl">Pesquisar</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', display: 'flex' }}>
              <Search size={14} />
            </span>
            <input
              className="filter-input"
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Risco</label>
          <select className="filter-input" value={filtroRisco} onChange={(e) => setFiltroRisco(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Crítico">Crítico (&gt;= 60)</option>
            <option value="Médio">Médio (30-59)</option>
            <option value="Baixo">Baixo (&lt; 30)</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Equipamento / Pólo</label>
          <select className="filter-input" value={filtroEquipamento} onChange={(e) => setFiltroEquipamento(e.target.value)}>
            <option value="Todos">Todos</option>
            {equipamentosDisponiveis.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Idade</label>
          <select className="filter-input" value={filtroIdade} onChange={(e) => setFiltroIdade(e.target.value)}>
            <option value="Todos">Todas</option>
            {Array.from({ length: 9 }, (_, i) => i + 13).map((idade) => (
              <option key={idade} value={idade.toString()}>{idade} anos</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Escolaridade</label>
          <select className="filter-input" value={filtroEscolaridade} onChange={(e) => setFiltroEscolaridade(e.target.value)}>
            <option value="Todos">Todas</option>
            <option value="fundamental">Fundamental</option>
            <option value="médio">Médio</option>
            <option value="superior">Superior</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Turno Escolar</label>
          <select className="filter-input" value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Inscrição</label>
          <select className="filter-input" value={filtroTipoInscricao} onChange={(e) => setFiltroTipoInscricao(e.target.value)}>
            <option value="Todos">Todas</option>
            <option value="Demanda Espontânea">Espontânea</option>
            <option value="Encaminhamento">Encaminhamento</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Faixa de Score</label>
          <select className="filter-input" value={filtroFaixaScore} onChange={(e) => setFiltroFaixaScore(e.target.value)}>
            <option value="Todos">Todos os scores</option>
            <option value="0-30">0 a 30</option>
            <option value="31-60">31 a 60</option>
            <option value="61-100">61 a 100</option>
          </select>
        </div>
      </div>

      {/* Main Dual Panel Layout */}
      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%' }}>
          <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Processando e recalculando riscos da fila...</p>
        </div>
      ) : filaFiltrada.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '350px' }}>
          <p className="empty-tab-desc">Nenhum jovem atende aos filtros aplicados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', width: '100%', alignItems: 'start' }}>
          {/* LEFT COLUMN: YOUTH LIST */}
          <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.35rem' }}>
            {filaFiltrada.map((j) => {
              const isSelected = jovemSelecionado?.id === j.id;
              let borderClass = 'rgba(10,37,64,0.06)';
              let bgClass = '#ffffff';

              if (isSelected) {
                if (j.classificacao === 'Crítico') borderClass = 'var(--color-error)';
                else if (j.classificacao === 'Médio') borderClass = 'var(--color-orange)';
                else borderClass = 'var(--color-secondary)';
                bgClass = 'rgba(10, 37, 64, 0.01)';
              }

              return (
                <div
                  key={j.id}
                  onClick={() => setJovemSelecionado(j)}
                  style={{
                    backgroundColor: bgClass,
                    border: `1.5px solid ${borderClass}`,
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                        {j.nome}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                        {j.equipamento}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: j.classificacao === 'Crítico' ? 'rgba(239,68,68,0.1)' : j.classificacao === 'Médio' ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)',
                        color: j.classificacao === 'Crítico' ? 'var(--color-error)' : j.classificacao === 'Médio' ? 'var(--color-orange)' : 'var(--color-secondary)'
                      }}
                    >
                      {j.classificacao}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-text-light)', borderTop: '1px dashed rgba(10,37,64,0.06)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <MapPin size={11} />
                      {j.bairro}
                    </span>
                    <span style={{ fontWeight: 700, color: j.classificacao === 'Crítico' ? 'var(--color-error)' : j.classificacao === 'Médio' ? 'var(--color-orange)' : 'var(--color-secondary)' }}>
                      Score: {j.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: RISK DIAGNOSTICS */}
          <div
            className="report-stat-card"
            style={{
              gridColumn: 'span 7',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem',
              alignItems: 'stretch'
            }}
          >
            {jovemSelecionado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Header card info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(10,37,64,0.06)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.15rem 0.45rem', backgroundColor: 'rgba(10,37,64,0.06)', color: 'var(--color-primary)', borderRadius: '4px' }}>
                        {jovemSelecionado.tipo_inscricao}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: jovemSelecionado.classificacao === 'Crítico' ? 'rgba(239,68,68,0.1)' : jovemSelecionado.classificacao === 'Médio' ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)',
                          color: jovemSelecionado.classificacao === 'Crítico' ? 'var(--color-error)' : jovemSelecionado.classificacao === 'Médio' ? 'var(--color-orange)' : 'var(--color-secondary)'
                        }}
                      >
                        Score {jovemSelecionado.score}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                      {jovemSelecionado.nome_completo}
                    </h3>
                    {jovemSelecionado.nome_social && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', margin: '0.2rem 0 0 0' }}>
                        Nome Social: <span style={{ fontWeight: 600 }}>{jovemSelecionado.nome_social}</span>
                      </p>
                    )}
                  </div>

                  {/* Circular Score Badge */}
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2px solid rgba(10,37,64,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(10,37,64,0.01)'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        color: jovemSelecionado.classificacao === 'Crítico' ? 'var(--color-error)' : jovemSelecionado.classificacao === 'Médio' ? 'var(--color-orange)' : 'var(--color-secondary)'
                      }}
                    >
                      {jovemSelecionado.score}
                    </span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-light)', marginTop: '0.1rem' }}>Risco</span>
                  </div>
                </div>

                {/* Quick Social Sheet */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'rgba(10,37,64,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(10,37,64,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                    <Users size={14} style={{ color: 'var(--color-text-light)' }} />
                    <span>Idade: <b>{jovemSelecionado.idade} anos</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                    <BookOpen size={14} style={{ color: 'var(--color-text-light)' }} />
                    <span>Turno: <b>{jovemSelecionado.turno_escolar}</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                    <GraduationCap size={14} style={{ color: 'var(--color-text-light)' }} />
                    <span>Escolaridade: <b>{jovemSelecionado.escolaridade}</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                    <MapPin size={14} style={{ color: 'var(--color-text-light)' }} />
                    <span>Pólo: <b>{jovemSelecionado.equipamento}</b></span>
                  </div>
                </div>

                {/* Risk Reasons (Diagnostic) */}
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.65rem' }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-orange)' }} />
                    Fatores de Vulnerabilidade Mapeados
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {jovemSelecionado.motivos && jovemSelecionado.motivos.length > 0 ? (
                      jovemSelecionado.motivos.map((motivo, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                            color: 'var(--color-text-dark)',
                            backgroundColor: 'rgba(10,37,64,0.01)',
                            border: '1.5px solid rgba(10,37,64,0.04)',
                            padding: '0.65rem 0.8rem',
                            borderRadius: '6px'
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-orange)', marginTop: '0.35rem', flexShrink: 0 }} />
                          <span>{motivo}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', fontStyle: 'italic', margin: 0 }}>
                        Nenhum fator crítico de vulnerabilidade identificado pelo motor de dados. Jovem apresenta baixo risco social.
                      </p>
                    )}
                  </div>
                </div>

                {/* Recommendations & Action Plan */}
                <div style={{ borderTop: '1px solid rgba(10,37,64,0.06)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', margin: 0 }}>
                    Plano de Ação Recomendado
                  </h4>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => router.push(`/admin/relatorios?jovemId=${jovemSelecionado.id}`)}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '0.65rem 1rem',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-orange)',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      Registro de Acompanhamento
                      <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={handleMatching}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        padding: '0.65rem 1rem',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Briefcase size={13} style={{ color: 'var(--color-orange)' }} />
                      Matching de Vagas
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '3rem', paddingBottom: '3rem', textAlign: 'center', gap: '0.75rem' }}>
                <Users size={32} style={{ color: 'var(--color-text-light)', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: 0, maxWidth: '280px' }}>
                  Selecione um jovem na fila de vulnerabilidade para ver a análise completa de risco social.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Matching */}
      <Modal isOpen={matchingModalOpen} onClose={() => setMatchingModalOpen(false)}>
        <button className="modal-close-btn" onClick={() => setMatchingModalOpen(false)} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="admin-form-header" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-orange)', marginBottom: '0.5rem' }}>
            <Sparkles size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inteligência Artificial</span>
          </div>
          <h2 className="admin-form-title">Vagas Recomendadas</h2>
          <p className="admin-form-subtitle">
            Analisando compatibilidade para <strong>{jovemSelecionado?.nome_completo}</strong>
          </p>
        </div>

        {matchingLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-orange)' }} />
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Cruzando perfil do jovem com vagas abertas...</p>
          </div>
        ) : matchingResults.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--color-text-light)', opacity: 0.5, margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--color-text-dark)', fontSize: '0.95rem' }}>Nenhuma recomendação encontrada pela IA.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {matchingResults.map((rec, idx) => (
              <div key={idx} style={{ padding: '1.25rem', border: '1px solid rgba(10,37,64,0.08)', borderRadius: '8px', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--color-primary)' }}>{rec.vaga.titulo}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                      {rec.vaga.empresa} • {rec.vaga.tipo}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: rec.compatibilidade >= 80 ? 'var(--color-secondary)' : rec.compatibilidade >= 50 ? 'var(--color-orange)' : 'var(--color-error)' }}>
                      {rec.compatibilidade}%
                    </span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: 700 }}>Match</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-dark)', marginBottom: '1rem', backgroundColor: 'rgba(10,37,64,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span><strong>Idade:</strong> {rec.vaga.idade_minima}+</span>
                  <span>•</span>
                  <span><strong>Bolsa:</strong> {rec.vaga.bolsa_auxilio > 0 ? `R$ ${rec.vaga.bolsa_auxilio}` : 'A combinar'}</span>
                  <span>•</span>
                  <span><strong>Horário:</strong> {rec.vaga.horario || 'N/I'}</span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--color-text-dark)' }}>
                    <strong>Análise da IA:</strong> {rec.justificativa}
                  </p>
                </div>

                <div style={{ backgroundColor: 'rgba(249,115,22,0.05)', borderLeft: '3px solid var(--color-orange)', padding: '0.75rem', borderRadius: '0 4px 4px 0', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                    <strong style={{ color: 'var(--color-orange)' }}>Conselho ao Técnico:</strong> {rec.conselho || rec.plano_preparacao}
                  </p>
                </div>

                <button
                  onClick={() => handleEncaminhar(rec.vaga.id, rec.conselho || rec.plano_preparacao)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--color-secondary)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <ArrowRight size={14} />
                  Encaminhar Jovem para Vaga
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
