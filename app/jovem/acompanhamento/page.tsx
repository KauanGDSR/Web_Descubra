'use client';

export default function AcompanhamentoPage() {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Meu Progresso</h2>
        <p style={{ color: 'var(--color-text)' }}>Acompanhe suas avaliações e frequências.</p>
      </header>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Seu histórico de acompanhamento aparecerá aqui.</p>
      </div>
    </div>
  );
}
