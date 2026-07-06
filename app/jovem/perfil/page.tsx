'use client';

import { UserCircle, Mail, MapPin, Phone } from 'lucide-react';

export default function PerfilPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Meu Perfil</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Gerencie suas informações e currículo.
        </p>
      </header>

      {/* Card de identidade - empilha verticalmente em mobile */}
      <div style={{
        background: '#fff',
        borderRadius: '1rem',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        textAlign: 'center',
      }}>
        <UserCircle size={80} color="#cbd5e1" />
        <div>
          <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', fontWeight: 700 }}>João Silva</h3>
          <span style={{
            display: 'inline-block',
            color: '#0284c7',
            fontWeight: 600,
            fontSize: '0.85rem',
            background: '#e0f2fe',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            marginTop: '0.4rem',
          }}>
            Em Capacitação
          </span>
        </div>
      </div>

      {/* Card de contato */}
      <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
        <h4 style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          Contato
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>
            <Mail size={16} color="#64748b" /> joao.silva@email.com
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>
            <Phone size={16} color="#64748b" /> (31) 98765-4321
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>
            <MapPin size={16} color="#64748b" /> Belo Horizonte, MG
          </span>
        </div>
      </div>

      {/* Card de habilidades */}
      <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
        <h4 style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          Habilidades
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['Comunicação', 'Informática Básica', 'Trabalho em Equipe', 'Proatividade'].map(tag => (
            <span key={tag} style={{
              background: '#f1f5f9',
              color: '#334155',
              padding: '0.35rem 0.85rem',
              borderRadius: '1rem',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
