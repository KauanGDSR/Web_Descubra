'use client';

import { motion } from 'framer-motion';
import { 
  BarChart, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  Award, 
  Loader2, 
  MessageSquare,
  Sparkles,
  Send,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useDialog } from '@/frontend/components/ui/CustomDialog';

interface Acompanhamento {
  id: string;
  jovem_id: string;
  resumo: string;
  assiduidade: string | null;
  desempenho: string | null;
  comportamento: string | null;
  data_registro: string;
}

interface DepoimentoAluno {
  id: string;
  texto_trajetoria: string;
  status_aprovacao: string;
  data_envio: string;
}

export default function AcompanhamentoPage() {
  const dialog = useDialog();
  const [registros, setRegistros] = useState<Acompanhamento[]>([]);
  const [meusDepoimentos, setMeusDepoimentos] = useState<DepoimentoAluno[]>([]);
  const [jovemNome, setJovemNome] = useState('Jovem Aprendiz');
  const [jovemId, setJovemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado do modal de depoimento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [textoDepoimento, setTextoDepoimento] = useState('');
  const [enviando, setEnviando] = useState(false);

  const loadDepoimentos = async (jid: string) => {
    try {
      const res = await fetch(`/api/jovem/depoimentos?jovemId=${jid}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMeusDepoimentos(data.depoimentos || []);
      }
    } catch (err) {
      console.error('Erro ao carregar depoimentos do jovem:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let targetJovemId: string | null = session?.user?.id || null;

        if (targetJovemId) {
          const { data: j } = await supabase
            .from('jovens')
            .select('id, nome_completo, nome_social')
            .eq('id', targetJovemId)
            .maybeSingle();
          if (j) {
            setJovemNome(j.nome_social || j.nome_completo);
            setJovemId(j.id);
          } else {
            targetJovemId = null;
          }
        }

        // Se não achou por session.user.id, busca o jovem mais recente
        if (!targetJovemId) {
          const { data: fallbackJ } = await supabase
            .from('jovens')
            .select('id, nome_completo, nome_social')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fallbackJ) {
            targetJovemId = fallbackJ.id;
            setJovemId(fallbackJ.id);
            setJovemNome(fallbackJ.nome_social || fallbackJ.nome_completo);
          }
        }

        // Busca os acompanhamentos do jovem
        if (targetJovemId) {
          let { data: acompData } = await supabase
            .from('acompanhamentos')
            .select('*')
            .eq('jovem_id', targetJovemId)
            .order('data_registro', { ascending: false });

          // Se este jovem específico não tiver registros ainda, traz os registros pedagógicos do sistema
          if (!acompData || acompData.length === 0) {
            const { data: allAcomp } = await supabase
              .from('acompanhamentos')
              .select('*')
              .order('data_registro', { ascending: false });
            acompData = allAcomp;
          }

          setRegistros(acompData || []);
          await loadDepoimentos(targetJovemId);
        }

      } catch (err) {
        console.error('Erro ao carregar acompanhamentos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleEnviarDepoimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoDepoimento.trim() || textoDepoimento.trim().length < 10) {
      dialog.alert('Atenção', 'Escreva um relato com pelo menos 10 caracteres.', 'warning');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/jovem/depoimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textoTrajetoria: textoDepoimento.trim(),
          jovemId: jovemId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar depoimento.');
      }

      await dialog.alert(
        'Depoimento Enviado!',
        'Seu depoimento foi encaminhado com sucesso para a equipe técnica analisar e aprovar. Muito obrigado por compartilhar sua história!',
        'success'
      );

      setTextoDepoimento('');
      setIsModalOpen(false);

      if (jovemId) {
        await loadDepoimentos(jovemId);
      }

      // Notifica as abas da barra lateral para atualizar os badges instantaneamente
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('update-admin-badges'));
      }
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Enviar', err.message || 'Erro inesperado ao salvar depoimento.', 'danger');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando histórico de acompanhamento do banco de dados...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Meu Progresso & Acompanhamentos</h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Histórico de avaliações, frequências e observações pedagógicas registradas pelos técnicos e educadores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, var(--color-orange, #F97316) 0%, #EA580C 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Sparkles size={18} />
          Enviar Meu Depoimento
        </button>
      </header>

      {/* Resumo em Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <BarChart size={24} />
          </div>
          <h3 style={cardTitleStyle}>{registros.length} Registros</h3>
          <p style={cardSubtitleStyle}>Avaliações Registradas</p>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <Award size={24} />
          </div>
          <h3 style={cardTitleStyle}>Em Evolução</h3>
          <p style={cardSubtitleStyle}>Status de Desempenho Geral</p>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#ffedd5', color: '#ea580c' }}>
            <Calendar size={24} />
          </div>
          <h3 style={cardTitleStyle}>{registros.length > 0 ? 'Atualizado' : 'Aguardando'}</h3>
          <p style={cardSubtitleStyle}>Último Registro no Sistema</p>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconWrapperStyle, backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <MessageSquare size={24} />
          </div>
          <h3 style={cardTitleStyle}>{meusDepoimentos.length}</h3>
          <p style={cardSubtitleStyle}>Depoimentos Enviados</p>
        </div>
      </div>

      {/* Seção Meus Depoimentos */}
      {meusDepoimentos.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--color-orange)" /> Meus Depoimentos & Relatos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {meusDepoimentos.map((dep) => {
              const isPendente = dep.status_aprovacao === 'Pendente';
              const isAprovado = dep.status_aprovacao === 'Aprovado';
              return (
                <div
                  key={dep.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Enviado em {formatDate(dep.data_envio)}
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '2rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        backgroundColor: isAprovado ? '#dcfce7' : isPendente ? '#fef3c7' : '#fee2e2',
                        color: isAprovado ? '#16a34a' : isPendente ? '#b45309' : '#dc2626'
                      }}
                    >
                      {isAprovado ? '✓ Publicado' : isPendente ? '⏳ Aguardando Aprovação Técnica' : '✗ Devolvido para Ajustes'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-text-dark)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    "{dep.texto_trajetoria}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Registros Pedagógicos */}
      <div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} /> Histórico de Pareceres e Frequências ({registros.length})
        </h3>

        {registros.length === 0 ? (
          <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>Nenhum parecer ou acompanhamento registrado até o momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {registros.map((item, index) => (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  background: '#fff',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {/* Topo do Card: Data e Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <Clock size={16} color="var(--color-primary)" />
                    <span>{formatDate(item.data_registro)}</span>
                  </div>

                  {/* Badges de Avaliação */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {item.assiduidade && (
                      <span style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '2rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        Assiduidade: {item.assiduidade}
                      </span>
                    )}

                    {item.desempenho && (
                      <span style={{
                        background: '#f0fdf4',
                        color: '#16a34a',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '2rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        Desempenho: {item.desempenho}
                      </span>
                    )}

                    {item.comportamento && (
                      <span style={{
                        background: '#faf5ff',
                        color: '#9333ea',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '2rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        Comportamento: {item.comportamento}
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo / Parecer do Educador */}
                <p style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-text-dark)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #f1f5f9'
                }}>
                  {item.resumo}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Envio de Depoimento */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 37, 64, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => !enviando && setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '560px',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', background: '#ffedd5', color: '#ea580c', borderRadius: '0.6rem' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                    Compartilhe sua História
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Seu depoimento será avaliado e divulgado pela equipe técnica!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={enviando}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.3rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnviarDepoimento} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '0.4rem' }}>
                  Como o Programa Descubra transformou sua trajetória?
                </label>
                <textarea
                  required
                  rows={5}
                  value={textoDepoimento}
                  onChange={(e) => setTextoDepoimento(e.target.value)}
                  placeholder="Conte sobre sua participação nas oficinas, o que você mais aprendeu, os amigos que fez e como isso tem te preparado para o futuro..."
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-orange, #F97316)')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                />
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginTop: '0.25rem' }}>
                  Mínimo de 10 caracteres ({textoDepoimento.length} digitados)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={enviando}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || textoDepoimento.trim().length < 10}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: enviando || textoDepoimento.trim().length < 10
                      ? '#cbd5e1'
                      : 'linear-gradient(135deg, var(--color-orange, #F97316) 0%, #EA580C 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: enviando || textoDepoimento.trim().length < 10 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: enviando || textoDepoimento.trim().length < 10 ? 'none' : '0 4px 12px rgba(249, 115, 22, 0.35)'
                  }}
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {enviando ? 'Enviando...' : 'Enviar Depoimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos Reutilizáveis
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  padding: '1.25rem',
  borderRadius: '1rem',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
  border: '1px solid #f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  cursor: 'default',
};

const iconWrapperStyle: React.CSSProperties = {
  padding: '0.65rem',
  borderRadius: '0.75rem',
  marginBottom: '0.75rem',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 700,
  color: 'var(--color-title)',
  marginBottom: '0.2rem',
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#64748b',
  fontWeight: 500,
};
