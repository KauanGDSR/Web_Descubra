'use client';

export default function DocumentosPage() {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Documentos</h2>
        <p style={{ color: 'var(--color-text)' }}>Envie seus documentos e acesse contratos.</p>
      </header>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Nenhum documento pendente de envio.</p>
      </div>
    </div>
  );
}
