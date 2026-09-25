'use client';

import { motion } from 'framer-motion';
import { 
  Briefcase, 
  BookOpen, 
  Clock, 
  Target, 
  Star, 
  Loader2, 
  MapPin, 
  Building, 
  GraduationCap, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { useJovemDashboard } from '@/frontend/hooks/useJovemDashboard';

export default function JovemDashboard() {
  const { jovem, vagasCount, acompanhamentosCount, loading } = useJovemDashboard();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando seus dados do banco de dados...</p>
      </div>
    );
  }

  const displayName = jovem?.nome_social || jovem?.nome_completo || 'Jovem Aprendiz';
  const primeiroNome = displayName.split(' ')[0];
  const statusLabel = jovem?.passou_pre_aprendizagem 
    ? 'Apto para Vagas de Aprendizagem' 
    : jovem?.fez_pre_aprendizagem 
      ? 'Em Capacitação / Pré-Aprendizagem' 
      : 'Em Acompanhamento Técnico';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header com dados reais */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Olá, {primeiroNome}! <Star size={24} color="#f59e0b" fill="#f59e0b" />
          </h2>
          <span style={{ 
            background: jovem?.passou_pre_aprendizagem ? '#dcfce7' : '#e0f2fe', 
            color: jovem?.passou_pre_aprendizagem ? '#16a34a' : '#0284c7', 
            padding: '0.3rem 0.8rem', 
            borderRadius: '2rem', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <UserCheck size={14} /> {statusLabel}
          </span>
        </div>
        <p style={{ color: 'var(--color-text)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          Bem-vindo ao seu painel oficial do <strong>DescubraHub</strong>. Seus dados estão sincronizados em tempo real com o banco de dados.
        </p>
      </header>

      {/* Cards de Métricas Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Briefcase size={24} />
          </div>
          <h3 style={cardTitleStyle}>{vagasCount} Vagas</h3>
          <p style={cardSubtitleStyle}>Oportunidades Abertas no Mural</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <FileText size={24} />
          </div>
          <h3 style={cardTitleStyle}>{acompanhamentosCount} Registros</h3>
          <p style={cardSubtitleStyle}>Acompanhamentos Registrados</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#ffedd5', color: '#ea580c' }}>
            <Target size={24} />
          </div>
          <h3 style={cardTitleStyle}>{jovem?.pontuacao_atual ?? 0} pts</h3>
          <p style={cardSubtitleStyle}>Índice de Vulnerabilidade Social</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
            <KeyRound size={24} />
          </div>
          <h3 style={cardTitleStyle}>{jovem?.codigo_acesso || 'Ativo'}</h3>
          <p style={cardSubtitleStyle}>PIN / Código de Acesso</p>
        </motion.div>
      </div>

      {/* Seção com Informações Cadastrais Reais */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building size={20} /> Informações do seu Vínculo Institucional
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Unidade de Referência</span>
            <strong style={infoValueStyle}>
              {Array.isArray(jovem?.equipamentos) 
                ? (jovem?.equipamentos[0]?.nome || 'CREAS Pirapora') 
                : (jovem?.equipamentos?.nome || 'CREAS Pirapora')}
            </strong>
          </div>
          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Bairro / Região</span>
            <strong style={infoValueStyle}>{jovem?.bairro || 'Pirapora - MG'}</strong>
          </div>
          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Escolaridade & Turno</span>
            <strong style={infoValueStyle}>{jovem?.escolaridade || 'Ensino Médio'} &bull; {jovem?.turno_escolar || 'Turno Regular'}</strong>
          </div>
          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Entidade Formadora</span>
            <strong style={infoValueStyle}>{jovem?.entidade_formadora || 'Descubra'}</strong>
          </div>
        </div>

        {jovem?.areas_interesse && jovem.areas_interesse.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ ...infoLabelStyle, display: 'block', marginBottom: '0.5rem' }}>Áreas de Interesse Cadastradas</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {jovem.areas_interesse.map((area, i) => (
                <span key={i} style={{ background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ações Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--color-title)' }}>Próximos Passos</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: 'var(--color-primary)' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Confira seu Perfil Completo</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Veja seus dados socioeconômicos e cadastrais no sistema</span>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: 'var(--color-primary)' }}>
                <BookOpen size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Histórico de Acompanhamentos</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Acompanhe os pareceres e evolução pedagógica</span>
              </div>
            </li>
          </ul>
          <Link href="/jovem/acompanhamento" style={{ display: 'inline-block', marginTop: '1.25rem', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
            Ver Meu Progresso &rarr;
          </Link>
        </section>

        <section style={{ background: 'linear-gradient(135deg, var(--color-primary), #1a3b5c)', padding: '1.5rem', borderRadius: '1rem', color: '#fff' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#fff' }}>Mural de Vagas</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.9 }}>
            Temos <strong>{vagasCount} oportunidades</strong> cadastradas diretamente pelas empresas parceiras. Confira os detalhes e requisitos de cada uma!
          </p>
          <Link href="/jovem/vagas" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#fff', color: 'var(--color-primary)', borderRadius: '2rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Acessar Mural de Vagas
          </Link>
        </section>
      </div>
    </div>
  );
}

// Estilos Reutilizáveis
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  padding: '1.25rem',
  borderRadius: '1rem',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
  border: '1px solid #f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  cursor: 'default',
};

const iconWrapperStyle: React.CSSProperties = {
  padding: '0.65rem',
  borderRadius: '0.75rem',
  marginBottom: '0.75rem',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 700,
  color: 'var(--color-title)',
  marginBottom: '0.2rem',
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#64748b',
  fontWeight: 500,
};

const infoBlockStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '0.85rem 1rem',
  borderRadius: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--color-title)',
  fontWeight: 600,
};
