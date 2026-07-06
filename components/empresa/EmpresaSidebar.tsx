'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

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

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h1 className="admin-sidebar-title" style={{ fontSize: '1.1rem', wordBreak: 'break-word' }}>
          {companyName}
        </h1>
        <p className="admin-sidebar-subtitle">Painel de Parceria</p>
      </div>
      <nav className="admin-tabs-nav" aria-label="Navegação da empresa">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`admin-tab-btn ${isActive(tab.href) ? 'active' : ''}`}
            role="tab"
            aria-selected={isActive(tab.href)}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
