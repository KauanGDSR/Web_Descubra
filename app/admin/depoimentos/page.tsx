'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useDialog } from '@/components/ui/CustomDialog';
import { Clock, MessageSquare, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';

interface Depoimento {
  id: string;
  texto_trajetoria: string;
  status_aprovacao: 'Pendente' | 'Aprovado' | 'Rejeitado';
  data_envio: string;
  jovemNome: string;
  jovemId: string;
  polo: string;
}

export default function DepoimentosPage() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('depoimentos_alunos')
        .select(`
          id,
          texto_trajetoria,
          status_aprovacao,
          data_envio,
          jovens (
            id,
            nome_completo,
            nome_social,
            equipamentos (
              nome
            )
          )
        `)
        .order('data_envio', { ascending: false });

      if (error) throw error;

      const mapped: Depoimento[] = (data || []).map((item: any) => ({
        id: item.id,
        texto_trajetoria: item.texto_trajetoria,
        status_aprovacao: item.status_aprovacao,
        data_envio: item.data_envio,
        jovemNome: item.jovens?.nome_social || item.jovens?.nome_completo || 'Sem nome',
        jovemId: item.jovens?.id || '',
        polo: item.jovens?.equipamentos?.nome || 'Sem polo'
      }));

      setDepoimentos(mapped);
    } catch (err: any) {
      console.error('Erro ao carregar depoimentos:', err);
      dialog.alert('Erro de Conexão', 'Não foi possível carregar as publicações de depoimentos.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAprovar = async (id: string, jovemNome: string) => {
    const ok = await dialog.confirm('Confirmar Aprovação', `Deseja aprovar e publicar o depoimento de <b>${jovemNome}</b>?`, 'warning');
    if (!ok) return;

    setActioningId(id);
    try {
      const { error } = await supabase
        .from('depoimentos_alunos')
        .update({ status_aprovacao: 'Aprovado' })
        .eq('id', id);

      if (error) throw error;

      dialog.alert('Depoimento Aprovado', `O relato de <b>${jovemNome}</b> foi publicado com sucesso!`, 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar atualizar status no Supabase.', 'danger');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejeitar = async (id: string, jovemNome: string) => {
    const ok = await dialog.confirm('Confirmar Rejeição', `Deseja rejeitar o relato de <b>${jovemNome}</b>? Ele será devolvido para ajustes do aluno.`, 'warning');
    if (!ok) return;

    setActioningId(id);
    try {
      const { error } = await supabase
        .from('depoimentos_alunos')
        .update({ status_aprovacao: 'Rejeitado' })
        .eq('id', id);

      if (error) throw error;

      dialog.alert('Depoimento Rejeitado', `O relato de <b>${jovemNome}</b> foi rejeitado.`, 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar atualizar status no Supabase.', 'danger');
    } finally {
      setActioningId(null);
    }
  };

  const filtered = depoimentos.filter(d => {
    const matchesSearch = d.jovemNome.toLowerCase().includes(searchTerm.toLowerCase()) || d.texto_trajetoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || d.status_aprovacao === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendentesCount = depoimentos.filter(d => d.status_aprovacao === 'Pendente').length;
  const aprovadosCount = depoimentos.filter(d => d.status_aprovacao === 'Aprovado').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Dynamic Styles */}
      <style>{`
        .testimonials-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .testimonial-card {
          background: #ffffff;
          border: 1.5px solid rgba(10,37,64,0.06);
          border-radius: var(--border-radius-sm);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .testimonial-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: rgba(13, 92, 58, 0.12);
        }
        .testimonial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .testimonial-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: var(--color-primary);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-title);
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .testimonial-author-info h4 {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--color-primary);
          margin: 0;
        }
        .testimonial-author-info p {
          font-size: 0.75rem;
          color: var(--color-text-light);
          margin: 0.15rem 0 0 0;
        }
        .testimonial-text-bubble {
          font-size: 0.88rem;
          color: var(--color-text-dark);
          font-style: italic;
          line-height: 1.6;
          background-color: rgba(10,37,64,0.02);
          padding: 1rem 1.25rem;
          border-radius: 8px;
          border-left: 3.5px solid var(--color-orange);
          margin: 0;
        }
        .testimonial-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          border-top: 1px dashed rgba(10,37,64,0.08);
          padding-top: 1rem;
          margin-top: 0.25rem;
        }
      `}</style>

      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Depoimentos de Alunos</h2>
          <p className="admin-form-subtitle">Valide relatos de trajetória dos jovens para publicação no mural institucional</p>
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
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="report-stat-val">{pendentesCount}</div>
            <div className="report-stat-lbl">Depoimentos Pendentes</div>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon" style={{ backgroundColor: 'rgba(13, 92, 58, 0.1)', color: 'var(--color-secondary)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="report-stat-val">{aprovadosCount}</div>
            <div className="report-stat-lbl">Relatos Publicados</div>
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
            placeholder="Nome do jovem ou conteúdo do relato..."
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
            <option value="Aprovado">Aprovados</option>
            <option value="Rejeitado">Rejeitados</option>
          </select>
        </div>
      </div>

      {/* Testimonials List */}
      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%' }}>
          <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando depoimentos do Supabase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhum depoimento encontrado.</p>
        </div>
      ) : (
        <div className="testimonials-grid">
          {filtered.map((d) => {
            const formattedDate = new Date(d.data_envio).toLocaleDateString('pt-BR');
            const isPendente = d.status_aprovacao === 'Pendente';
            const isAprovado = d.status_aprovacao === 'Aprovado';

            return (
              <div key={d.id} className="testimonial-card">
                {/* Header card info */}
                <div className="testimonial-header">
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">
                      {d.jovemNome.charAt(0).toUpperCase()}
                    </div>
                    <div className="testimonial-author-info">
                      <h4>{d.jovemNome}</h4>
                      <p>Pólo: {d.polo} • Enviado em: {formattedDate}</p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`badge-status ${
                        isAprovado ? 'badge-presenca' : d.status_aprovacao === 'Rejeitado' ? 'badge-falta' : 'badge-atraso'
                      }`}
                      style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                    >
                      {d.status_aprovacao}
                    </span>
                  </div>
                </div>

                {/* Speech Bubble Quote */}
                <blockquote className="testimonial-text-bubble">
                  "{d.texto_trajetoria}"
                </blockquote>

                {/* Actions */}
                {isPendente && (
                  <div className="testimonial-actions">
                    <button
                      className="btn"
                      disabled={actioningId === d.id}
                      onClick={() => handleRejeitar(d.id, d.jovemNome)}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        border: '1.5px solid rgba(239, 68, 68, 0.3)',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 700
                      }}
                    >
                      <ThumbsDown size={13} />
                      Rejeitar
                    </button>
                    <button
                      className="btn"
                      disabled={actioningId === d.id}
                      onClick={() => handleAprovar(d.id, d.jovemNome)}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        border: 'none',
                        backgroundColor: 'var(--color-secondary)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 700
                      }}
                    >
                      <ThumbsUp size={13} />
                      Aprovar Publicação
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
