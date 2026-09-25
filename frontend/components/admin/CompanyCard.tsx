'use client';

import React from 'react';
import CardEditBtn from '@/frontend/components/ui/CardEditBtn';
import type { DbCompany } from '@/backend/types';

interface CompanyCardProps {
  company: DbCompany;
  onEdit: () => void;
  onUpdateSelo: (newSelo: string) => Promise<void>;
}

export function CompanyCard({ company: c, onEdit, onUpdateSelo }: CompanyCardProps) {
  return (
    <div className="company-card">
      <CardEditBtn onClick={onEdit} title="Editar empresa" />
      <div className="company-card-header">
        <div className="company-card-avatar">{c.razao_social.charAt(0)}</div>
        <div className="company-card-title-group">
          <span className="company-card-name">{c.razao_social}</span>
          <span className="company-card-cnpj-city">
            CNPJ: {c.cnpj || '—'} • {c.cidades?.nome || 'Pólo Não Associado'}
          </span>
        </div>
      </div>
      <div className="company-card-badges">
        <span className="company-card-badge status-active">Ativa</span>
        {c.selo && c.selo !== 'Nenhum' && (
          <span
            className="company-card-badge"
            style={{
              backgroundColor:
                c.selo === 'Ouro'
                  ? 'rgba(245,158,11,0.15)'
                  : c.selo === 'Prata'
                  ? 'rgba(148,163,184,0.15)'
                  : 'rgba(217,119,6,0.15)',
              color:
                c.selo === 'Ouro'
                  ? '#b45309'
                  : c.selo === 'Prata'
                  ? '#475569'
                  : '#78350f',
              fontWeight: 700,
            }}
          >
            {c.selo === 'Ouro' ? '🥇 Ouro' : c.selo === 'Prata' ? '🥈 Prata' : '🥉 Bronze'}
          </span>
        )}
        <span className="company-card-tag">{c.nome_fantasia || c.razao_social}</span>
      </div>
      <div className="company-card-details">
        <div className="company-card-detail-item">
          <span className="company-card-detail-label">CEP</span>
          <span className="company-card-detail-value">{c.cep || '—'}</span>
        </div>
        <div className="company-card-detail-item">
          <span className="company-card-detail-label">Endereço</span>
          <span className="company-card-detail-value" style={{ fontSize: '0.78rem' }}>
            {c.endereco || '—'}
          </span>
        </div>
        <div className="company-card-detail-item">
          <span className="company-card-detail-label">Responsável</span>
          <span className="company-card-detail-value">{c.responsavel_nome || '—'}</span>
        </div>
        <div className="company-card-detail-item">
          <span className="company-card-detail-label">E-mail</span>
          <span className="company-card-detail-value">{c.email || '—'}</span>
        </div>
        <div className="company-card-detail-item">
          <span className="company-card-detail-label">Telefone</span>
          <span className="company-card-detail-value">{c.telefone || '—'}</span>
        </div>
        <div className="company-card-detail-item">
          <span className="company-card-detail-label">Selo</span>
          <select
            value={c.selo || 'Nenhum'}
            onChange={(e) => onUpdateSelo(e.target.value)}
            className="form-control"
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.8rem',
              height: 'auto',
              marginTop: '0.1rem',
              cursor: 'pointer',
            }}
          >
            <option value="Nenhum">Nenhum</option>
            <option value="Bronze">🥉 Bronze</option>
            <option value="Prata">🥈 Prata</option>
            <option value="Ouro">🥇 Ouro</option>
          </select>
        </div>
      </div>
    </div>
  );
}
