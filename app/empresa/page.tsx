'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  Briefcase,
  Users,
  Award,
  Clock,
  Building2,
  Calendar,
  Sparkles,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface CompanyData {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cep: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  responsavel_nome: string | null;
  cidades?: {
    nome: string;
  } | null;
  selo?: 'Ouro' | 'Prata' | 'Bronze' | 'Nenhum';
  pontos_engajamento?: number;
}

interface Stats {
  totalVagas: number;
  vagasAbertas: number;
  vagasPreenchidas: number;
  totalEncaminhamentos: number;
  encaminhamentosPendentes: number;
  encaminhamentosAprovados: number;
}

export default function EmpresaDashboard() {
  const [supabase] = useState(() => createClient());
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // 1. Busca dados da empresa
      const { data: companyData, error: companyErr } = await supabase
        .from('empresas_parceiras')
        .select('*, cidades(nome)')
        .eq('id', user.id)
        .single();

      if (companyErr) throw companyErr;
      setCompany(companyData);

      // 2. Busca vagas da empresa
      const { data: vacancies, error: vacErr } = await supabase
        .from('vagas_disponiveis')
        .select('id, status, quantidade_vagas')
        .eq('empresa_id', user.id);

      if (vacErr) throw vacErr;

      const vList = vacancies || [];
      const vacancyIds = vList.map(v => v.id);

      // 3. Busca encaminhamentos para as vagas dessa empresa
      let referrals: any[] = [];
      if (vacancyIds.length > 0) {
        const { data: refsData, error: refsErr } = await supabase
          .from('encaminhamentos_vagas')
          .select('status')
          .in('vaga_id', vacancyIds);

        if (refsErr) throw refsErr;
        referrals = refsData || [];
      }

      // Calcula estatísticas
      const totalVagas = vList.reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);
      const vagasAbertas = vList.filter(v => v.status === 'Aberta').reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);
      const vagasPreenchidas = vList.filter(v => v.status === 'Preenchida').reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);

      const totalEncaminhamentos = referrals.length;
      const encaminhamentosPendentes = referrals.filter(r => r.status === 'Pendente' || r.status === 'Entrevista Agendada').length;
      const encaminhamentosAprovados = referrals.filter(r => r.status === 'Aprovado').length;

      setStats({
        totalVagas,
        vagasAbertas,
        vagasPreenchidas,
        totalEncaminhamentos,
        encaminhamentosPendentes,
        encaminhamentosAprovados
      });

    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading || !company || !stats) {
    return (
      <div className="map-loading-container" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando dados da parceria...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Styles */}
      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        .dashboard-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .hover-card {
          transition: transform var(--transition-fast), border-color var(--transition-fast);
        }
        .hover-card:hover {
          border-color: var(--color-orange) !important;
          transform: translateY(-2px);
        }
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .dashboard-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 className="admin-form-title" style={{ margin: 0 }}>Painel da Empresa Parceira</h2>
            {company.selo && company.selo !== 'Nenhum' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src={`/assets/selo-${company.selo.toLowerCase()}.png.jpeg`}
                  alt={`Selo ${company.selo}`}
                  title={`Selo ${company.selo}`}
                  style={{
                    height: '38px',
                    width: '38px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${
                      company.selo === 'Ouro' ? 'var(--color-yellow)' : company.selo === 'Prata' ? 'var(--color-text-light)' : 'var(--color-orange)'
                    }`,
                    boxShadow: 'var(--shadow-sm)',
                    flexShrink: 0
                  }}
                />
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: company.selo === 'Ouro' ? '#b45309' : company.selo === 'Prata' ? '#475569' : '#78350f',
                  backgroundColor: company.selo === 'Ouro' ? 'rgba(245,158,11,0.12)' : company.selo === 'Prata' ? 'rgba(100,116,139,0.12)' : 'rgba(249,115,22,0.12)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  lineHeight: '1'
                }}>
                  Selo {company.selo}
                </span>
              </div>
            )}
          </div>
          <p className="admin-form-subtitle">
            Bem-vindo, {company.nome_fantasia || company.razao_social}!
            {company.pontos_engajamento !== undefined && (
              <span style={{ marginLeft: '0.5rem', color: 'var(--color-orange)', fontWeight: 700 }}>
                ({company.pontos_engajamento} pts de engajamento)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="btn btn-outline"
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(10,37,64,0.2)' }}
        >
          <Clock size={14} style={{ color: 'var(--color-orange)' }} />
          Atualizar Painel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <StatCard icon={Briefcase} label="Vagas Ofertadas (Total)" value={stats.totalVagas} colorClass="249, 115, 22" />
        <StatCard icon={Award} label="Vagas Abertas" value={stats.vagasAbertas} colorClass="16, 185, 129" />
        <StatCard icon={Users} label="Jovens Contratados" value={stats.vagasPreenchidas} colorClass="13, 92, 58" />
        <StatCard icon={ClipboardList} label="Encaminhamentos Pendentes" value={stats.encaminhamentosPendentes} colorClass="245, 158, 11" />
      </div>

      {/* Main layout slots */}
      <div className="dashboard-layout">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Mission description */}
          <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Sparkles size={20} style={{ color: 'var(--color-orange)' }} />
              Inclusão Produtiva e Transformação Social
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '1.25rem', fontWeight: 500 }}>
              Sua empresa está gerando impacto real na vida de jovens em extrema vulnerabilidade em Minas Gerais.
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                O <strong>Programa Descubra!</strong> fomenta a inserção de adolescentes e jovens que se encontram em situação de acolhimento, egressos de medidas socioeducativas ou trabalho infantil no mercado formal protegido.
              </p>
              <p>
                Ao disponibilizar vagas de <strong>Aprendizagem Profissional</strong> ou <strong>Emprego</strong>, sua empresa não apenas atende a cotas legais, mas abre portas reais para capacitação profissional, cidadania ativa e dignidade.
              </p>
            </div>
          </div>

          {/* Quick Access */}
          <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
              Acesso Rápido a Operações
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Link href="/empresa/vagas" className="hover-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Briefcase size={14} />
                </div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>Anunciar Nova Vaga</h4>
                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 500 }}>Cadastre oportunidades no sistema.</p>
              </Link>

              <Link href="/empresa/candidatos" className="hover-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Users size={14} />
                </div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>Ver Candidatos</h4>
                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 500 }}>Acompanhe encaminhamentos e realize entrevistas.</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Company details info card */}
          <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Building2 size={18} style={{ color: 'var(--color-secondary)' }} />
              Informações de Cadastro
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Razão Social</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right' }}>{company.razao_social}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Nome Fantasia</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{company.nome_fantasia || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>CNPJ</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{company.cnpj}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Responsável</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{company.responsavel_nome || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>E-mail</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{company.email || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Telefone</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{company.telefone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,37,64,0.04)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Cidade Pólo</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{company.cidades?.nome || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Endereço</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right', maxWidth: '200px' }}>{company.endereco || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, colorClass }: { icon: any; label: string; value: number | string; colorClass: string }) {
  return (
    <div className="report-stat-card" style={{ display: 'flex', gap: '0.85rem', padding: '1.25rem' }}>
      <div className="report-stat-icon" style={{ backgroundColor: `rgba(${colorClass}, 0.1)`, color: `rgb(${colorClass})` }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="report-stat-val">{value}</div>
        <div className="report-stat-lbl" style={{ fontSize: '0.68rem', marginTop: '0.15rem' }}>{label}</div>
      </div>
    </div>
  );
}
