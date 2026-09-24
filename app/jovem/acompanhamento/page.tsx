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
  Sparkles
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Acompanhamento {
  id: string;
  jovem_id: string;
  resumo: string;
  assiduidade: string | null;
  desempenho: string | null;
  comportamento: string | null;
  data_registro: string;
}

export default function AcompanhamentoPage() {
  const [registros, setRegistros] = useState<Acompanhamento[]>([]);
  const [jovemNome, setJovemNome] = useState('Jovem Aprendiz');
  const [loading, setLoading] = useState(true);

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
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Meu Progresso & Acompanhamentos</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Histórico de avaliações, frequências e observações pedagógicas registradas pelos técnicos e educadores.
        </p>
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
      </div>

      {/* Lista de Registros Reais */}
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
