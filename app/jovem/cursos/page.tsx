'use client';

export default function CursosPage() {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Cursos e Capacitação</h2>
        <p style={{ color: 'var(--color-text)' }}>Trilhas de aprendizagem disponíveis para você.</p>
      </header>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Nenhum curso novo disponível no momento. Volte mais tarde!</p>
      </div>
    </div>
  );
}
