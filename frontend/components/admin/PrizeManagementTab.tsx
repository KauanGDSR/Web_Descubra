'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  Clock,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  Award,
  Sparkles,
  AlertCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useDialog } from '@/frontend/components/ui/CustomDialog';
import Modal from '@/frontend/components/ui/Modal';

interface Premio {
  id: string;
  titulo: string;
  parceiro_nome: string;
  custo_pontos: number;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

interface Resgate {
  id: string;
  status: 'Pendente' | 'Entregue' | 'Cancelado';
  created_at: string;
  jovem_id: string;
  premio_id: string;
  jovemNome: string;
  polo: string;
  saldoJovem: number;
  premioTitulo: string;
  premioCusto: number;
  parceiroNome: string;
}

const EMPTY_PREMIO_FORM = {
  id: '',
  titulo: '',
  parceiro_nome: '',
  custo_pontos: 100,
  descricao: '',
  ativo: true,
};

export default function PrizeManagementTab() {
  const dialog = useDialog();

  // Sub-aba ativa: 'resgates' ou 'catalogo'
  const [activeTab, setActiveTab] = useState<'resgates' | 'catalogo'>('resgates');

  // Estados de Dados
  const [resgates, setResgates] = useState<Resgate[]>([]);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Estados do Modal de Cadastro/Edição de Prêmio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formPremio, setFormPremio] = useState(EMPTY_PREMIO_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Carrega tanto os resgates quanto os prêmios
  const loadData = async () => {
    setLoading(true);
    try {
      const [resgatesRes, premiosRes] = await Promise.all([
        fetch('/api/admin/resgates'),
        fetch('/api/admin/premios')
      ]);

      const resgatesJson = await resgatesRes.json();
      const premiosJson = await premiosRes.json();

      if (resgatesRes.ok && resgatesJson.resgates) {
        const mappedResgates: Resgate[] = resgatesJson.resgates.map((item: any) => ({
          id: item.id,
          status: item.status,
          created_at: item.created_at,
          jovem_id: item.jovem_id,
          premio_id: item.premio_id,
          jovemNome: item.jovens?.nome_social || item.jovens?.nome_completo || 'Sem nome',
          polo: item.jovens?.equipamentos?.nome || 'Sem polo',
          saldoJovem: item.jovens?.pontuacao_atual ?? 0,
          premioTitulo: item.premios_parceiros?.titulo || 'Prêmio indisponível',
          premioCusto: item.premios_parceiros?.custo_pontos || 0,
          parceiroNome: item.premios_parceiros?.parceiro_nome || '—'
        }));
        setResgates(mappedResgates);
      }

      if (premiosRes.ok && premiosJson.premios) {
        setPremios(premiosJson.premios);
      }
    } catch (err: any) {
      console.error('Erro ao carregar prêmios e resgates:', err);
      dialog.alert('Erro de Conexão', 'Não foi possível carregar os dados de prêmios do servidor.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // Ações de Pedidos de Resgate
  // ==========================================
  const handleAtualizarStatusResgate = async (
    resgateId: string,
    novoStatus: 'Entregue' | 'Cancelado',
    jovemNome: string,
    premioTitulo: string
  ) => {
    const isEntrega = novoStatus === 'Entregue';
    const acaoTexto = isEntrega ? 'Confirmar Entrega' : 'Recusar Resgate';
    const msgConfirm = isEntrega
      ? `Deseja marcar o prêmio <b>"${premioTitulo}"</b> para o aluno <b>${jovemNome}</b> como entregue?`
      : `Deseja recusar este pedido de resgate de <b>${jovemNome}</b>? Os pontos do prêmio serão <b>estornados automaticamente</b> para o saldo do aluno.`;

    const ok = await dialog.confirm(acaoTexto, msgConfirm, isEntrega ? 'warning' : 'danger');
    if (!ok) return;

    try {
      const res = await fetch('/api/admin/resgates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resgateId, novoStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar resgate.');

      await dialog.alert('Sucesso', data.mensagem || 'Status do resgate atualizado com sucesso!', 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Atualizar', err.message || 'Erro interno ao atualizar resgate.', 'danger');
    }
  };

  // ==========================================
  // Ações do Catálogo de Prêmios
  // ==========================================
  const handleOpenCreateModal = () => {
    setFormPremio(EMPTY_PREMIO_FORM);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (premio: Premio) => {
    setFormPremio({
      id: premio.id,
      titulo: premio.titulo,
      parceiro_nome: premio.parceiro_nome,
      custo_pontos: premio.custo_pontos,
      descricao: premio.descricao || '',
      ativo: premio.ativo,
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSavePremio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPremio.titulo.trim() || !formPremio.parceiro_nome.trim()) {
      dialog.alert('Campos Obrigatórios', 'Por favor, preencha o título e o nome do parceiro do prêmio.', 'warning');
      return;
    }

    setFormSubmitting(true);
    try {
      const isEdit = modalMode === 'edit';
      const res = await fetch('/api/admin/premios', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPremio)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar prêmio.');

      await dialog.alert('Sucesso', data.mensagem || 'Prêmio salvo com sucesso!', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar gravar dados do prêmio.', 'danger');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleAtivo = async (premio: Premio) => {
    try {
      const res = await fetch('/api/admin/premios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: premio.id, ativo: !premio.ativo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar visibilidade.');

      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', err.message || 'Não foi possível alterar a visibilidade do prêmio.', 'danger');
    }
  };

  const handleDeletePremio = async (premio: Premio) => {
    const ok = await dialog.confirm(
      'Confirmar Exclusão',
      `Tem certeza que deseja remover o prêmio <b>"${premio.titulo}"</b> do catálogo?`,
      'danger'
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/premios?id=${premio.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir prêmio.');

      await dialog.alert('Prêmio Removido', data.mensagem || 'Prêmio excluído com sucesso.', 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Excluir', err.message || 'Erro ao remover prêmio.', 'danger');
    }
  };

  // Filtros de Resgates
  const resgatesFiltrados = useMemo(() => {
    return resgates.filter((r) => {
      const termo = searchTerm.toLowerCase();
      const matchesSearch =
        r.jovemNome.toLowerCase().includes(termo) ||
        r.premioTitulo.toLowerCase().includes(termo) ||
        r.parceiroNome.toLowerCase().includes(termo);
      const matchesStatus = filterStatus === '' || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [resgates, searchTerm, filterStatus]);

  // Contadores
  const pendentesCount = resgates.filter((r) => r.status === 'Pendente').length;
  const entreguesCount = resgates.filter((r) => r.status === 'Entregue').length;
  const totalPontosEntregues = resgates
    .filter((r) => r.status === 'Entregue')
    .reduce((acc, r) => acc + (r.premioCusto || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      <style>{`
        .prizes-subnav {
          display: flex;
          gap: 0.5rem;
          background-color: rgba(10,37,64,0.04);
          padding: 0.35rem;
          border-radius: 8px;
          border: 1px solid rgba(10,37,64,0.08);
          overflow-x: auto;
        }
        .prizes-subnav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.1rem;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-light);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .prizes-subnav-btn:hover {
          color: var(--color-primary);
        }
        .prizes-subnav-btn.active {
          background-color: #ffffff;
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }
        .premio-card {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid rgba(10,37,64,0.08);
          padding: 1.25rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .premio-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
      `}</style>

      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <Sparkles size={14} />
            Gamificação & Recompensas dos Alunos
          </div>
          <h2 className="admin-form-title">Gestão de Prêmios e Resgates</h2>
          <p className="admin-form-subtitle">
            Cadastre os prêmios que aparecem na área do aluno e aprove os pedidos de resgate realizados
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-outline"
            style={{ borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--color-orange)' }} />
            Atualizar
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--color-secondary)',
              border: 'none',
              color: '#ffffff',
              padding: '0.65rem 1.1rem'
            }}
          >
            <Plus size={16} />
            Cadastrar Novo Prêmio
          </button>
        </div>
      </div>

      {/* Sub-navegação entre Pedidos de Resgate e Catálogo de Prêmios */}
      <div className="prizes-subnav">
        <button
          className={`prizes-subnav-btn ${activeTab === 'resgates' ? 'active' : ''}`}
          onClick={() => setActiveTab('resgates')}
        >
          <Gift size={16} />
          Pedidos de Resgate
          {pendentesCount > 0 && (
            <span style={{
              backgroundColor: 'var(--color-orange)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              marginLeft: '0.2rem'
            }}>
              {pendentesCount}
            </span>
          )}
        </button>

        <button
          className={`prizes-subnav-btn ${activeTab === 'catalogo' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalogo')}
        >
          <Award size={16} />
          Catálogo de Prêmios Disponíveis ({premios.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: PEDIDOS DE RESGATE (ADMIN/TÉCNICO ACEITA O PEDIDO) */}
      {/* ======================================================== */}
      {activeTab === 'resgates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stats Cards */}
          <div className="stats-grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-orange)' }}>
              <div className="report-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="report-stat-val" style={{ color: 'var(--color-orange)' }}>{pendentesCount}</div>
                <div className="report-stat-lbl">Aguardando Validação / Entrega</div>
              </div>
            </div>

            <div className="report-stat-card" style={{ borderLeft: '3.5px solid var(--color-secondary)' }}>
              <div className="report-stat-icon" style={{ backgroundColor: 'rgba(13, 92, 58, 0.1)', color: 'var(--color-secondary)' }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="report-stat-val" style={{ color: 'var(--color-secondary)' }}>{entreguesCount}</div>
                <div className="report-stat-lbl">Prêmios Entregues / Aceitos</div>
              </div>
            </div>

            <div className="report-stat-card">
              <div className="report-stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                <Sparkles size={22} />
              </div>
              <div>
                <div className="report-stat-val" style={{ color: '#0284c7' }}>{totalPontosEntregues} pts</div>
                <div className="report-stat-lbl">Pontuação Total Resgatada</div>
              </div>
            </div>
          </div>

          {/* Filtros de Pesquisa */}
          <div className="filter-row">
            <div className="filter-item" style={{ flex: '2', minWidth: '220px' }}>
              <label className="filter-lbl">Pesquisar Solicitação</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', display: 'flex' }}>
                  <Search size={14} />
                </span>
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Nome do aluno, prêmio ou parceiro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.2rem' }}
                />
              </div>
            </div>

            <div className="filter-item">
              <label className="filter-lbl">Status</label>
              <select
                className="filter-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="Pendente">Pendentes (Aguardando)</option>
                <option value="Entregue">Entregues / Aceitos</option>
                <option value="Cancelado">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Tabela de Solicitações */}
          {loading ? (
            <div className="map-loading-container" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando solicitações de resgates...</p>
            </div>
          ) : resgatesFiltrados.length === 0 ? (
            <div className="empty-tab-state" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: '8px', border: '1px dashed rgba(10,37,64,0.15)' }}>
              <Gift size={36} style={{ color: 'var(--color-text-light)', opacity: 0.5, marginBottom: '0.75rem' }} />
              <h4 style={{ color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                Nenhum pedido de resgate encontrado
              </h4>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', margin: 0, maxWidth: '400px' }}>
                Assim que os alunos solicitarem prêmios na loja do Portal do Jovem, as solicitações aparecerão aqui para você validar e aceitar.
              </p>
            </div>
          ) : (
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Data</th>
                    <th>Aluno</th>
                    <th>Polo / Unidade</th>
                    <th>Prêmio Solicitado</th>
                    <th>Custo</th>
                    <th>Status</th>
                    <th style={{ width: '220px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {resgatesFiltrados.map((r) => {
                    const formattedDate = new Date(r.created_at).toLocaleDateString('pt-BR');
                    const isPendente = r.status === 'Pendente';
                    const isEntregue = r.status === 'Entregue';

                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>{formattedDate}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{r.jovemNome}</td>
                        <td>{r.polo}</td>
                        <td style={{ fontWeight: 600 }}>
                          {r.premioTitulo}{' '}
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 400 }}>
                            ({r.parceiroNome})
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              backgroundColor: '#0a2540',
                              color: '#ffffff',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Sparkles size={11} style={{ color: '#fbbf24' }} />
                            {r.premioCusto} pts
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${isPendente ? 'badge-atraso' : isEntregue ? 'badge-presenca' : 'badge-falta'}`}>
                            {r.status === 'Pendente' ? 'Aguardando Aprovação' : r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isPendente ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-primary"
                                onClick={() => handleAtualizarStatusResgate(r.id, 'Entregue', r.jovemNome, r.premioTitulo)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  backgroundColor: 'var(--color-secondary)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                                title="Aceitar e marcar como entregue"
                              >
                                <CheckCircle size={13} />
                                Aceitar & Entregar
                              </button>

                              <button
                                className="btn btn-outline"
                                onClick={() => handleAtualizarStatusResgate(r.id, 'Cancelado', r.jovemNome, r.premioTitulo)}
                                style={{
                                  padding: '0.4rem 0.55rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  color: 'var(--color-error)',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                  cursor: 'pointer'
                                }}
                                title="Recusar pedido e devolver pontos ao aluno"
                              >
                                <XCircle size={13} />
                              </button>
                            </div>
                          ) : isEntregue ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle size={14} />
                              Entregue com Sucesso
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                              Cancelado / Estornado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: CATÁLOGO DE PRÊMIOS (ONDE CADASTRA OS PRÊMIOS)    */}
      {/* ======================================================== */}
      {activeTab === 'catalogo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                Prêmios Disponíveis para os Alunos
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: '0.2rem 0 0 0' }}>
                Os prêmios com status <b>Ativo</b> aparecem imediatamente na área do aluno para resgate com pontos.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="btn btn-primary"
              style={{
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--color-secondary)',
                border: 'none',
                color: '#ffffff'
              }}
            >
              <Plus size={16} />
              Novo Prêmio
            </button>
          </div>

          {loading ? (
            <div className="map-loading-container" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando catálogo de prêmios...</p>
            </div>
          ) : premios.length === 0 ? (
            <div className="empty-tab-state" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3.5rem 1rem', background: '#fff', borderRadius: '8px', border: '1px dashed rgba(10,37,64,0.15)' }}>
              <Award size={40} style={{ color: 'var(--color-text-light)', opacity: 0.5, marginBottom: '0.85rem' }} />
              <h4 style={{ color: 'var(--color-primary)', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
                Nenhum prêmio cadastrado no momento
              </h4>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', margin: '0 0 1.25rem 0', maxWidth: '420px', lineHeight: 1.5 }}>
                Cadastre o primeiro prêmio ou recompensa para incentivar a frequência, relatos e engajamento dos jovens no Programa Descubra.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="btn btn-primary"
                style={{
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'var(--color-secondary)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem'
                }}
              >
                <Plus size={16} />
                Cadastrar Primeiro Prêmio
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>
              {premios.map((p) => (
                <div key={p.id} className="premio-card" style={{ opacity: p.ativo ? 1 : 0.65 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          backgroundColor: p.ativo ? 'rgba(13, 92, 58, 0.1)' : 'rgba(10, 37, 64, 0.08)',
                          color: p.ativo ? 'var(--color-secondary)' : 'var(--color-text-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Gift size={20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                            {p.titulo}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building2 size={12} /> {p.parceiro_nome}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          backgroundColor: '#0a2540',
                          color: '#ffffff',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          boxShadow: '0 2px 6px rgba(10, 37, 64, 0.18)',
                          letterSpacing: '0.02em',
                          flexShrink: 0
                        }}
                      >
                        <Sparkles size={13} style={{ color: '#fbbf24' }} />
                        {p.custo_pontos} pts
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', margin: '0 0 1rem 0', lineHeight: 1.5, minHeight: '36px' }}>
                      {p.descricao || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(10,37,64,0.06)', paddingTop: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(p)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: p.ativo ? 'var(--color-secondary)' : 'var(--color-text-light)'
                      }}
                      title="Clique para alternar visibilidade no portal do aluno"
                    >
                      {p.ativo ? <Eye size={15} /> : <EyeOff size={15} />}
                      {p.ativo ? 'Disponível no Portal do Aluno' : 'Oculto / Inativo'}
                    </button>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(p)}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Editar prêmio"
                      >
                        <Edit size={13} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePremio(p)}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center' }}
                        title="Excluir prêmio"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE PRÊMIO                     */}
      {/* ======================================================== */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <button className="modal-close-btn" onClick={() => setIsModalOpen(false)} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="admin-form-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-orange)', marginBottom: '0.3rem' }}>
            <Award size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {modalMode === 'edit' ? 'Editar Prêmio' : 'Novo Prêmio'}
            </span>
          </div>
          <h2 className="admin-form-title">
            {modalMode === 'edit' ? 'Alterar Prêmio do Catálogo' : 'Cadastrar Prêmio para os Alunos'}
          </h2>
          <p className="admin-form-subtitle">
            Configure as informações do prêmio que ficará disponível para troca por pontos no Portal do Aluno.
          </p>
        </div>

        <form onSubmit={handleSavePremio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="filter-lbl" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Título do Prêmio *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Fone de Ouvido Bluetooth, Mochila Descubra, Vale Livraria..."
              className="filter-input"
              value={formPremio.titulo}
              onChange={(e) => setFormPremio({ ...formPremio, titulo: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="filter-lbl" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Empresa Parceira / Doadora *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Natura, Senai, Livraria Central..."
                className="filter-input"
                value={formPremio.parceiro_nome}
                onChange={(e) => setFormPremio({ ...formPremio, parceiro_nome: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="filter-lbl" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Custo em Pontos *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ex: 100"
                className="filter-input"
                value={formPremio.custo_pontos}
                onChange={(e) => setFormPremio({ ...formPremio, custo_pontos: parseInt(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="filter-lbl" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Descrição & Instruções de Retirada
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Vale-compras para materiais escolares ou livros. Retirada diretamente no CRAS portando documento com foto."
              className="filter-input"
              value={formPremio.descricao}
              onChange={(e) => setFormPremio({ ...formPremio, descricao: e.target.value })}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem', backgroundColor: 'rgba(10,37,64,0.02)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(10,37,64,0.06)' }}>
            <input
              type="checkbox"
              id="check-ativo"
              checked={formPremio.ativo}
              onChange={(e) => setFormPremio({ ...formPremio, ativo: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="check-ativo" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}>
              Disponibilizar imediatamente para resgate no Portal do Aluno
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(10,37,64,0.08)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="btn btn-primary"
              style={{
                fontSize: '0.85rem',
                padding: '0.65rem 1.5rem',
                backgroundColor: 'var(--color-secondary)',
                border: 'none',
                color: '#ffffff'
              }}
            >
              {formSubmitting ? 'Salvando...' : modalMode === 'edit' ? 'Atualizar Prêmio' : 'Cadastrar Prêmio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
