import Link from 'next/link';
import EmpresaSidebar from '@/components/empresa/EmpresaSidebar';
import LogoutButton from '@/components/ui/LogoutButton';

function EmpresaHeader() {
  return (
    <header className="header" id="main-header" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(10,37,64,0.08)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '5rem' }}>
        <div className="logo-wrapper">
          <Link href="/" aria-label="Ir para a Home Page" style={{ display: 'flex', alignItems: 'center' }}>
            <svg className="logo-gov" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logomarca do Governo de Minas Gerais">
              <polygon points="5,35 25,5 45,35" fill="#EF4444" stroke="#EF4444" strokeWidth="2" />
              <text x="55" y="18" fill="#0D5C3A" fontFamily="'Outfit',sans-serif" fontWeight="800" fontSize="12px">GOVERNO</text>
              <text x="55" y="32" fill="#0D5C3A" fontFamily="'Outfit',sans-serif" fontWeight="400" fontSize="11px">DE MINAS GERAIS</text>
            </svg>
          </Link>
          <div className="logo-divider" role="presentation" />
          <Link href="/" className="logo-descubra">Descubra<span>!</span></Link>
        </div>
        <nav>
          <LogoutButton className="nav-link" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '2px solid var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-primary)', cursor: 'pointer', background: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </LogoutButton>
        </nav>
      </div>
    </header>
  );
}

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmpresaHeader />
      <main className="admin-section">
        <div className="container">
          <div className="admin-layout">
            <EmpresaSidebar />
            <div className="admin-tab-content">
              {children}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
