'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/ui/Modal';
import { useDialog } from '@/components/ui/CustomDialog';
import {
  Users,
  Briefcase,
  Calendar,
  CheckCircle,
  XCircle,
  Phone,
  MessageSquare,
  Award,
  Clock,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface Youth {
  id: string;
  nome_completo: string;
  nome_social: string | null;
  idade: number;
  escolaridade: string;
  telefone: string | null;
  whatsapp: string | null;
}

interface VacancyTitle {
  titulo: string;
}

interface Referral {
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
  jovens: Youth | null;
  vagas_disponiveis: VacancyTitle | null;
}

export default function CandidatosPage() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Modal / Action State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionType, setActionType] = useState<'interview' | 'reject' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      setCompanyId(user.id);

      // 1. Busca as vagas da empresa para ter os IDs
      const { data: vacancies, error: vacErr } = await supabase
        .from('vagas_disponiveis')
        .select('id')
        .eq('empresa_id', user.id);

      if (vacErr) throw vacErr;
      const vacancyIds = (vacancies || []).map(v => v.id);

      if (vacancyIds.length === 0) {
        setReferrals([]);
        return;
      }

      // 2. Busca os encaminhamentos para essas vagas
      const { data, error } = await supabase
        .from('encaminhamentos_vagas')
        .select('*, jovens(*), vagas_disponiveis(titulo)')
        .in('vaga_id', vacancyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data as unknown as Referral[] || []);
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', 'Erro ao carregar encaminhamentos de candidatos.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferrals();
  }, []);

  const requestClose = () => {
    setActionModalOpen(false);
  };

  const openActionModal = (referral: Referral, type: 'interview' | 'reject') => {
    setSelectedReferral(referral);
    setActionType(type);
    setFeedbackText(referral.feedback_empresa || '');
    setActionModalOpen(true);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !actionType) return;
    setSubmittingAction(true);

    try {
      const newStatus = actionType === 'interview' ? 'Entrevista Agendada' : 'Reprovado';
      
      const { error } = await supabase
        .from('encaminhamentos_vagas')
        .update({
          status: newStatus,
          feedback_empresa: feedbackText.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReferral.id);

      if (error) throw error;

      await dialog.alert(
        'Sucesso', 
        actionType === 'interview' 
          ? 'Entrevista agendada com sucesso. O jovem e o técnico de referência serão notificados.'
          : 'Candidato avaliado como não selecionado.', 
        'success'
      );

      setActionModalOpen(false);
      loadReferrals();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', err.message || 'Erro ao tentar atualizar o status do candidato.', 'danger');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleHiring = async (referral: Referral) => {
    const ok = await dialog.confirm(
      'Confirmar Contratação',
      `Tem certeza que deseja marcar <b>${referral.jovens?.nome_social || referral.jovens?.nome_completo}</b> como contratado? Esta ação atualizará o status do encaminhamento para "Aprovado".`,
      'success'
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('encaminhamentos_vagas')
        .update({
          status: 'Aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', referral.id);

      if (error) throw error;

      await dialog.alert('Sucesso', 'Parabéns pela contratação! O jovem iniciará sua trajetória na empresa parceira.', 'success');
      loadReferrals();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', 'Não foi possível registrar a contratação.', 'danger');
    }
  };

  const filteredReferrals = referrals.filter(r => {
    if (filterStatus === 'Todos') return true;
    if (filterStatus === 'Pendentes') return r.status === 'Pendente' || r.status === 'Entrevista Agendada';
    return r.status === filterStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--color-secondary)' };
      case 'Reprovado':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-error)' };
      case 'Entrevista Agendada':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--color-yellow)' };
      default: // Pendente
        return { bg: 'rgba(10, 37, 64, 0.08)', text: 'var(--color-primary)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Candidatos Encaminhados</h2>
          <p className="admin-form-subtitle">Acompanhe jovens indicados pelos assistentes sociais para suas vagas</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(10,37,64,0.08)', paddingBottom: '0.75rem' }}>
        {['Todos', 'Pendentes', 'Aprovado', 'Reprovado'].map((status) => (
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
            {status === 'Todos' ? 'Todos os candidatos' : status === 'Pendentes' ? 'Pendentes / Entrevistas' : status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px' }}>
          <div className="map-spinner"></div>
          <p>Carregando candidatos...</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhum candidato encontrado neste status.</p>
        </div>
      ) : (
        /* Candidates Grid */
        <div className="company-cards-grid">
          {filteredReferrals.map((r) => {
            const youth = r.jovens;
            if (!youth) return null;
            const style = getStatusStyle(r.status);
            const isPendente = r.status === 'Pendente' || r.status === 'Entrevista Agendada';

            return (
              <div key={r.id} className="company-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
                <div>
                  <div className="company-card-header" style={{ marginBottom: '0.75rem' }}>
                    <div className="company-card-avatar" style={{ backgroundColor: 'rgba(10, 37, 64, 0.05)', color: 'var(--color-primary)' }}>
                      {(youth.nome_social || youth.nome_completo).charAt(0)}
                    </div>
                    <div className="company-card-title-group">
                      <span className="company-card-name" style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {youth.nome_social || youth.nome_completo}
                      </span>
                      <span className="company-card-cnpj-city" style={{ fontSize: '0.75rem' }}>
                        Idade: {youth.idade} anos • Escolaridade: {youth.escolaridade}
                      </span>
                    </div>
                  </div>

                  <div className="company-card-badges" style={{ marginBottom: '1rem' }}>
                    <span className="company-card-badge" style={{ backgroundColor: style.bg, color: style.text }}>
                      {r.status}
                    </span>
                    <span className="company-card-tag" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Briefcase size={12} />
                      Vaga: {r.vagas_disponiveis?.titulo || 'Vaga Desconhecida'}
                    </span>
                  </div>

                  {/* Youth Contact info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-dark)', marginBottom: '1rem', backgroundColor: 'rgba(10,37,64,0.01)', border: '1px solid rgba(10,37,64,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={12} style={{ color: 'var(--color-text-light)' }} />
                      <span>Telefone: <b>{youth.telefone || 'Não informado'}</b></span>
                    </div>
                    {youth.whatsapp && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={12} style={{ color: '#16a5e9' }} />
                        <span>WhatsApp: <b>{youth.whatsapp}</b></span>
                      </div>
                    )}
                  </div>

                  {/* Technical observations */}
                  {r.feedback_tecnico && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', borderLeft: '2.5px solid var(--color-orange)', paddingLeft: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 700, display: 'block', color: 'var(--color-primary)' }}>Obs. do Técnico de Referência:</span>
                      "{r.feedback_tecnico}"
                    </div>
                  )}

                  {/* Company feedback */}
                  {r.feedback_empresa && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', borderLeft: '2.5px solid var(--color-secondary)', paddingLeft: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 700, display: 'block', color: 'var(--color-primary)' }}>Obs. da Empresa:</span>
                      "{r.feedback_empresa}"
                    </div>
                  )}
                </div>

                {/* Candidate Action Buttons */}
                {isPendente && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(10,37,64,0.04)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                    {r.status === 'Pendente' && (
                      <button
                        onClick={() => openActionModal(r, 'interview')}
                        className="btn btn-outline"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: 'var(--color-yellow)', color: '#b45309' }}
                      >
                        <Calendar size={12} />
                        Agendar Entrevista
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button
                        onClick={() => handleHiring(r)}
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)', fontWeight: 700 }}
                      >
                        <CheckCircle size={12} />
                        Contratar
                      </button>
                      <button
                        onClick={() => openActionModal(r, 'reject')}
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                      >
                        <XCircle size={12} />
                        Dispensar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      <Modal isOpen={actionModalOpen} onClose={requestClose}>
        <button className="modal-close-btn" onClick={requestClose} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="admin-form-header">
          <h2 className="admin-form-title">
            {actionType === 'interview' ? 'Agendar Processo Seletivo / Entrevista' : 'Reprovar Candidato'}
          </h2>
          <p className="admin-form-subtitle">
            {actionType === 'interview'
              ? 'Insira as instruções de data, local ou link e horário para a entrevista.'
              : 'Insira um comentário curto com o motivo da dispensa do jovem para conhecimento técnico.'}
          </p>
        </div>
        <form className="admin-form" onSubmit={handleActionSubmit}>
          <div className="form-group full-width">
            <label className="form-label">
              {actionType === 'interview' ? 'Instruções para a Entrevista *' : 'Feedback / Motivação *'}
            </label>
            <textarea
              className="form-control"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                actionType === 'interview'
                  ? 'Ex: Entrevista agendada para 15/06/2026 às 14:00 na Av. Afonso Pena, 1200 - Centro. Procurar por Márcia do RH.'
                  : 'Ex: Perfil não compatível com o turno solicitado de trabalho.'
              }
              style={{ minHeight: '100px', fontFamily: 'inherit', padding: '0.65rem' }}
              required
            />
          </div>

          <div className="form-actions-wrapper" style={{ marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={requestClose} disabled={submittingAction}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: actionType === 'interview' ? 'var(--color-yellow)' : 'var(--color-error)', border: 'none', color: '#fff' }} disabled={submittingAction}>
              {submittingAction ? 'Salvando...' : actionType === 'interview' ? 'Salvar Agendamento' : 'Confirmar Dispensa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
