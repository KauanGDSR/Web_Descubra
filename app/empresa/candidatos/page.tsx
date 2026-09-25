'use client';

import { useState } from 'react';
import Modal from '@/frontend/components/ui/Modal';
import { useDialog } from '@/frontend/components/ui/CustomDialog';
import { useCandidatos } from '@/frontend/hooks/useCandidatos';
import { CandidatoCard } from '@/frontend/components/empresa/CandidatoCard';
import type { Referral, ReferralStatus } from '@/backend/types';

export default function CandidatosPage() {
  const dialog = useDialog();
  const { referrals, loading, updateStatus } = useCandidatos();

  // Modal / Action State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionType, setActionType] = useState<'interview' | 'reject' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

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
      const newStatus: ReferralStatus =
        actionType === 'interview' ? 'Entrevista Agendada' : 'Reprovado';

      await updateStatus(selectedReferral.id, newStatus, feedbackText.trim() || null);

      await dialog.alert(
        'Sucesso',
        actionType === 'interview'
          ? 'Entrevista agendada com sucesso. O jovem e o técnico de referência serão notificados.'
          : 'Candidato avaliado como não selecionado.',
        'success'
      );

      setActionModalOpen(false);
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', err.message || 'Erro ao tentar atualizar o status do candidato.', 'danger');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleHiring = async (referral: Referral) => {
    const youthName =
      referral.jovens?.nome_social || referral.jovens?.nome_completo || 'o candidato';
    const ok = await dialog.confirm(
      'Confirmar Contratação',
      `Tem certeza que deseja marcar <b>${youthName}</b> como contratado? Esta ação atualizará o status do encaminhamento para "Aprovado".`,
      'success'
    );
    if (!ok) return;

    try {
      await updateStatus(referral.id, 'Aprovado');
      await dialog.alert(
        'Sucesso',
        'Parabéns pela contratação! O jovem iniciará sua trajetória na empresa parceira.',
        'success'
      );
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro', 'Não foi possível registrar a contratação.', 'danger');
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    if (filterStatus === 'Todos') return true;
    if (filterStatus === 'Pendentes')
      return r.status === 'Pendente' || r.status === 'Entrevista Agendada';
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
      default:
        return { bg: 'rgba(10, 37, 64, 0.08)', text: 'var(--color-primary)' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        className="admin-form-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 className="admin-form-title">Candidatos Encaminhados</h2>
          <p className="admin-form-subtitle">
            Acompanhe jovens indicados pelos assistentes sociais para suas vagas
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="filter-row"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(10,37,64,0.08)',
          paddingBottom: '0.75rem',
        }}
      >
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
              color: filterStatus === status ? '#fff' : 'var(--color-text-dark)',
            }}
          >
            {status === 'Todos'
              ? 'Todos os candidatos'
              : status === 'Pendentes'
              ? 'Pendentes / Entrevistas'
              : status}
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
          {filteredReferrals.map((r) => (
            <CandidatoCard
              key={r.id}
              referral={r}
              statusStyle={getStatusStyle(r.status)}
              onOpenActionModal={openActionModal}
              onHiring={handleHiring}
            />
          ))}
        </div>
      )}

      {/* Action Modal */}
      <Modal isOpen={actionModalOpen} onClose={requestClose}>
        <button className="modal-close-btn" onClick={requestClose} aria-label="Fechar modal">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="admin-form-header">
          <h2 className="admin-form-title">
            {actionType === 'interview'
              ? 'Agendar Processo Seletivo / Entrevista'
              : 'Reprovar Candidato'}
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
            <button
              type="button"
              className="btn btn-outline"
              style={{ borderRadius: 'var(--border-radius-sm)' }}
              onClick={requestClose}
              disabled={submittingAction}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                borderRadius: 'var(--border-radius-sm)',
                boxShadow: 'none',
                backgroundColor:
                  actionType === 'interview' ? 'var(--color-yellow)' : 'var(--color-error)',
                border: 'none',
                color: '#fff',
              }}
              disabled={submittingAction}
            >
              {submittingAction
                ? 'Salvando...'
                : actionType === 'interview'
                ? 'Salvar Agendamento'
                : 'Confirmar Dispensa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
