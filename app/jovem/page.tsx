'use client';

import { motion } from 'framer-motion';
import { Briefcase, BookOpen, Clock, Target, Star } from 'lucide-react';
import Link from 'next/link';

export default function JovemDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Olá, João! <Star size={24} color="#f59e0b" fill="#f59e0b" />
        </h2>
        <p style={{ color: 'var(--color-text)', marginTop: '0.5rem' }}>
          Bem-vindo ao seu espaço no Programa Descubra. Você está <strong>Em Capacitação</strong>.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Briefcase size={24} />
          </div>
          <h3 style={cardTitleStyle}>2 Vagas</h3>
          <p style={cardSubtitleStyle}>Candidaturas Ativas</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <BookOpen size={24} />
          </div>
          <h3 style={cardTitleStyle}>3 Cursos</h3>
          <p style={cardSubtitleStyle}>Concluídos</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#ffedd5', color: '#ea580c' }}>
            <Target size={24} />
          </div>
          <h3 style={cardTitleStyle}>85%</h3>
          <p style={cardSubtitleStyle}>Seu Progresso Atual</p>
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-title)' }}>Próximos Passos</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <Clock size={18} color="var(--color-primary)" />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Entrevista - Banco do Brasil</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Amanhã, às 14:00 (Online)</span>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <BookOpen size={18} color="var(--color-primary)" />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Módulo 3: Ética no Trabalho</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Prazo: 15 de Outubro</span>
              </div>
            </li>
          </ul>
          <Link href="/jovem/agenda" style={{ display: 'inline-block', marginTop: '1.5rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
            Ver Agenda Completa &rarr;
          </Link>
        </section>

        <section style={{ background: 'linear-gradient(135deg, var(--color-primary), #1a3b5c)', padding: '1.5rem', borderRadius: '1rem', color: '#fff' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#fff' }}>Mural de Vagas</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.9 }}>Você tem 5 novas oportunidades compatíveis com seu perfil!</p>
          <Link href="/jovem/vagas" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#fff', color: 'var(--color-primary)', borderRadius: '2rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Ver Oportunidades
          </Link>
        </section>
      </div>
    </div>
  );
}

// Estilos Reutilizáveis
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  padding: '1.5rem',
  borderRadius: '1rem',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  border: '1px solid #f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  cursor: 'default',
};

const iconWrapperStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: '0.75rem',
  marginBottom: '1rem',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: 'var(--color-title)',
  marginBottom: '0.25rem',
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#64748b',
  fontWeight: 500,
};
