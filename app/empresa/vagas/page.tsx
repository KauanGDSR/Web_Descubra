'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/ui/Modal';
import CardEditBtn from '@/components/ui/CardEditBtn';
import { useDialog } from '@/components/ui/CustomDialog';
import { Briefcase, Award, Clock, DollarSign, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';

interface Vacancy {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  quantidade_vagas: number;
  cargo: string | null;
  horario: string | null;
  bolsa_auxilio: number;
  idade_minima: number;
  escolaridade_exigida: string | null;
  competencias_desejadas: string | null;
  created_at: string;
}

const EMPTY_VACANCY = {
  titulo: '',
  descricao: '',
  tipo: 'Aprendizagem',
  quantidade_vagas: 1,
  cargo: '',
  horario_inicio: '',
  horario_fim: '',
  bolsa_auxilio: 0,
  idade_minima: 14,
  escolaridade_exigida: 'Ensino Fundamental Incompleto',
  competencias_desejadas: ''
};

export default function VagasPage() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editVacancyId, setEditVacancyId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_VACANCY);
  const [submitting, setSubmitting] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      setCompanyId(user.id);

      const { data, error } = await supabase
        .from('vagas_disponiveis')
        .select('*')
        .eq('empresa_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVacancies(data || []);
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro de Conexão', 'Não foi possível buscar as vagas do Supabase.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVacancies();
  }, []);

  const openNew = () => {
    setForm(EMPTY_VACANCY);
    setEditVacancyId(null);
    setModalOpen(true);
  };

  const openEdit = (vacancy: Vacancy) => {
    setEditVacancyId(vacancy.id);
    let start = '';
    let end = '';
    if (vacancy.horario && vacancy.horario.includes(' às ')) {
      const parts = vacancy.horario.split(' às ');
      start = parts[0] || '';
      end = parts[1] || '';
    }
    setForm({
      titulo: vacancy.titulo,
      descricao: vacancy.descricao,
      tipo: vacancy.tipo,
      quantidade_vagas: vacancy.quantidade_vagas,
      cargo: vacancy.cargo || '',
      horario_inicio: start,
      horario_fim: end,
      bolsa_auxilio: vacancy.bolsa_auxilio,
      idade_minima: vacancy.idade_minima,
      escolaridade_exigida: vacancy.escolaridade_exigida || 'Ensino Fundamental Incompleto',
      competencias_desejadas: vacancy.competencias_desejadas || ''
    });
    setModalOpen(true);
  };

  const requestClose = () => {
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);

    try {
      const horarioConcatenado = form.horario_inicio && form.horario_fim
        ? `${form.horario_inicio} às ${form.horario_fim}`
        : null;

      const dbEntry = {
        empresa_id: companyId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        tipo: form.tipo,
        quantidade_vagas: Number(form.quantidade_vagas),
        cargo: form.cargo.trim() || null,
        horario: horarioConcatenado,
        bolsa_auxilio: Number(form.bolsa_auxilio),
        idade_minima: Number(form.idade_minima),
        escolaridade_exigida: form.escolaridade_exigida || null,
        competencias_desejadas: form.competencias_desejadas.trim() || null,
        status: editVacancyId ? undefined : 'Aberta' // Status inicial é Aberta ao cadastrar
      };

      if (editVacancyId) {
        const { error } = await supabase
          .from('vagas_disponiveis')
          .update(dbEntry)
          .eq('id', editVacancyId);
        if (error) throw error;
        await dialog.alert('Sucesso', 'Vaga atualizada com sucesso.', 'success');
      } else {
        const { error } = await supabase
          .from('vagas_disponiveis')
          .insert(dbEntry);
        if (error) throw error;
        await dialog.alert('Sucesso', 'Nova vaga publicada com sucesso.', 'success');
      }

      setModalOpen(false);
      loadVacancies();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar gravar dados no Supabase.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const isClosing = newStatus === 'Preenchida';
    const actionLabel = isClosing ? 'Preencher Vaga' : 'Cancelar Vaga';
    const confirmMsg = isClosing
      ? 'Tem certeza que deseja marcar esta vaga como preenchida? Ela não receberá novos encaminhamentos.'
      : 'Tem certeza que deseja cancelar esta vaga? Todos os encaminhamentos pendentes serão desconsiderados.';

    const ok = await dialog.confirm(actionLabel, confirmMsg, isClosing ? 'warning' : 'danger');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('vagas_disponiveis')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await dialog.alert('Status Atualizado', `Vaga atualizada para "${newStatus}".`, 'success');
      loadVacancies();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', 'Não foi possível atualizar o status da vaga.', 'danger');
    }
  };

  const set = (k: keyof typeof EMPTY_VACANCY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const filteredVacancies = vacancies.filter(v =>
    filterStatus === 'Todos' ? true : v.status === filterStatus
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Vagas Publicadas</h2>
          <p className="admin-form-subtitle">Gerencie as vagas de aprendizagem profissional e emprego</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNew}
          style={{ borderRadius: 'var(--border-radius-sm)', padding: '0.65rem 1.25rem', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-secondary)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Publicar Vaga
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(10,37,64,0.08)', paddingBottom: '0.75rem' }}>
        {['Todos', 'Aberta', 'Preenchida', 'Cancelada'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-outline'}`}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--border-radius-sm)',
              boxShadow: 'none',
              backgroundColor: filterStatus === status ? 'var(--color-primary)' : 'transparent',
              borderColor: 'rgba(10,37,64,0.12)',
              color: filterStatus === status ? '#fff' : 'var(--color-text-dark)'
            }}
          >
            {status === 'Todos' ? 'Todas' : status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px' }}>
          <div className="map-spinner"></div>
          <p>Carregando vagas publicadas...</p>
        </div>
      ) : filteredVacancies.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhuma vaga encontrada para o filtro selecionado.</p>
        </div>
      ) : (
        /* Vagas Grid Layout */
        <div className="company-cards-grid">
          {filteredVacancies.map((v) => {
            const isAberta = v.status === 'Aberta';
            return (
              <div key={v.id} className="company-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '320px' }}>
                <CardEditBtn onClick={() => openEdit(v)} title="Editar vaga" />
                <div>
                  <div className="company-card-header" style={{ marginBottom: '0.75rem' }}>
                    <div className="company-card-avatar" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
                      <Briefcase size={20} />
                    </div>
                    <div className="company-card-title-group" style={{ paddingRight: '2rem' }}>
                      <span className="company-card-name" style={{ fontSize: '1rem', fontWeight: 700 }}>{v.titulo}</span>
                      <span className="company-card-cnpj-city" style={{ fontSize: '0.75rem' }}>
                        {v.tipo} • {v.quantidade_vagas} {v.quantidade_vagas > 1 ? 'vagas' : 'vaga'}
                      </span>
                    </div>
                  </div>

                  <div className="company-card-badges" style={{ marginBottom: '1rem' }}>
                    <span className={`company-card-badge status-${v.status === 'Aberta' ? 'active' : v.status === 'Preenchida' ? 'active' : 'inactive'}`} style={{
                      backgroundColor: v.status === 'Aberta' ? 'rgba(16, 185, 129, 0.1)' : v.status === 'Preenchida' ? 'rgba(13, 92, 58, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: v.status === 'Aberta' ? 'var(--color-secondary)' : v.status === 'Preenchida' ? '#0d5c3a' : 'var(--color-error)'
                    }}>
                      {v.status}
                    </span>
                    {v.cargo && <span className="company-card-tag" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>{v.cargo}</span>}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', lineHeight: '1.4', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {v.descricao}
                  </p>

                  <div className="company-card-details" style={{ borderTop: '1px dashed rgba(10,37,64,0.06)', paddingTop: '0.75rem' }}>
                    {v.horario && (
                      <div className="company-card-detail-item">
                        <span className="company-card-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> Horário</span>
                        <span className="company-card-detail-value">{v.horario}</span>
                      </div>
                    )}
                    <div className="company-card-detail-item">
                      <span className="company-card-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><DollarSign size={12} /> Bolsa/Auxílio</span>
                      <span className="company-card-detail-value">{v.bolsa_auxilio > 0 ? `R$ ${v.bolsa_auxilio.toFixed(2)}` : 'A combinar'}</span>
                    </div>
                    <div className="company-card-detail-item">
                      <span className="company-card-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> Idade Mínima</span>
                      <span className="company-card-detail-value">{v.idade_minima} anos</span>
                    </div>
                    {v.escolaridade_exigida && (
                      <div className="company-card-detail-item">
                        <span className="company-card-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Award size={12} /> Escolaridade</span>
                        <span className="company-card-detail-value" style={{ fontSize: '0.72rem' }}>{v.escolaridade_exigida}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status action buttons */}
                {isAberta && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid rgba(10,37,64,0.04)', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => updateStatus(v.id, 'Preenchida')}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
                    >
                      <CheckCircle size={12} />
                      Preenchida
                    </button>
                    <button
                      onClick={() => updateStatus(v.id, 'Cancelada')}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                    >
                      <XCircle size={12} />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={requestClose}>
        <button className="modal-close-btn" onClick={requestClose} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="admin-form-header">
          <h2 className="admin-form-title">{editVacancyId ? 'Editar Oportunidade' : 'Publicar Nova Oportunidade'}</h2>
          <p className="admin-form-subtitle">Preencha os detalhes da vaga a ser divulgada no Programa Descubra!</p>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid-form">
            <div className="form-group full-width">
              <label className="form-label">Título da Vaga *</label>
              <input className="form-control" value={form.titulo} onChange={set('titulo')} placeholder="Ex: Jovem Aprendiz Auxiliar Administrativo" required />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Descrição das Atividades *</label>
              <textarea
                className="form-control"
                value={form.descricao}
                onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva as principais atribuições da vaga..."
                style={{ minHeight: '80px', fontFamily: 'inherit', padding: '0.65rem' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Contrato *</label>
              <select className="form-control" value={form.tipo} onChange={set('tipo')} required>
                <option value="Aprendizagem">Aprendizagem Profissional (Jovem Aprendiz)</option>
                <option value="Emprego">Emprego Formal CLT (+18 anos)</option>
                <option value="Estágio">Estágio Supervisionado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade de Vagas *</label>
              <input className="form-control" type="number" min={1} value={form.quantidade_vagas} onChange={set('quantidade_vagas')} required />
            </div>

            <div className="form-group">
              <label className="form-label">Cargo ou CBO (Opcional)</label>
              <input className="form-control" value={form.cargo} onChange={set('cargo')} placeholder="Ex: Auxiliar de Escritório" />
            </div>

            <div className="form-group">
              <label className="form-label">Bolsa ou Salário (R$)</label>
              <input className="form-control" type="number" min={0} value={form.bolsa_auxilio} onChange={set('bolsa_auxilio')} placeholder="Ex: 750.00" />
            </div>

            <div className="form-group">
              <label className="form-label">Horário de Início</label>
              <input className="form-control" type="time" value={form.horario_inicio} onChange={set('horario_inicio')} />
            </div>

            <div className="form-group">
              <label className="form-label">Horário de Fim</label>
              <input className="form-control" type="time" value={form.horario_fim} onChange={set('horario_fim')} />
            </div>

            <div className="form-group">
              <label className="form-label">Idade Mínima Exigida *</label>
              <input className="form-control" type="number" min={14} max={21} value={form.idade_minima} onChange={set('idade_minima')} required />
            </div>

            <div className="form-group">
              <label className="form-label">Escolaridade Mínima</label>
              <select className="form-control" value={form.escolaridade_exigida} onChange={set('escolaridade_exigida')}>
                <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                <option value="Ensino Médio Completo">Ensino Médio Completo</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Habilidades ou Competências Desejadas (Opcional)</label>
              <input className="form-control" value={form.competencias_desejadas} onChange={set('competencias_desejadas')} placeholder="Ex: Boa comunicação, pacote Office básico, proatividade" />
            </div>
          </div>

          <div className="form-actions-wrapper" style={{ marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={requestClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }} disabled={submitting}>
              {submitting ? 'Salvando...' : editVacancyId ? 'Salvar Alterações' : 'Publicar Vaga'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
