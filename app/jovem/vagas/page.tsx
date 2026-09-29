'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Building, 
  ChevronRight, 
  X, 
  Clock, 
  DollarSign, 
  GraduationCap, 
  Users, 
  Calendar, 
  Loader2,
  CheckCircle2,
  Send,
  Info,
  AlertCircle
} from 'lucide-react';
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

  // Estados de manifestação de interesse
  const [manifestedVagas, setManifestedVagas] = useState<Record<string, string>>({});
  const [isManifesting, setIsManifesting] = useState(false);
  const [manifestFeedback, setManifestFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  const fetchManifestacoes = async () => {
    try {
      const res = await fetch('/api/jovem/manifestar-interesse');
      if (res.ok) {
        const json = await res.json();
        const map: Record<string, string> = {};
        (json.manifestacoes || []).forEach((m: any) => {
          map[m.vaga_id] = m.status;
        });
        setManifestedVagas(map);
      }
    } catch (err) {
      console.error('Erro ao verificar manifestações de interesse:', err);
    }
  };

  useEffect(() => {
    fetchVagas();
    fetchManifestacoes();
  }, []);

  const handleManifestarInteresse = async (vagaId: string) => {
    setIsManifesting(true);
    setManifestFeedback(null);

    try {
      const res = await fetch('/api/jovem/manifestar-interesse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vagaId }),
      });

      const json = await res.json();

      if (res.ok) {
        setManifestedVagas((prev) => ({
          ...prev,
          [vagaId]: json.status || 'Interesse Manifestado',
        }));
        setManifestFeedback({
          type: 'success',
          text: json.message || 'Interesse manifestado com sucesso! Seu técnico de referência foi notificado.',
        });
      } else {
        setManifestFeedback({
          type: 'error',
          text: json.error || 'Não foi possível registrar o interesse.',
        });
      }
    } catch {
      setManifestFeedback({
        type: 'error',
        text: 'Erro de comunicação com o servidor. Tente novamente.',
      });
    } finally {
      setIsManifesting(false);
    }
  };

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
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)', fontWeight: 800 }}>Mural de Vagas</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          {vagas.length > 0 ? `${vagas.length} vaga${vagas.length > 1 ? 's' : ''} disponível${vagas.length > 1 ? 'is' : ''} no momento.` : 'Nenhuma vaga aberta no momento.'}
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {vagas.map((vaga) => {
          const isManifested = !!manifestedVagas[vaga.id];
          const manifestStatus = manifestedVagas[vaga.id];

          return (
            <motion.div
              key={vaga.id}
              whileHover={{ scale: 1.01 }}
              style={{
                background: '#fff',
                border: isManifested ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.25rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
              }}
            >
              {/* Topo: ícone + infos */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: isManifested ? '#ecfdf5' : '#f0fdf4', padding: '0.75rem', borderRadius: '50%', color: isManifested ? '#059669' : '#16a34a', flexShrink: 0 }}>
                  <Briefcase size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--color-primary)', marginBottom: '0.35rem', lineHeight: 1.3, fontWeight: 700 }}>
                      {vaga.titulo}
                    </h3>
                    {isManifested && (
                      <span style={{ 
                        background: '#dcfce7', 
                        color: '#15803d', 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <CheckCircle2 size={12} />
                        {manifestStatus === 'Entrevista Agendada' ? 'Entrevista Agendada' : 'Interesse Registrado'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Building size={14} /> {vaga.empresa}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={14} /> {vaga.cidade}
                    </span>
                    {vaga.tipo && (
                      <span style={{ background: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '4px', color: '#475569', fontWeight: 500 }}>
                        {vaga.tipo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhes Rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Bolsa / Salário</span>
                  <strong style={{ color: 'var(--color-primary)' }}>{formatBolsa(vaga.bolsa_auxilio)}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Vagas</span>
                  <strong style={{ color: 'var(--color-primary)' }}>{vaga.quantidade_vagas ? `${vaga.quantidade_vagas} vaga(s)` : 'A definir'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Horário</span>
                  <strong style={{ color: 'var(--color-primary)' }}>{vaga.horario || 'A combinar'}</strong>
                </div>
              </div>

              {/* Botão de Ver Detalhes */}
              <button
                onClick={() => {
                  setManifestFeedback(null);
                  setVagaSelecionada(vaga);
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-primary)',
                  color: 'var(--color-primary)',
                  padding: '0.65rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s',
                }}
              >
                Ver Detalhes & Candidatura <ChevronRight size={16} />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Modal de Detalhes da Vaga */}
      <AnimatePresence>
        {vagaSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1000,
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setVagaSelecionada(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '1rem',
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.5rem',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Botão Fechar */}
              <button
                onClick={() => setVagaSelecionada(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '0.4rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>

              {/* Cabeçalho do Modal */}
              <div style={{ paddingRight: '2rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'inline-block', background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {vagaSelecionada.tipo || 'Jovem Aprendiz'}
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)', lineHeight: 1.3, fontWeight: 800 }}>
                  {vagaSelecionada.titulo}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  {vagaSelecionada.empresa} &bull; {vagaSelecionada.cidade}
                </p>
              </div>

              {/* Grid de Informações Chave */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem' }}>
                {[
                  { icon: <DollarSign size={16} />, label: 'Bolsa / Salário', value: formatBolsa(vagaSelecionada.bolsa_auxilio) },
                  { icon: <Clock size={16} />, label: 'Carga / Horário', value: vagaSelecionada.horario || 'A combinar' },
                  { icon: <Users size={16} />, label: 'Vagas Abertas', value: vagaSelecionada.quantidade_vagas || '1' },
                  { icon: <GraduationCap size={16} />, label: 'Escolaridade', value: vagaSelecionada.escolaridade_exigida || 'Ensino Fundamental/Médio' },
                  { icon: <Calendar size={16} />, label: 'Publicada em', value: formatDate(vagaSelecionada.created_at) },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.75rem' }}>
                      {item.icon} {item.label}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-title)' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Cargo CBO */}
              {vagaSelecionada.cargo && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Cargo / CBO</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', margin: 0 }}>{vagaSelecionada.cargo}</p>
                </div>
              )}

              {/* Descrição */}
              {vagaSelecionada.descricao && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Descrição da Oportunidade</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>{vagaSelecionada.descricao}</p>
                </div>
              )}

              {/* Competências */}
              {vagaSelecionada.competencias_desejadas && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Competências Desejadas</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', margin: 0 }}>{vagaSelecionada.competencias_desejadas}</p>
                </div>
              )}

              {/* ORIENTAÇÃO INSTITUCIONAL DO FLUXO DO DESCUBRA */}
              <div style={{ 
                backgroundColor: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                borderRadius: '0.75rem', 
                padding: '0.85rem', 
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'flex-start'
              }}>
                <Info size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.45 }}>
                  <strong>Como funciona o encaminhamento?</strong><br />
                  No Programa Descubra, o direcionamento para as vagas parceiras é acompanhado pelo seu <strong>técnico socioassistencial</strong> (CRAS/CREAS). Ao manifestar interesse, a equipe técnica receberá seu pedido no sistema para avaliar seu perfil socioeducativo e realizar o encaminhamento oficial.
                </div>
              </div>

              {/* MENSAGEM DE FEEDBACK */}
              {manifestFeedback && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: manifestFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: manifestFeedback.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  color: manifestFeedback.type === 'success' ? '#166534' : '#991b1b',
                }}>
                  {manifestFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{manifestFeedback.text}</span>
                </div>
              )}

              {/* AÇÕES: BOTÃO DE MANIFESTAR INTERESSE E FECHAR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {manifestedVagas[vagaSelecionada.id] ? (
                  <div style={{
                    width: '100%',
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    color: '#15803d',
                    padding: '0.85rem',
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textAlign: 'center',
                  }}>
                    <CheckCircle2 size={18} />
                    Interesse já Manifestado &bull; Em Acompanhamento Técnico
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isManifesting}
                    onClick={() => handleManifestarInteresse(vagaSelecionada.id)}
                    style={{
                      width: '100%',
                      background: 'var(--color-secondary, #2563eb)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.9rem',
                      borderRadius: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: isManifesting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                      transition: 'filter 0.2s',
                    }}
                  >
                    {isManifesting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Enviando manifestação...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Manifestar Interesse nesta Vaga
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setVagaSelecionada(null)}
                  style={{
                    width: '100%',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
