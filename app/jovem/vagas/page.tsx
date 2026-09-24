'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, Building, ChevronRight, X, Clock, DollarSign, GraduationCap, Users, Calendar, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Vaga {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  status: string;
  quantidade_vagas: number | null;
  cargo: string | null;
  horario: string | null;
  bolsa_auxilio: number | null;
  idade_minima: number | null;
  escolaridade_exigida: string | null;
  competencias_desejadas: string | null;
  created_at: string;
  empresa: string;
  cidade: string;
}

export default function VagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);

  useEffect(() => {
    const fetchVagas = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vagas_disponiveis')
        .select('*, empresas_parceiras(razao_social, nome_fantasia, cidades(nome))')
        .eq('status', 'Aberta')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: Vaga[] = data.map((v: any) => ({
          id: v.id,
          titulo: v.titulo,
          descricao: v.descricao,
          tipo: v.tipo,
          status: v.status,
          quantidade_vagas: v.quantidade_vagas,
          cargo: v.cargo,
          horario: v.horario,
          bolsa_auxilio: v.bolsa_auxilio,
          idade_minima: v.idade_minima,
          escolaridade_exigida: v.escolaridade_exigida,
          competencias_desejadas: v.competencias_desejadas,
          created_at: v.created_at,
          empresa: v.empresas_parceiras?.nome_fantasia || v.empresas_parceiras?.razao_social || 'Empresa',
          cidade: v.empresas_parceiras?.cidades?.nome || 'Pirapora',
        }));
        setVagas(formatted);
      }
      setLoading(false);
    };

    fetchVagas();
  }, []);

  const formatBolsa = (val: number | null) => {
    if (!val) return 'A combinar';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={36} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando vagas...</p>
      </div>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Mural de Vagas</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          {vagas.length > 0 ? `${vagas.length} vaga${vagas.length > 1 ? 's' : ''} disponível${vagas.length > 1 ? 'is' : ''} no momento.` : 'Nenhuma vaga aberta no momento.'}
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {vagas.map((vaga) => (
          <motion.div
            key={vaga.id}
            whileHover={{ scale: 1.01 }}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '1rem',
              padding: '1.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Topo: ícone + infos */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '50%', color: '#16a34a', flexShrink: 0 }}>
                <Briefcase size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                  {vaga.titulo}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Building size={14} /> {vaga.empresa}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} /> {vaga.cidade}
                  </span>
                  {vaga.tipo && (
                    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.1rem 0.5rem', borderRadius: '2rem', fontWeight: 600 }}>
                      {vaga.tipo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé: bolsa + botão */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-secondary)', lineHeight: 1 }}>
                  {formatBolsa(vaga.bolsa_auxilio)}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bolsa / Mês
                </span>
              </div>
              <button
                onClick={() => setVagaSelecionada(vaga)}
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '2rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                Ver Detalhes <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {vagaSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVagaSelecionada(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 9999, padding: '1rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '1.25rem',
                padding: '2rem',
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              {/* Cabeçalho do modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', marginBottom: '0.3rem' }}>
                    {vagaSelecionada.titulo}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={14} /> {vagaSelecionada.empresa} &bull; {vagaSelecionada.cidade}
                  </p>
                </div>
                <button
                  onClick={() => setVagaSelecionada(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chips de tipo e status */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {vagaSelecionada.tipo && (
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    {vagaSelecionada.tipo}
                  </span>
                )}
                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {vagaSelecionada.status}
                </span>
              </div>

              {/* Grid de informações */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { icon: <DollarSign size={16} />, label: 'Bolsa Auxílio', value: formatBolsa(vagaSelecionada.bolsa_auxilio) },
                  { icon: <Clock size={16} />, label: 'Horário', value: vagaSelecionada.horario || 'A combinar' },
                  { icon: <Users size={16} />, label: 'Vagas', value: vagaSelecionada.quantidade_vagas ? `${vagaSelecionada.quantidade_vagas} vaga(s)` : 'Não informado' },
                  { icon: <GraduationCap size={16} />, label: 'Escolaridade', value: vagaSelecionada.escolaridade_exigida || 'Não exigida' },
                  { icon: <Calendar size={16} />, label: 'Idade Mínima', value: vagaSelecionada.idade_minima ? `${vagaSelecionada.idade_minima} anos` : 'Não informado' },
                  { icon: <Calendar size={16} />, label: 'Publicado em', value: formatDate(vagaSelecionada.created_at) },
                ].map((item, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      {item.icon} {item.label}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-title)' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Cargo CBO */}
              {vagaSelecionada.cargo && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cargo / CBO</h4>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{vagaSelecionada.cargo}</p>
                </div>
              )}

              {/* Descrição */}
              {vagaSelecionada.descricao && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</h4>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{vagaSelecionada.descricao}</p>
                </div>
              )}

              {/* Competências */}
              {vagaSelecionada.competencias_desejadas && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Competências Desejadas</h4>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{vagaSelecionada.competencias_desejadas}</p>
                </div>
              )}

              {/* Botão de fechar */}
              <button
                onClick={() => setVagaSelecionada(null)}
                style={{
                  width: '100%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                }}
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

