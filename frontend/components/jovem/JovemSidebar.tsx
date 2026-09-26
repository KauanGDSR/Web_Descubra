'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Briefcase, 
  GraduationCap, 
  BarChart, 
  Gift, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut 
} from 'lucide-react';
import LogoutButton from '@/frontend/components/ui/LogoutButton';

const TABS = [
  { href: '/jovem/vagas', label: 'Mural de Vagas', icon: <Briefcase size={20} /> },
  { href: '/jovem/cursos', label: 'Cursos e Capacitação', icon: <GraduationCap size={20} /> },
  { href: '/jovem/acompanhamento', label: 'Meu Progresso', icon: <BarChart size={20} /> },
  { href: '/jovem/premios', label: 'Loja de Prêmios', icon: <Gift size={20} /> },
  { href: '/jovem/agenda', label: 'Agenda', icon: <Calendar size={20} /> },
  { href: '/jovem/documentos', label: 'Documentos', icon: <FileText size={20} /> },
  { href: '/jovem/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
];

export default function JovemSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/jovem/configuracoes') {
      return (
        pathname.startsWith('/jovem/configuracoes') ||
        pathname.startsWith('/jovem/perfil') ||
        pathname.startsWith('/jovem/ajuda')
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Botão Hambúrguer Mobile Flutuante */}
      <button
        type="button"
        className="mobile-hamburger-trigger no-print"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Abrir Menu de Navegação"
        title="Menu"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Backdrop escuro no mobile */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop no-print"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="sidebar-spacer" aria-hidden="true" />
      
      <aside 
        className={`admin-hover-sidebar ${isExpanded ? 'expanded' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        aria-label="Menu Lateral"
      >
        {/* Cabeçalho do menu com ícone hambúrguer e branding */}
        <div className="sidebar-top-bar">
          <button
            type="button"
            className="sidebar-hamburger-btn"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Menu"
            title={isExpanded ? 'Recolher Menu' : 'Expandir Menu'}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
          
          <div className="sidebar-brand">
            <Link href="/jovem/vagas" className="sidebar-logo-text" title="Ir para o Mural de Vagas">
              Descubra<span>Hub</span>
            </Link>
            <span className="sidebar-role-badge">
              Painel do Aluno
            </span>
          </div>
        </div>

        <nav className="sidebar-nav-container" aria-label="Navegação do Jovem">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                role="tab"
                aria-selected={active}
                title={!isExpanded ? tab.label : undefined}
                onClick={() => setIsMobileOpen(false)}
              >
                {active && <span className="sidebar-active-indicator" />}
                <div className="sidebar-item-icon">
                  {tab.icon}
                </div>
                <span className="sidebar-item-label">
                  <span className="sidebar-item-text">{tab.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <LogoutButton
            className="sidebar-logout-btn"
            style={{ width: '100%' }}
          >
            <div className="sidebar-logout-icon" title={!isExpanded ? 'Sair do sistema' : undefined}>
              <LogOut size={20} />
            </div>
            <span className="sidebar-logout-label">
              Sair
            </span>
          </LogoutButton>
        </div>
      </aside>
    </>
  );
}
