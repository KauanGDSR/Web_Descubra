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

export default function CursosPage() {
  const [jovemData, setJovemData] = useState<JovemCursos | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCursos = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let jData: JovemCursos | null = null;

        if (session?.user?.id) {
          const { data } = await supabase
            .from('jovens')
            .select('nome_completo, fez_pre_aprendizagem, passou_pre_aprendizagem, curso_pre_aprendizagem, curso_encaminhado, entidade_formadora, areas_interesse')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) jData = data as JovemCursos;
        }

        if (!jData) {
          const { data } = await supabase
            .from('jovens')
            .select('nome_completo, fez_pre_aprendizagem, passou_pre_aprendizagem, curso_pre_aprendizagem, curso_encaminhado, entidade_formadora, areas_interesse')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) jData = data as JovemCursos;
        }

        setJovemData(jData);
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
          Acompanhe sua formação técnica, cursos de pré-aprendizagem e trilhas profissionalizantes do Programa Descubra.
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

      {/* Trilhas e Capacitações Parceiras */}
      <div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={20} /> Trilhas de Capacitação Ofertadas pelo Descubra
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {[
            {
              titulo: 'Auxiliar Administrativo & Rotinas de Escritório',
              parceiro: 'SENAC Minas / Programa Descubra',
              carga: '400 horas',
              modalidade: 'Híbrido',
              descricao: 'Capacitação completa em redação empresarial, atendimento ao público, arquivos e informática aplicada.',
              status: 'Inscrições Abertas'
            },
            {
              titulo: 'Operação de Computadores & Suporte em TI',
              parceiro: 'SENAI / Programa Descubra',
              carga: '360 horas',
              modalidade: 'Presencial',
              descricao: 'Introdução à informática corporativa, manutenção básica, pacote Office e suporte operacional aos sistemas.',
              status: 'Em Planejamento'
            },
            {
              titulo: 'Atendimento ao Cliente & Vendas no Varejo',
              parceiro: 'Rede Cidadã / Programa Descubra',
              carga: '280 horas',
              modalidade: 'Presencial',
              descricao: 'Técnicas de comunicação assertiva, relacionamento com clientes, etiqueta profissional e postura ética.',
              status: 'Inscrições Abertas'
            }
          ].map((curso, idx) => (
            <motion.div
              key={idx}
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
                    {curso.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{curso.carga}</span>
                </div>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                  {curso.titulo}
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.6rem' }}>
                  <Building size={14} /> {curso.parceiro}
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {curso.descricao}
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Modalidade: <strong>{curso.modalidade}</strong></span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>Gratuito &bull; Programa Descubra</span>
              </div>
            </motion.div>
          ))}
        </div>
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
