'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, UserCircle, Briefcase, GraduationCap, BarChart, Calendar, FileText, HelpCircle, LogOut } from 'lucide-react';
import LogoutButton from '@/frontend/components/ui/LogoutButton';

const TABS = [
  { href: '/jovem', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
  { href: '/jovem/perfil', label: 'Meu Perfil', icon: <UserCircle size={20} /> },
  { href: '/jovem/vagas', label: 'Mural de Vagas', icon: <Briefcase size={20} /> },
  { href: '/jovem/cursos', label: 'Cursos e Capacitação', icon: <GraduationCap size={20} /> },
  { href: '/jovem/acompanhamento', label: 'Meu Progresso', icon: <BarChart size={20} /> },
  { href: '/jovem/agenda', label: 'Agenda', icon: <Calendar size={20} /> },
  { href: '/jovem/documentos', label: 'Documentos', icon: <FileText size={20} /> },
  { href: '/jovem/ajuda', label: 'Ajuda e Suporte', icon: <HelpCircle size={20} /> },
];

export default function JovemSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/jovem' ? pathname === '/jovem' : pathname.startsWith(href);

  return (
    <>
      {/* Botão Hambúrguer Mobile Flutuante */}
      <button
        type="button"
        className="mobile-hamburger-trigger"
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
          className="sidebar-mobile-backdrop"
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
            <Link href="/" className="sidebar-logo-text" title="Ir para a Página Inicial">
              Descubra<span>Hub</span>
            </Link>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação do Jovem">
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
              >
                {active && <span className="sidebar-active-indicator" />}
                <div className="sidebar-item-icon">
                  {tab.icon}
                </div>
                <span className="sidebar-item-label">
                  {tab.label}
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
