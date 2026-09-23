'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import LogoutButton from '@/components/ui/LogoutButton';

const TABS = [
  {
    href: '/empresa',
    label: 'Visão geral',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
        <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
    ),
  },
  {
    href: '/empresa/vagas',
    label: 'Minhas Vagas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    href: '/empresa/candidatos',
    label: 'Candidatos / Vagas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/empresa/selos',
    label: 'Manual de Selos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  },
];

export default function EmpresaSidebar() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [companyName, setCompanyName] = useState<string>('Carregando...');
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('empresas_parceiras')
            .select('nome_fantasia, razao_social')
            .eq('id', user.id)
            .single();
          if (data) {
            setCompanyName(data.nome_fantasia || data.razao_social);
          } else {
            setCompanyName('Empresa Parceira');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar nome da empresa:', err);
        setCompanyName('Empresa Parceira');
      }
    };
    fetchCompanyData();
  }, []);

  const isActive = (href: string) =>
    href === '/empresa' ? pathname === '/empresa' : pathname.startsWith(href);

  const isExpanded = isHovered || isMobileOpen;

  return (
    <>
      {/* Botão flutuante mobile para abrir gaveta */}
      <button
        type="button"
        className="mobile-hamburger-trigger"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
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

      {/* Barra Lateral estilo Hambúrguer com expansão ao passar o mouse */}
      <aside
        className={`admin-hover-sidebar ${isExpanded ? 'expanded' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Menu Lateral da Empresa"
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
              DescubraHub
            </Link>
            <span className="sidebar-role-badge" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {companyName}
            </span>
          </div>
        </div>

        {/* Lista de abas de navegação */}
        <nav className="sidebar-nav-container" aria-label="Navegação da empresa">
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
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé da lateral com Botão de Sair */}
        <div className="sidebar-footer">
          <LogoutButton
            className="sidebar-logout-btn"
            style={{ width: '100%' }}
          >
            <div className="sidebar-logout-icon" title={!isExpanded ? 'Sair do sistema' : undefined}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
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
