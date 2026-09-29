'use client';

import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Building, 
  BookOpen, 
  Award, 
  Sparkles, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface JovemCursos {
  nome_completo: string;
  fez_pre_aprendizagem: boolean;
  passou_pre_aprendizagem: boolean;
  curso_pre_aprendizagem: string | null;
  curso_encaminhado: string | null;
  entidade_formadora: string | null;
  areas_interesse: string[] | null;
}

interface CursoCapacitacao {
  id: string;
  titulo: string;
  parceiro_nome: string;
  carga_horaria?: string;
  modalidade?: string;
  descricao?: string;
  status?: string;
  link_inscricao?: string;
}

export default function CursosPage() {
  const [jovemData, setJovemData] = useState<JovemCursos | null>(null);
  const [cursos, setCursos] = useState<CursoCapacitacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCursos = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          window.location.href = '/login';
          return;
        }

        const { data } = await supabase
          .from('jovens')
          .select('nome_completo, fez_pre_aprendizagem, passou_pre_aprendizagem, curso_pre_aprendizagem, curso_encaminhado, entidade_formadora, areas_interesse')
          .eq('id', session.user.id)
          .maybeSingle();
        let jData: JovemCursos | null = null;
        if (data) jData = data as JovemCursos;

        setJovemData(jData);

        // Buscar catálogo real de cursos cadastrados
        try {
          const { data: cursosData, error: cursosError } = await supabase
            .from('cursos_capacitacoes')
            .select('*')
            .order('created_at', { ascending: false });

          if (!cursosError && cursosData) {
            setCursos(cursosData as CursoCapacitacao[]);
          } else {
            setCursos([]);
          }
        } catch {
          setCursos([]);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de cursos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCursos();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando trilhas de capacitação...</p>
      </div>
    );
  }

  const preAprendizagemConcluida = jovemData?.passou_pre_aprendizagem || jovemData?.fez_pre_aprendizagem;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Cursos & Capacitação Profissional</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Acompanhe sua formação técnica, cursos de pré-aprendizagem e capacitações disponíveis no Programa Descubra.
        </p>
      </header>

      {/* Status da Formação do Aluno */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} /> Seu Status no Programa de Formação
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Etapa de Pré-Aprendizagem</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              {preAprendizagemConcluida ? (
                <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={16} /> Concluída / Apto
                </span>
              ) : (
                <span style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={16} /> Em Andamento
                </span>
              )}
            </div>
            {jovemData?.curso_pre_aprendizagem && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Curso: {jovemData.curso_pre_aprendizagem}
              </span>
            )}
          </div>

          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Entidade Formadora Vinculada</span>
            <strong style={infoValueStyle}>{jovemData?.entidade_formadora || 'Programa Descubra'}</strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
              Responsável pela certificação teórica
            </span>
          </div>

          <div style={infoBlockStyle}>
            <span style={infoLabelStyle}>Curso Encaminhado / Em Andamento</span>
            <strong style={infoValueStyle}>
              {jovemData?.curso_encaminhado && jovemData.curso_encaminhado !== 'Nenhum' 
                ? jovemData.curso_encaminhado 
                : 'Aguardando encaminhamento'}
            </strong>
          </div>
        </div>

        {/* Áreas de Interesse */}
        {jovemData?.areas_interesse && jovemData.areas_interesse.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ ...infoLabelStyle, display: 'block', marginBottom: '0.5rem' }}>Suas Áreas de Interesse Profissional</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {jovemData.areas_interesse.map((area, i) => (
                <span key={i} style={{ background: '#eff6ff', color: '#2563eb', padding: '0.3rem 0.85rem', borderRadius: '2rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trilhas e Capacitações Parceiras - SOMENTE DADOS REAIS */}
      <div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={20} /> Trilhas & Cursos Ofertados
        </h3>

        {cursos.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '1rem',
            border: '1px dashed #cbd5e1',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b'
            }}>
              <BookOpen size={26} />
            </div>
            <h4 style={{ fontSize: '1.05rem', color: 'var(--color-primary)', margin: 0 }}>
              Nenhum curso com inscrições abertas no momento
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
              Assim que novas turmas forem abertas pelas entidades formadoras (SENAC, SENAI, Rede Cidadã) ou empresas parceiras, elas aparecerão listadas aqui com informações e orientações de inscrição.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {cursos.map((curso) => (
              <motion.div
                key={curso.id}
                whileHover={{ scale: 1.01 }}
                style={{
                  background: '#fff',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {curso.status || 'Disponível'}
                    </span>
                    {curso.carga_horaria && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{curso.carga_horaria}</span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                    {curso.titulo}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.6rem' }}>
                    <Building size={14} /> {curso.parceiro_nome || 'Programa Descubra'}
                  </p>
                  {curso.descricao && (
                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                      {curso.descricao}
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Modalidade: <strong>{curso.modalidade || 'Presencial'}</strong>
                  </span>
                  {curso.link_inscricao ? (
                    <a
                      href={curso.link_inscricao}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'underline' }}
                    >
                      Inscrever-se &rarr;
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                      Gratuito &bull; Programa Descubra
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const infoBlockStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '0.85rem 1rem',
  borderRadius: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  border: '1px solid #f1f5f9',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--color-title)',
  fontWeight: 600,
};
