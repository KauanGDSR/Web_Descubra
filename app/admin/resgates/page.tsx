'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useDialog } from '@/components/ui/CustomDialog';
import { Clock, Gift, CheckCircle } from 'lucide-react';

interface Resgate {
  id: string;
  status: 'Pendente' | 'Entregue';
  created_at: string;
  jovemNome: string;
  polo: string;
  premioTitulo: string;
  premioCusto: number;
  parceiroNome: string;
}

export default function ResgatesPage() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [resgates, setResgates] = useState<Resgate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resgates_premios')
        .select(`
          id,
          status,
          created_at,
          jovens (
            nome_completo,
            nome_social,
            equipamentos (
              nome
            )
          ),
          premios_parceiros (
            titulo,
            custo_pontos,
            parceiro_nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Resgate[] = (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        jovemNome: item.jovens?.nome_social || item.jovens?.nome_completo || 'Sem nome',
        polo: item.jovens?.equipamentos?.nome || 'Sem polo',
        premioTitulo: item.premios_parceiros?.titulo || 'Prêmio indisponível',
        premioCusto: item.premios_parceiros?.custo_pontos || 0,
        parceiroNome: item.premios_parceiros?.parceiro_nome || '—'
      }));

      setResgates(mapped);
    } catch (err: any) {
      console.error('Erro ao carregar resgates:', err);
      dialog.alert('Erro de Conexão', 'Não foi possível carregar as solicitações de resgates.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEntregar = async (id: string, jovemNome: string, premio: string) => {
    const ok = await dialog.confirm('Confirmar Entrega', `Deseja marcar o prêmio <b>${premio}</b> para <b>${jovemNome}</b> como entregue?`, 'warning');
    if (!ok) return;

    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('resgates_premios')
        .update({ status: 'Entregue' })
        .eq('id', id);

      if (error) throw error;

      dialog.alert('Prêmio Entregue', `O resgate de <b>${jovemNome}</b> foi marcado como entregue com sucesso!`, 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Atualizar', err.message || 'Erro ao tentar gravar no Supabase.', 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = resgates.filter(r => {
    const matchesSearch = r.jovemNome.toLowerCase().includes(searchTerm.toLowerCase()) || r.premioTitulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendentesCount = resgates.filter(r => r.status === 'Pendente').length;
  const entreguesCount = resgates.filter(r => r.status === 'Entregue').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Gestão de Resgates</h2>
          <p className="admin-form-subtitle">Gerencie e valide as entregas de prêmios solicitadas pelos jovens</p>
        </div>
        <button
          onClick={loadData}
          className="btn btn-outline"
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(10,37,64,0.2)' }}
        >
          <Clock size={14} style={{ color: 'var(--color-orange)' }} />
          Atualizar Lista
        </button>
      </div>

      {/* Stats Summary Grid (Aligned Horizontal) */}
      <div className="stats-grid-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
            <Gift size={22} />
          </div>
          <div>
            <div className="report-stat-val">{pendentesCount}</div>
            <div className="report-stat-lbl">Resgates Pendentes</div>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(13, 92, 58, 0.1)', color: 'var(--color-secondary)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="report-stat-val">{entreguesCount}</div>
            <div className="report-stat-lbl">Prêmios Entregues</div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="filter-row">
        <div className="filter-item" style={{ flex: '2', minWidth: '200px' }}>
          <label className="filter-lbl">Pesquisar</label>
          <input
            className="filter-input"
            type="text"
            placeholder="Nome do jovem ou prêmio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label className="filter-lbl">Status</label>
          <select
            className="filter-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="Pendente">Pendentes</option>
            <option value="Entregue">Entregues</option>
          </select>
        </div>
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando resgates do Supabase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhum resgate encontrado.</p>
        </div>
      ) : (
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Data</th>
                <th>Jovem</th>
                <th>Pólo</th>
                <th>Prêmio</th>
                <th>Custo</th>
                <th>Status</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const formattedDate = new Date(r.created_at).toLocaleDateString('pt-BR');
                const isPendente = r.status === 'Pendente';

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
                      <span className="points-pill" style={{ fontSize: '0.7rem' }}>
                        {r.premioCusto} pts
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${isPendente ? 'badge-atraso' : 'badge-presenca'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isPendente ? (
                        <button
                          className="btn btn-primary"
                          disabled={updatingId === r.id}
                          onClick={() => handleEntregar(r.id, r.jovemNome, r.premioTitulo)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            backgroundColor: 'var(--color-secondary)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            width: '100%',
                            boxShadow: 'none'
                          }}
                        >
                          {updatingId === r.id ? 'Gravando...' : 'Entregar'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-secondary)', fontWeight: 700 }}>
                          Entregue ✔
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
  );
}
