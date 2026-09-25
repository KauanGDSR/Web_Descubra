'use client';

import React from 'react';
import type { Referral } from '@/backend/types';
import { Briefcase, Calendar, CheckCircle, XCircle, Phone } from 'lucide-react';

interface CandidatoCardProps {
  referral: Referral;
  statusStyle: { bg: string; text: string };
  onOpenActionModal: (referral: Referral, type: 'interview' | 'reject') => void;
  onHiring: (referral: Referral) => void;
}

export function CandidatoCard({
  referral,
  statusStyle,
  onOpenActionModal,
  onHiring,
}: CandidatoCardProps) {
  const youth = referral.jovens;
  if (!youth) return null;

  const isPendente = referral.status === 'Pendente' || referral.status === 'Entrevista Agendada';

  return (
    <div
      className="company-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '340px',
      }}
    >
      <div>
        <div className="company-card-header" style={{ marginBottom: '0.75rem' }}>
          <div
            className="company-card-avatar"
            style={{
              backgroundColor: 'rgba(10, 37, 64, 0.05)',
              color: 'var(--color-primary)',
            }}
          >
            {(youth.nome_social || youth.nome_completo).charAt(0)}
          </div>
          <div className="company-card-title-group">
            <span
              className="company-card-name"
              style={{ fontSize: '1rem', fontWeight: 700 }}
            >
              {youth.nome_social || youth.nome_completo}
            </span>
            <span className="company-card-cnpj-city" style={{ fontSize: '0.75rem' }}>
              Idade: {youth.idade} anos • Escolaridade: {youth.escolaridade}
            </span>
          </div>
        </div>

        <div className="company-card-badges" style={{ marginBottom: '1rem' }}>
          <span
            className="company-card-badge"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
          >
            {referral.status}
          </span>
          <span
            className="company-card-tag"
            style={{
              fontSize: '0.68rem',
              padding: '0.15rem 0.45rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            <Briefcase size={12} />
            Vaga: {referral.vagas_disponiveis?.titulo || 'Vaga Desconhecida'}
          </span>
        </div>

        {/* Youth Contact info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.78rem',
            color: 'var(--color-text-dark)',
            marginBottom: '1rem',
            backgroundColor: 'rgba(10,37,64,0.01)',
            border: '1px solid rgba(10,37,64,0.03)',
            padding: '0.75rem',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Phone size={12} style={{ color: 'var(--color-text-light)' }} />
            <span>
              Telefone: <b>{youth.telefone || 'Não informado'}</b>
            </span>
          </div>
          {youth.whatsapp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={12} style={{ color: '#16a5e9' }} />
              <span>
                WhatsApp: <b>{youth.whatsapp}</b>
              </span>
            </div>
          )}
        </div>

        {/* Technical observations */}
        {referral.feedback_tecnico && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-light)',
              borderLeft: '2.5px solid var(--color-orange)',
              paddingLeft: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                display: 'block',
                color: 'var(--color-primary)',
              }}
            >
              Obs. do Técnico de Referência:
            </span>
            &ldquo;{referral.feedback_tecnico}&rdquo;
          </div>
        )}

        {/* Company feedback */}
        {referral.feedback_empresa && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-light)',
              borderLeft: '2.5px solid var(--color-secondary)',
              paddingLeft: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                display: 'block',
                color: 'var(--color-primary)',
              }}
            >
              Obs. da Empresa:
            </span>
            &ldquo;{referral.feedback_empresa}&rdquo;
          </div>
        )}
      </div>

      {/* Candidate Action Buttons */}
      {isPendente && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderTop: '1px solid rgba(10,37,64,0.04)',
            paddingTop: '0.75rem',
            marginTop: '1rem',
          }}
        >
          {referral.status === 'Pendente' && (
            <button
              onClick={() => onOpenActionModal(referral, 'interview')}
              className="btn btn-outline"
              style={{
                width: '100%',
                padding: '0.45rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                borderColor: 'var(--color-yellow)',
                color: '#b45309',
              }}
            >
              <Calendar size={12} />
              Agendar Entrevista
            </button>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button
              onClick={() => onHiring(referral)}
              className="btn btn-outline"
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                borderColor: 'var(--color-secondary)',
                color: 'var(--color-secondary)',
                fontWeight: 700,
              }}
            >
              <CheckCircle size={12} />
              Contratar
            </button>
            <button
              onClick={() => onOpenActionModal(referral, 'reject')}
              className="btn btn-outline"
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)',
              }}
            >
              <XCircle size={12} />
              Dispensar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
