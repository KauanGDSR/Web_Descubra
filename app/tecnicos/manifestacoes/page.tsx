'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Building2, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Edit3, 
  AlertCircle,
  Loader2,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useDialog } from '@/frontend/components/ui/CustomDialog';

interface ManifestacaoItem {
  id: string;
  vaga_id: string;
  jovem_id: string;
  tecnico_id: string | null;
  status: string;
  feedback_tecnico: string | null;
  feedback_jovem: string | null;
  feedback_empresa: string | null;
  created_at: string;
  updated_at: string;
  jovens?: {
    id: string;
    nome_completo: string;
    nome_social: string | null;
    cpf: string;
    data_nascimento: string | null;
    telefone_contato: string | null;
    telefone_whatsapp: string | null;
    email: string | null;
    pontuacao_atual: number | null;
    equipamentos?: {
      id: string;
      nome: string;
      tipo: string;
      cidades?: {
        nome: string;
      };
    };
  };
  vagas_disponiveis?: {
    id: string;
    titulo: string;
    tipo: string | null;
    status: string;
    horario: string | null;
    cargo: string | null;
    bolsa_auxilio: number | null;
    empresas_parceiras?: {
      id: string;
      razao_social: string;
      nome_fantasia: string | null;
      cidades?: {
        nome: string;
      };
    };
  };
}

export default function TecnicoManifestacoesPage() {
  const dialog = useDialog();
  const [manifestacoes, setManifestacoes] = useState<ManifestacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  // Modal de edição de parecer técnico
  const [editingItem, setEditingItem] = useState<ManifestacaoItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editFeedback, setEditFeedback] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchManifestacoes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tecnicos/manifestacoes');
      if (res.ok) {
        const data = await res.json();
        setManifestacoes(data.manifestacoes || []);
      } else {
        console.error('Falha ao buscar manifestações');
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifestacoes();
  }, []);

  const handleOpenEdit = (item: ManifestacaoItem) => {
    setEditingItem(item);
    setEditStatus(item.status);
    setEditFeedback(item.feedback_tecnico || '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    try {
      const res = await fetch('/api/tecnicos/manifestacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          status: editStatus,
          feedback_tecnico: editFeedback,
        }),
      });

      if (res.ok) {
        setManifestacoes((prev) =>
          prev.map((m) =>
            m.id === editingItem.id
              ? { ...m, status: editStatus, feedback_tecnico: editFeedback, updated_at: new Date().toISOString() }
              : m
          )
        );
        setEditingItem(null);
        dialog.alert('Sucesso', 'Encaminhamento atualizado com sucesso!', 'success');
        
        // Notifica o sidebar para atualizar a contagem de badges
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('update-admin-badges'));
        }
      } else {
        const errJson = await res.json();
        dialog.alert('Erro', errJson.error || 'Falha ao atualizar status.', 'danger');
      }
    } catch {
      dialog.alert('Erro', 'Erro de comunicação ao salvar atualização.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Filtros
  const filtered = useMemo(() => {
    return manifestacoes.filter((m) => {
      const jovenNome = (m.jovens?.nome_social || m.jovens?.nome_completo || '').toLowerCase();
      const vagaTitulo = (m.vagas_disponiveis?.titulo || '').toLowerCase();
      const empresaNome = (m.vagas_disponiveis?.empresas_parceiras?.nome_fantasia || m.vagas_disponiveis?.empresas_parceiras?.razao_social || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || jovenNome.includes(term) || vagaTitulo.includes(term) || empresaNome.includes(term);

      if (!matchesSearch) return false;

      if (selectedStatus === 'todos') return true;
      if (selectedStatus === 'pendentes') return m.status === 'Interesse Manifestado' || m.status === 'Pendente';
      if (selectedStatus === 'entrevistas') return m.status === 'Entrevista Agendada';
      if (selectedStatus === 'encaminhados') return m.status === 'Encaminhado' || m.status === 'Aprovado';
      if (selectedStatus === 'recusados') return m.status === 'Recusado' || m.status === 'Reprovado';

      return m.status === selectedStatus;
    });
  }, [manifestacoes, searchTerm, selectedStatus]);

  // Contagens
  const stats = useMemo(() => {
    const total = manifestacoes.length;
    const pendentes = manifestacoes.filter((m) => m.status === 'Interesse Manifestado' || m.status === 'Pendente').length;
    const entrevistas = manifestacoes.filter((m) => m.status === 'Entrevista Agendada').length;
    const concluidos = manifestacoes.filter((m) => m.status === 'Encaminhado' || m.status === 'Aprovado').length;
    return { total, pendentes, entrevistas, concluidos };
  }, [manifestacoes]);

  const cleanPhone = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length >= 10) return `55${digits}`;
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.25s ease-out' }}>
      {/* Cabeçalho */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: '#f1f5f9', color: 'var(--color-primary)', padding: '0.5rem', borderRadius: '0.75rem' }}>
            <Briefcase size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', color: 'var(--color-primary)', margin: 0, fontWeight: 800 }}>
              Manifestações de Vagas & Encaminhamentos
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
              Acompanhe o interesse dos jovens nas vagas parceiras, avalie perfis socioeducativos e registre orientações técnicas.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total de Pedidos</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #fde68a', backgroundColor: '#fffbeb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase' }}>Aguardando Avaliação</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>{stats.pendentes}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Entrevistas Agendadas</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>{stats.entrevistas}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Encaminhados / Concluídos</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>{stats.concluidos}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por nome do aluno, vaga ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendentes', label: `Pendentes (${stats.pendentes})` },
              { id: 'entrevistas', label: `Entrevistas (${stats.entrevistas})` },
              { id: 'encaminhados', label: `Encaminhados (${stats.concluidos})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedStatus === tab.id ? '1px solid var(--color-primary)' : '1px solid #e2e8f0',
                  background: selectedStatus === tab.id ? 'var(--color-primary)' : '#f8fafc',
                  color: selectedStatus === tab.id ? '#fff' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Manifestações */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', flexDirection: 'column', gap: '0.75rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando manifestações de vagas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <Briefcase size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
            Nenhuma manifestação encontrada
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            {searchTerm ? 'Tente ajustar os termos de busca.' : 'Ainda não há manifestações registradas nesta categoria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((item) => {
            const jovem = item.jovens;
            const vaga = item.vagas_disponiveis;
            const empresa = vaga?.empresas_parceiras;
            const isPendente = item.status === 'Interesse Manifestado' || item.status === 'Pendente';
            const whatsappNum = cleanPhone(jovem?.telefone_whatsapp || jovem?.telefone_contato);

            const statusColors: Record<string, { bg: string; text: string; border: string }> = {
              'Interesse Manifestado': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
              'Pendente': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
              'Em Análise': { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
              'Entrevista Agendada': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
              'Encaminhado': { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
              'Aprovado': { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
              'Recusado': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
              'Reprovado': { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
            };

            const colors = statusColors[item.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

            return (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: isPendente ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Linha Superior: Jovem e Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}>
                      {(jovem?.nome_social || jovem?.nome_completo || 'J')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                        {jovem?.nome_social ? `${jovem.nome_social} (${jovem.nome_completo})` : (jovem?.nome_completo || 'Aluno(a)')}
                      </h4>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        {jovem?.equipamentos?.nome || 'Unidade Socioassistencial'} &bull; {jovem?.equipamentos?.cidades?.nome || 'Minas Gerais'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}>
                      {item.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: 'var(--color-primary)',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Edit3 size={14} /> Avaliar / Atualizar
                    </button>
                  </div>
                </div>

                {/* Bloco de Vaga de Interesse */}
                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Vaga Desejada</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{vaga?.titulo || 'Oportunidade'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Empresa Parceira</span>
                    <strong style={{ color: 'var(--color-text)' }}>{empresa?.nome_fantasia || empresa?.razao_social || 'Empresa'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Data da Manifestação</span>
                    <strong style={{ color: 'var(--color-text)' }}>
                      {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Pontos do Aluno</span>
                    <strong style={{ color: 'var(--color-orange)' }}>{jovem?.pontuacao_atual ?? 0} pts</strong>
                  </div>
                </div>

                {/* Orientações e Feedbacks */}
                {item.feedback_tecnico && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.82rem', color: '#1e40af' }}>
                    <strong>Parecer Técnico:</strong> {item.feedback_tecnico}
                  </div>
                )}

                {item.feedback_empresa && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.82rem', color: '#166534' }}>
                    <strong>Retorno da Empresa / Entrevista:</strong> {item.feedback_empresa}
                  </div>
                )}

                {/* Botões de Contato Rápido */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                  {whatsappNum && (
                    <a
                      href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(`Olá ${jovem?.nome_social || jovem?.nome_completo}, sou da equipe técnica do Programa Descubra e estou entrando em contato sobre seu interesse na vaga "${vaga?.titulo}".`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#16a34a',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                      }}
                    >
                      <MessageCircle size={15} /> WhatsApp do Aluno ({jovem?.telefone_whatsapp || jovem?.telefone_contato})
                    </a>
                  )}

                  {jovem?.email && (
                    <a
                      href={`mailto:${jovem.email}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#475569',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                      }}
                    >
                      E-mail: {jovem.email}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Avaliação / Atualização de Status */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingItem(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 0.5rem 0' }}>
              Atualizar Encaminhamento
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
              Aluno: <strong>{editingItem.jovens?.nome_social || editingItem.jovens?.nome_completo}</strong> &bull; Vaga: <strong>{editingItem.vagas_disponiveis?.titulo}</strong>
            </p>

            <form onSubmit={handleSaveStatus}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Status do Encaminhamento
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                  required
                >
                  <option value="Interesse Manifestado">Interesse Manifestado (Aguardando Análise)</option>
                  <option value="Em Análise">Em Análise Técnica Socioassistencial</option>
                  <option value="Entrevista Agendada">Entrevista Agendada com a Empresa</option>
                  <option value="Encaminhado">Encaminhado Oficialmente</option>
                  <option value="Aprovado">Aprovado no Processo Seletivo</option>
                  <option value="Recusado">Não Recomendado / Perfil Divergente</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Parecer Técnico & Recomendações
                </label>
                <textarea
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  rows={4}
                  placeholder="Orientações para o jovem (ex: dicas para entrevista, documentos necessários, justificativa técnica)..."
                  className="form-control"
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                  Este parecer orienta o jovem sobre sua preparação para o mercado de trabalho.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn"
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  Salvar Atualização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
