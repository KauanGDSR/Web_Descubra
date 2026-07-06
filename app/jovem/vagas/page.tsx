'use client';

import { motion } from 'framer-motion';
import { Briefcase, MapPin, Building, ChevronRight } from 'lucide-react';

const mockVagas = [
  { id: 1, titulo: 'Jovem Aprendiz - Rotinas Administrativas', empresa: 'Banco do Brasil', local: 'Belo Horizonte, MG', bolsa: 'R$ 650,00', match: 95 },
  { id: 2, titulo: 'Aprendiz em Logística', empresa: 'Correios', local: 'Betim, MG', bolsa: 'R$ 700,00', match: 88 },
  { id: 3, titulo: 'Jovem Aprendiz TI', empresa: 'Prodemge', local: 'Belo Horizonte, MG', bolsa: 'R$ 850,00', match: 82 },
];

export default function VagasPage() {
  return (
    <div>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Mural de Vagas</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Vagas com maior compatibilidade para o seu perfil.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mockVagas.map((vaga) => (
          <motion.div
            key={vaga.id}
            whileHover={{ scale: 1.01 }}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '1rem',
              padding: '1.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Topo: ícone + infos */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '50%', color: '#16a34a', flexShrink: 0 }}>
                <Briefcase size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                  {vaga.titulo}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Building size={14} /> {vaga.empresa}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} /> {vaga.local}
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé: match + botão lado a lado */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)', lineHeight: 1 }}>
                  {vaga.match}%
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Match
                </span>
              </div>
              <button style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '2rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
              }}>
                Ver Detalhes <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
