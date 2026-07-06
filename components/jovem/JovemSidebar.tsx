'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserCircle, Briefcase, GraduationCap, BarChart, Calendar, FileText, HelpCircle } from 'lucide-react';

const TABS = [
  { href: '/jovem', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
  { href: '/jovem/perfil', label: 'Meu Perfil', icon: <UserCircle size={18} /> },
  { href: '/jovem/vagas', label: 'Mural de Vagas', icon: <Briefcase size={18} /> },
  { href: '/jovem/cursos', label: 'Cursos e Capacitação', icon: <GraduationCap size={18} /> },
  { href: '/jovem/acompanhamento', label: 'Meu Progresso', icon: <BarChart size={18} /> },
  { href: '/jovem/agenda', label: 'Agenda', icon: <Calendar size={18} /> },
  { href: '/jovem/documentos', label: 'Documentos', icon: <FileText size={18} /> },
  { href: '/jovem/ajuda', label: 'Ajuda e Suporte', icon: <HelpCircle size={18} /> },
];

export default function JovemSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/jovem' ? pathname === '/jovem' : pathname.startsWith(href);

  return (
    <aside className="admin-sidebar" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="admin-sidebar-header">
        <h1 className="admin-sidebar-title" style={{ color: 'var(--color-primary)' }}>
          Área do Jovem
        </h1>
        <p className="admin-sidebar-subtitle">Programa Descubra!</p>
      </div>
      <nav className="admin-tabs-nav" aria-label="Navegação do Jovem">
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
