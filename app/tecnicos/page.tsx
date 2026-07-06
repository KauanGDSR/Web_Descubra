'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  Users,
  Building2,
  UserCircle,
  ClipboardList,
  Briefcase,
  Award,
  TrendingUp,
  Sparkles,
  GraduationCap,
  Gift,
  Clock,
  UserPlus
} from 'lucide-react';

interface Stats {
  totalJovens: number;
  totalEquipamentos: number;
  totalTecnicos: number;
  totalAcompanhamentos: number;
  totalEmpresas: number;
  totalVagas: number;
  vagasAbertas: number;
  vagasPreenchidas: number;
  totalEncaminhamentos: number;
  encaminhamentosAprovados: number;
  encaminhamentosPendentes: number;
  resgatesPendentes: number;
  jovensPreAprendizagem: number;
  jovensAprendizagem: number;
  totalPontos: number;
  pontosMedios: number;
}

export default function TecnicoOverviewPage() {
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        jovensRes,
        equipsRes,
        tecnicosRes,
        acompanhamentosRes,
        empresasRes,
        vagasRes,
        encaminhamentosRes,
        resgatesRes
      ] = await Promise.all([
        supabase.from('jovens').select('id, fez_pre_aprendizagem, passou_pre_aprendizagem, passou_pela_aprendizagem, pontuacao_atual'),
        supabase.from('equipamentos').select('id', { count: 'exact', head: true }),
        supabase.from('tecnicos').select('id', { count: 'exact', head: true }),
        supabase.from('acompanhamentos').select('id', { count: 'exact', head: true }),
        supabase.from('empresas_parceiras').select('id', { count: 'exact', head: true }),
        supabase.from('vagas_disponiveis').select('status, quantidade_vagas'),
        supabase.from('encaminhamentos_vagas').select('status'),
        supabase.from('resgates_premios').select('status')
      ]);

      if (jovensRes.error) throw jovensRes.error;
      if (equipsRes.error) throw equipsRes.error;
      if (tecnicosRes.error) throw tecnicosRes.error;
      if (acompanhamentosRes.error) throw acompanhamentosRes.error;
      if (empresasRes.error) throw empresasRes.error;
      if (vagasRes.error) throw vagasRes.error;
      if (encaminhamentosRes.error) throw encaminhamentosRes.error;
      if (resgatesRes.error) throw resgatesRes.error;

      const totalJovens = jovensRes.data?.length || 0;
      const totalEquipamentos = equipsRes.count || 0;
      const totalTecnicos = tecnicosRes.count || 0;
      const totalAcompanhamentos = acompanhamentosRes.count || 0;
      const totalEmpresas = empresasRes.count || 0;

      const totalVagas = (vagasRes.data || []).reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);
      const vagasAbertas = (vagasRes.data || []).filter(v => v.status === 'Aberta').reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);
      const vagasPreenchidas = (vagasRes.data || []).filter(v => v.status === 'Preenchida').reduce((acc, v) => acc + (v.quantidade_vagas || 1), 0);

      const totalEncaminhamentos = encaminhamentosRes.data?.length || 0;
      const encaminhamentosAprovados = (encaminhamentosRes.data || []).filter(e => e.status === 'Aprovado').length;
      const encaminhamentosPendentes = (encaminhamentosRes.data || []).filter(e => e.status === 'Pendente' || e.status === 'Entrevista Agendada').length;

      const resgatesPendentes = (resgatesRes.data || []).filter(r => r.status === 'Pendente').length;

      const jovensPreAprendizagem = (jovensRes.data || []).filter(j => j.fez_pre_aprendizagem || j.passou_pre_aprendizagem).length;
      const jovensAprendizagem = (jovensRes.data || []).filter(j => j.passou_pela_aprendizagem).length;

      const totalPontos = (jovensRes.data || []).reduce((acc, j) => acc + (j.pontuacao_atual || 0), 0);
      const pontosMedios = totalJovens > 0 ? Math.round(totalPontos / totalJovens) : 0;

      setStats({
        totalJovens,
        totalEquipamentos,
        totalTecnicos,
        totalAcompanhamentos,
        totalEmpresas,
        totalVagas,
        vagasAbertas,
        vagasPreenchidas,
        totalEncaminhamentos,
        encaminhamentosAprovados,
        encaminhamentosPendentes,
        resgatesPendentes,
        jovensPreAprendizagem,
        jovensAprendizagem,
        totalPontos,
        pontosMedios
      });
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="map-loading-container" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando estatísticas do painel...</p>
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
           <h2 className="admin-form-title">Painel do Técnico</h2>
           <p className="admin-form-subtitle">Painel de acompanhamento de impacto e inclusão produtiva</p>
         </div>
         <button
           onClick={loadData}
           className="btn btn-outline"
           style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(10,37,64,0.2)' }}
         >
           <Clock size={14} style={{ color: 'var(--color-orange)' }} />
           Atualizar Dados
         </button>
       </div>

       {/* KPI Grid */}
       <div className="dashboard-grid">
         <StatCard icon={Users} label="Jovens Mapeados" value={stats.totalJovens} colorClass="14, 165, 233" />
         <StatCard icon={Building2} label="Equipamentos (Pólos)" value={stats.totalEquipamentos} colorClass="10, 37, 64" />
         <StatCard icon={ClipboardList} label="Acompanhamentos" value={stats.totalAcompanhamentos} colorClass="217, 70, 239" />
         <StatCard icon={Briefcase} label="Empresas Parceiras" value={stats.totalEmpresas} colorClass="249, 115, 22" />
         <StatCard icon={Award} label="Vagas Ofertadas" value={stats.totalVagas} colorClass="245, 158, 11" />
         <StatCard icon={TrendingUp} label="Encaminhamentos" value={stats.totalEncaminhamentos} colorClass="16, 185, 129" />
         <StatCard icon={Sparkles} label="Pontuação Acumulada" value={stats.totalPontos} colorClass="249, 115, 22" />
       </div>

       {/* Sub layout */}
       <div className="dashboard-layout">
         {/* Column 1 */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           {/* Funnel Box */}
           <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
             <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
               <GraduationCap size={20} style={{ color: 'var(--color-orange)' }} />
               Funil de Trajetória e Impacto Social
             </h3>
             <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '1.5rem', fontWeight: 500 }}>
               Acompanhamento do progresso dos jovens desde o mapeamento inicial até a contratação no mercado de trabalho.
             </p>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '0.4rem' }}>
                   <span>1. Inscrição & Mapeamento Inicial</span>
                   <span style={{ color: 'var(--color-text-light)' }}>{stats.totalJovens} Jovens (100%)</span>
                 </div>
                 <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(10,37,64,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                   <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-orange)', borderRadius: '9999px' }} />
                 </div>
               </div>

               <div>
                 {(() => {
                   const pct = stats.totalJovens > 0 ? Math.round((stats.jovensPreAprendizagem / stats.totalJovens) * 100) : 0;
                   return (
                     <>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '0.4rem' }}>
                         <span>2. Pré-Aprendizagem Concluída</span>
                         <span style={{ color: 'var(--color-text-light)' }}>{stats.jovensPreAprendizagem} Jovens ({pct}%)</span>
                       </div>
                       <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(10,37,64,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                         <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-orange)', borderRadius: '9999px', transition: 'width 1s ease' }} />
                       </div>
                     </>
                   );
                 })()}
               </div>

               <div>
                 {(() => {
                   const pct = stats.totalJovens > 0 ? Math.round((stats.jovensAprendizagem / stats.totalJovens) * 100) : 0;
                   return (
                     <>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '0.4rem' }}>
                         <span>3. Jovens Aprendizes / Contratados</span>
                         <span style={{ color: 'var(--color-text-light)' }}>{stats.jovensAprendizagem} Jovens ({pct}%)</span>
                       </div>
                       <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(10,37,64,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                         <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-orange)', borderRadius: '9999px', transition: 'width 1s ease' }} />
                       </div>
                     </>
                   );
                 })()}
               </div>
             </div>
           </div>

           {/* Gamification Box */}
           <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
             <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
               <Gift size={20} style={{ color: 'var(--color-orange)' }} />
               Engajamento & Gamificação
             </h3>
             <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '1.25rem', fontWeight: 500 }}>
               Métricas de incentivo pelo sistema de conquistas e pontuação do Portal do Aluno.
             </p>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
               <div style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1rem', borderRadius: '8px' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Média de Pontos</span>
                 <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-orange)' }}>{stats.pontosMedios} pts</span>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', display: 'block', marginTop: '0.25rem', fontWeight: 500 }}>acumulados por jovem</span>
               </div>

               <Link href="/tecnicos/resgates" style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1rem', borderRadius: '8px', display: 'block' }} className="hover-card">
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                   <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-orange)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                   Resgates Pendentes
                 </span>
                 <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-orange)' }}>{stats.resgatesPendentes} resgates</span>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-orange)', display: 'block', marginTop: '0.25rem', fontWeight: 700 }}>ir para aprovações &rarr;</span>
               </Link>
             </div>

             <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '6px' }}>
               <Sparkles size={16} style={{ color: 'var(--color-yellow)', flexShrink: 0, marginTop: '0.1rem' }} />
               <p style={{ fontSize: '0.72rem', color: '#b45309', lineHeight: '1.4', fontWeight: 600 }}>
                 <strong>Gamificação Ativa:</strong> Jovens acumulam pontos registrando relatos e depoimentos, e mantendo boa assiduidade e comportamento nos equipamentos. Os pontos podem ser trocados na Loja de Prêmios.
               </p>
             </div>
           </div>
         </div>

         {/* Column 2 */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           {/* Job Market Box */}
           <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
             <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
               <Briefcase size={20} style={{ color: 'var(--color-orange)' }} />
               Painel do Mercado de Trabalho (Vagas)
             </h3>
             <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '1.5rem', fontWeight: 500 }}>
               Status de ocupação das vagas abertas por empresas parceiras do Programa Descubra.
             </p>

             <div style={{ marginBottom: '1.25rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '0.4rem' }}>
                 <span>Taxa de Preenchimento de Vagas</span>
                 <span style={{ color: 'var(--color-text-light)' }}>
                   {stats.vagasPreenchidas} de {stats.totalVagas} vagas ({stats.totalVagas > 0 ? Math.round((stats.vagasPreenchidas / stats.totalVagas) * 100) : 0}%)
                 </span>
               </div>
               
               <div style={{ width: '100%', height: '12px', backgroundColor: 'rgba(10,37,64,0.06)', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                 {stats.totalVagas > 0 ? (
                   <>
                     <div style={{ width: `${(stats.vagasPreenchidas / stats.totalVagas) * 100}%`, height: '100%', backgroundColor: 'var(--color-secondary)' }} title={`Preenchidas: ${stats.vagasPreenchidas}`} />
                     <div style={{ width: `${(stats.vagasAbertas / stats.totalVagas) * 100}%`, height: '100%', backgroundColor: 'var(--color-orange)' }} title={`Abertas: ${stats.vagasAbertas}`} />
                   </>
                 ) : (
                   <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(10,37,64,0.06)' }} />
                 )}
               </div>

               <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-light)' }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                   <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-secondary)', borderRadius: '2px' }} />
                   {stats.vagasPreenchidas} Preenchidas
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                   <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-orange)', borderRadius: '2px' }} />
                   {stats.vagasAbertas} Abertas / Disponíveis
                 </span>
               </div>
             </div>

             <div style={{ borderTop: '1px solid rgba(10,37,64,0.06)', paddingTop: '1rem', marginTop: '1rem' }}>
               <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                 Status de Candidaturas e Encaminhamentos
               </h4>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                 <div style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '0.75rem', borderRadius: '6px' }}>
                   <span style={{ fontSize: '0.6rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Pendentes</span>
                   <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-orange)' }}>{stats.encaminhamentosPendentes}</span>
                 </div>
                 <div style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '0.75rem', borderRadius: '6px' }}>
                   <span style={{ fontSize: '0.6rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Aprovados</span>
                   <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{stats.encaminhamentosAprovados}</span>
                 </div>
                 <div style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '0.75rem', borderRadius: '6px' }}>
                   <span style={{ fontSize: '0.6rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Total</span>
                   <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.totalEncaminhamentos}</span>
                 </div>
               </div>
             </div>
           </div>

           {/* Quick Access Box */}
           <div className="report-stat-card" style={{ display: 'block', padding: '1.5rem', width: '100%' }}>
             <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
               Acesso Rápido a Operações
             </h3>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
               <Link href="/tecnicos/jovens" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1rem', borderRadius: '8px' }} className="hover-card">
                 <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '0.35rem' }}>
                   <Users size={14} />
                 </div>
                 <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>Novo Jovem</h4>
                 <p style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 500 }}>Registre um jovem aprendiz.</p>
               </Link>

               <Link href="/tecnicos/relatorios" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1rem', borderRadius: '8px' }} className="hover-card">
                 <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '0.35rem' }}>
                   <ClipboardList size={14} />
                 </div>
                 <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>Novo Acompanhamento</h4>
                 <p style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 500 }}>Registre relatos e evoluções de jovens.</p>
               </Link>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, colorClass }: { icon: any; label: string; value: number | string; colorClass: string }) {
  return (
    <div className="report-stat-card">
      <div className="report-stat-icon" style={{ backgroundColor: `rgba(${colorClass}, 0.1)`, color: `rgb(${colorClass})` }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="report-stat-val">{value}</div>
        <div className="report-stat-lbl" style={{ fontSize: '0.68rem' }}>{label}</div>
      </div>
    </div>
  );
}
