'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const TABS = [
  {
    href: '/admin',
    label: 'Visão geral',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
        <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
    ),
  },
  {
    href: '/admin/tecnicos',
    label: 'Cadastro de Técnico',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: '/admin/jovens',
    label: 'Cadastro de Jovem',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/admin/empresas',
    label: 'Cadastro de Empresa',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    href: '/admin/unidades',
    label: 'Unidades de Referência',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11" />
        <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
        <line x1="9" y1="12" x2="9" y2="12.01" />
        <line x1="15" y1="12" x2="15" y2="12.01" />
      </svg>
    ),
  },
  {
    href: '/admin/mapa-inteligente',
    label: 'Mapa Inteligente',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/>
        <line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  },
  {
    href: '/admin/fila-inteligente',
    label: 'Fila Inteligente',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <line x1="23" y1="11" x2="17" y2="11"/>
        <line x1="23" y1="15" x2="17" y2="15"/>
        <line x1="23" y1="19" x2="17" y2="19"/>
      </svg>
    ),
  },
  {
    href: '/admin/relatorios',
    label: 'Relatórios',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: '/admin/resgates',
    label: 'Resgates de Prêmios',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  },
  {
    href: '/admin/depoimentos',
    label: 'Depoimentos de Alunos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('tecnicos')
            .select('cargo')
            .eq('id', user.id)
            .single();
          if (data) {
            setRole(data.cargo); // 'admin' ou 'tecnico'
          }
        }
      } catch (err) {
        console.error('Erro ao buscar cargo do usuário:', err);
      }
    };
    fetchUserRole();
  }, []);

  // Redirecionamento se for técnico acessando caminhos administrativos
  useEffect(() => {
    if (role === 'tecnico' && pathname.startsWith('/admin')) {
      const subpath = pathname.replace(/^\/admin/, '/tecnicos');
      if (subpath.startsWith('/tecnicos/tecnicos') || subpath.startsWith('/tecnicos/unidades')) {
        router.push('/tecnicos');
      } else {
        router.push(subpath);
      }
    }
  }, [role, pathname, router]);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  // Filtra as abas: Oculta 'Cadastro de Técnico' e 'Unidades de Referência' a menos que o cargo esteja explicitamente confirmado como 'admin'
  const visibleTabs = TABS.filter((tab) => {
    if (tab.href === '/admin/tecnicos' || tab.href === '/admin/unidades') {
      return role === 'admin';
    }
    return true;
  });

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h1 className="admin-sidebar-title">
          {role === 'tecnico' ? 'Painel Técnico' : 'Painel Admin'}
        </h1>
        <p className="admin-sidebar-subtitle">Programa Descubra!</p>
      </div>
      <nav className="admin-tabs-nav" aria-label="Navegação do painel">
        {visibleTabs.map((tab) => (
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
