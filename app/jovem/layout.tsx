'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserCircle, Briefcase, GraduationCap, BarChart, Bell, LogOut } from 'lucide-react';
import JovemSidebar from '@/components/jovem/JovemSidebar';
import LogoutButton from '@/components/ui/LogoutButton';

// Abas principais visíveis no bottom nav mobile (máx 5)
const BOTTOM_TABS = [
  { href: '/jovem', label: 'Início', icon: <LayoutDashboard size={20} /> },
  { href: '/jovem/vagas', label: 'Vagas', icon: <Briefcase size={20} /> },
  { href: '/jovem/cursos', label: 'Cursos', icon: <GraduationCap size={20} /> },
  { href: '/jovem/acompanhamento', label: 'Progresso', icon: <BarChart size={20} /> },
  { href: '/jovem/perfil', label: 'Perfil', icon: <UserCircle size={20} /> },
];

function JovemHeader() {
  return (
    <header className="jovem-header" id="main-header">
      <Link href="/" className="jovem-header-logo" aria-label="Ir para a Home">
        Descubra<span>!</span>
      </Link>
      <div className="jovem-header-actions">
        <button className="jovem-header-btn" aria-label="Notificações">
          <Bell size={18} />
        </button>
        <LogoutButton className="jovem-header-btn" aria-label="Sair">
          <LogOut size={18} />
        </LogoutButton>
      </div>
    </header>
  );
}

function JovemBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/jovem' ? pathname === '/jovem' : pathname.startsWith(href);

  return (
    <nav className="jovem-bottom-nav" aria-label="Navegação principal">
      {BOTTOM_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`jovem-nav-item ${isActive(tab.href) ? 'active' : ''}`}
          aria-label={tab.label}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function JovemLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JovemHeader />

      {/* Desktop layout (sidebar + content) */}
      <main className="jovem-section">
        {/* Desktop: grid com sidebar */}
        <div className="jovem-sidebar-wrapper">
          <div className="jovem-desktop-layout">
            <JovemSidebar />
            <div className="jovem-content-card">
              {children}
            </div>
          </div>
        </div>

        {/* Mobile: conteúdo em coluna única */}
        <div className="jovem-layout" style={{ display: 'block' }}>
          <div className="jovem-sidebar-wrapper" style={{ display: 'none' }} />
          <div className="jovem-content-card">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom nav (mobile only, hidden on desktop via CSS) */}
      <JovemBottomNav />
    </>
  );
}
