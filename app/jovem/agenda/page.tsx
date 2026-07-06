'use client';

export default function AgendaPage() {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Agenda</h2>
        <p style={{ color: 'var(--color-text)' }}>Seus compromissos e datas importantes.</p>
      </header>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Você não tem eventos agendados para esta semana.</p>
      </div>
    </div>
  );
}
