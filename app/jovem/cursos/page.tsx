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
  AlertCircle,
  Upload,
  Plus,
  FileText,
  ExternalLink,
  ShieldCheck,
  X,
  FileCheck
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface JovemCursos {
  id: string;
  nome_completo: string;
  fez_pre_aprendizagem: boolean;
  passou_pre_aprendizagem: boolean;
  curso_pre_aprendizagem: string | null;
  curso_encaminhado: string | null;
  entidade_formadora: string | null;
  areas_interesse: string[] | null;
  pontuacao_atual: number;
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

interface CertificadoAluno {
  id: string;
  jovem_id: string;
  titulo_curso: string;
  instituicao: string;
  carga_horaria: string;
  data_conclusao: string;
  arquivo_url: string;
  arquivo_nome: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  pontos_atribuidos: number;
  parecer_tecnico?: string | null;
  created_at: string;
}

export default function CursosPage() {
  const [activeTab, setActiveTab] = useState<'ofertados' | 'meus_certificados'>('ofertados');
  const [jovemData, setJovemData] = useState<JovemCursos | null>(null);
  const [cursos, setCursos] = useState<CursoCapacitacao[]>([]);
  const [certificados, setCertificados] = useState<CertificadoAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCerts, setLoadingCerts] = useState(false);

  // Modal de envio de certificado
  const [modalAberto, setModalAberto] = useState(false);
  const [tituloCurso, setTituloCurso] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('');
  const [dataConclusao, setDataConclusao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchJovemAndCursos = async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        window.location.href = '/login';
        return;
      }

      const { data } = await supabase
        .from('jovens')
        .select('id, nome_completo, fez_pre_aprendizagem, passou_pre_aprendizagem, curso_pre_aprendizagem, curso_encaminhado, entidade_formadora, areas_interesse, pontuacao_atual')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data) {
        setJovemData({
          ...data,
          pontuacao_atual: data.pontuacao_atual ?? 0
        } as JovemCursos);
      }

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

  const fetchCertificados = async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch('/api/jovem/certificados');
      if (res.ok) {
        const json = await res.json();
        setCertificados(json.certificados || []);
      }
    } catch (err) {
      console.error('Erro ao carregar certificados:', err);
    } finally {
      setLoadingCerts(false);
    }
  };

  useEffect(() => {
    fetchJovemAndCursos();
    fetchCertificados();
  }, []);

  const handleOpenModal = () => {
    setTituloCurso('');
    setInstituicao('');
    setCargaHoraria('');
    setDataConclusao('');
    setArquivo(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalAberto(true);
  };

  const handleSubmitCertificado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setSubmitError('Por favor, selecione o arquivo do seu certificado ou comprovante.');
      return;
    }
    if (!tituloCurso.trim()) {
      setSubmitError('Informe o nome ou título do curso.');
      return;
    }
    if (!instituicao.trim()) {
      setSubmitError('Informe a instituição que emitiu o certificado.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('titulo', tituloCurso.trim());
      formData.append('instituicao', instituicao.trim());
      formData.append('carga_horaria', cargaHoraria.trim());
      formData.append('data_conclusao', dataConclusao);

      const res = await fetch('/api/jovem/certificados', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar comprovante de curso.');
      }

      setSubmitSuccess('Certificado enviado com sucesso! Nossa equipe técnica irá analisar para creditar seus pontos.');
      if (data.certificado) {
        setCertificados(prev => [data.certificado, ...prev]);
      } else {
        fetchCertificados();
      }

      setTimeout(() => {
        setModalAberto(false);
        setSubmitSuccess(null);
      }, 2200);
    } catch (err: any) {
      setSubmitError(err.message || 'Erro inesperado ao enviar certificado.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando trilhas de capacitação...</p>
      </div>
    );
  }

  const preAprendizagemConcluida = jovemData?.passou_pre_aprendizagem || jovemData?.fez_pre_aprendizagem;
  const certificadosAprovados = certificados.filter(c => c.status === 'Aprovado');
  const totalPontosCertificados = certificadosAprovados.reduce((acc, c) => acc + (c.pontos_atribuidos || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      {/* Header com Saldo de Pontos */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)', margin: 0 }}>
            Cursos & Capacitação Profissional
          </h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Acesse cursos parceiros ou anexe certificados de cursos que você concluiu por conta própria para ganhar pontos!
          </p>
        </div>

        <Link
          href="/jovem/premios"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: '0.65rem 1.15rem',
            borderRadius: '2rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.92rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          <Award size={18} />
          <span>Seu Saldo: <strong>{jovemData?.pontuacao_atual ?? 0} pts</strong></span>
        </Link>
      </header>

      {/* Navegação entre Sub-abas */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '0.35rem',
        borderRadius: '0.85rem',
        gap: '0.35rem',
        width: 'fit-content',
        maxWidth: '100%',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('ofertados')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.65rem',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'ofertados' ? '#fff' : 'transparent',
            color: activeTab === 'ofertados' ? 'var(--color-primary)' : '#64748b',
            boxShadow: activeTab === 'ofertados' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <GraduationCap size={18} />
          <span>Cursos Ofertados pelas Empresas</span>
          {cursos.length > 0 && (
            <span style={{
              background: activeTab === 'ofertados' ? 'var(--color-primary)' : '#cbd5e1',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '1rem',
              fontWeight: 700
            }}>
              {cursos.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('meus_certificados')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.65rem',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'meus_certificados' ? '#fff' : 'transparent',
            color: activeTab === 'meus_certificados' ? '#10b981' : '#64748b',
            boxShadow: activeTab === 'meus_certificados' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Sparkles size={18} />
          <span>Meus Certificados & Conquistas</span>
          {certificados.length > 0 && (
            <span style={{
              background: activeTab === 'meus_certificados' ? '#10b981' : '#cbd5e1',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '1rem',
              fontWeight: 700
            }}>
              {certificados.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: CURSOS OFERTADOS PELAS EMPRESAS & FORMAÇÃO DO ALUNO   */}
      {/* ============================================================== */}
      {activeTab === 'ofertados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
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
              <BookOpen size={20} /> Cursos & Vagas Formativas em Destaque
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
                  Nenhum curso ofertado com inscrições abertas no momento
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
                  Novas oportunidades abertas pelas entidades formadoras (SENAC, SENAI, Rede Cidadã) e empresas parceiras serão divulgadas aqui.
                </p>
                <button
                  onClick={() => setActiveTab('meus_certificados')}
                  style={{
                    marginTop: '0.5rem',
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '0.6rem',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Sparkles size={16} /> Fez outro curso por fora? Envie seu certificado para ganhar pontos &rarr;
                </button>
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
      )}

      {/* ============================================================== */}
      {/* ABA 2: MEUS CERTIFICADOS & CONQUISTAS (NOVO SISTEMA DE PONTOS) */}
      {/* ============================================================== */}
      {activeTab === 'meus_certificados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hero Banner de Gamificação */}
          <div style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
            color: '#fff',
            borderRadius: '1.25rem',
            padding: '1.75rem',
            boxShadow: '0 8px 24px rgba(5, 150, 105, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', zIndex: 1 }}>
              <div style={{ maxWidth: '650px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.18)', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.75rem', backdropFilter: 'blur(4px)' }}>
                  <Sparkles size={14} color="#fde047" /> Bonificação por Esforço & Autodesenvolvimento
                </div>
                <h3 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700, color: '#fff' }}>
                  Conquiste Pontos com seus Cursos Concluídos!
                </h3>
                <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.94rem', color: '#ecfdf5', lineHeight: 1.5 }}>
                  Você buscou qualificação por iniciativa própria? Fez cursos online (Fundação Bradesco, Coursera, SEBRAE, Udemy) ou presenciais? 
                  <strong> Anexe seu certificado aqui!</strong> O técnico do programa validará seu documento e concederá pontos para você trocar por prêmios na nossa loja.
                </p>
              </div>

              <button
                onClick={handleOpenModal}
                style={{
                  background: '#fde047',
                  color: '#064e3b',
                  border: 'none',
                  padding: '0.85rem 1.4rem',
                  borderRadius: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  alignSelf: 'flex-start'
                }}
              >
                <Upload size={18} />
                <span>Anexar Novo Certificado</span>
              </button>
            </div>

            {/* Resumo Rápido */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: '1rem',
              zIndex: 1
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Certificados Enviados
                </span>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#fff' }}>
                  {certificados.length}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Certificados Validados
                </span>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#fff' }}>
                  {certificadosAprovados.length}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Pontos Acumulados por Cursos
                </span>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#fde047' }}>
                  +{totalPontosCertificados} pts
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Certificados Enviados */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={20} /> Histórico de Certificados Enviados
              </h3>
              {certificados.length > 0 && (
                <button
                  onClick={handleOpenModal}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: 'var(--color-primary)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Plus size={16} /> Novo Envio
                </button>
              )}
            </div>

            {loadingCerts ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.9rem' }}>Carregando seus certificados...</p>
              </div>
            ) : certificados.length === 0 ? (
              <div style={{
                background: '#fff',
                borderRadius: '1rem',
                border: '2px dashed #cbd5e1',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}>
                  <Award size={28} />
                </div>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', margin: 0 }}>
                  Você ainda não anexou nenhum certificado
                </h4>
                <p style={{ fontSize: '0.92rem', color: '#64748b', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
                  Terminou algum curso de informática, línguas, inteligência artificial, atendimento ou segurança no trabalho? Clique no botão abaixo para anexar seu comprovante.
                </p>
                <button
                  onClick={handleOpenModal}
                  style={{
                    marginTop: '0.5rem',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.65rem',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Upload size={18} /> Anexar Meu Primeiro Certificado
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {certificados.map((cert) => {
                  const isAprovado = cert.status === 'Aprovado';
                  const isRejeitado = cert.status === 'Rejeitado';
                  const isPendente = cert.status === 'Pendente';

                  return (
                    <motion.div
                      key={cert.id}
                      whileHover={{ scale: 1.01 }}
                      style={{
                        background: '#fff',
                        borderRadius: '1rem',
                        border: isAprovado ? '1px solid #a7f3d0' : isRejeitado ? '1px solid #fecaca' : '1px solid #e2e8f0',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Status Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          {isAprovado && (
                            <span style={{
                              background: '#ecfdf5',
                              color: '#059669',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '2rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <CheckCircle2 size={14} /> Validado (+{cert.pontos_atribuidos} pts)
                            </span>
                          )}

                          {isPendente && (
                            <span style={{
                              background: '#fef3c7',
                              color: '#d97706',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '2rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <Clock size={14} /> Em Análise Técnica
                            </span>
                          )}

                          {isRejeitado && (
                            <span style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '2rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <AlertCircle size={14} /> Necessário Ajuste
                            </span>
                          )}

                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {new Date(cert.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        {/* Título & Instituição */}
                        <h4 style={{ fontSize: '1.05rem', color: 'var(--color-primary)', margin: '0 0 0.4rem 0', lineHeight: 1.35, fontWeight: 700 }}>
                          {cert.titulo_curso}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.5rem 0' }}>
                          <Building size={14} color="#64748b" /> {cert.instituicao}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                          {cert.carga_horaria && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={13} /> {cert.carga_horaria}
                            </span>
                          )}
                          {cert.data_conclusao && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Calendar size={13} /> Concluído em: {new Date(cert.data_conclusao).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {/* Parecer do Técnico (se houver) */}
                        {cert.parecer_tecnico && (
                          <div style={{
                            background: isAprovado ? '#f0fdf4' : isRejeitado ? '#fff1f2' : '#f8fafc',
                            padding: '0.75rem',
                            borderRadius: '0.65rem',
                            border: `1px solid ${isAprovado ? '#bbf7d0' : isRejeitado ? '#fecdd3' : '#e2e8f0'}`,
                            fontSize: '0.82rem',
                            color: '#334155',
                            marginTop: '0.5rem',
                            lineHeight: 1.45
                          }}>
                            <strong>Parecer da Equipe Técnica:</strong> {cert.parecer_tecnico}
                          </div>
                        )}
                      </div>

                      {/* Ações / Download do arquivo */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <a
                          href={cert.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--color-primary)',
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <FileText size={16} /> Ver Comprovante <ExternalLink size={13} />
                        </a>

                        {isAprovado && (
                          <span style={{
                            color: '#059669',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <ShieldCheck size={16} /> +{cert.pontos_atribuidos} pts creditados
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE ENVIO DE CERTIFICADO DO JOVEM                        */}
      {/* ============================================================== */}
      {modalAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.25rem',
          zIndex: 9999,
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              background: '#fff',
              borderRadius: '1.25rem',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
          >
            {/* Fechar */}
            <button
              onClick={() => !submitting && setModalAberto(false)}
              disabled={submitting}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.5rem', borderRadius: '0.65rem' }}>
                <Award size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
                  Anexar Certificado de Curso
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Ganhe pontos trocáveis por prêmios comprovando seus cursos
                </p>
              </div>
            </div>

            {submitSuccess ? (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                textAlign: 'center',
                margin: '1.5rem 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={36} color="#059669" />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{submitSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitCertificado} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginTop: '1.25rem' }}>
                {submitError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '0.85rem',
                    borderRadius: '0.65rem',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertCircle size={18} />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>
                    Nome do Curso / Capacitação <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Informática Básica, Excel Avançado, Atendimento ao Público"
                    value={tituloCurso}
                    onChange={(e) => setTituloCurso(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Instituição Emissora <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fundação Bradesco, SENAI, Coursera, SEBRAE, Udemy"
                    value={instituicao}
                    onChange={(e) => setInstituicao(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={labelStyle}>Carga Horária (Aprox.)</label>
                    <input
                      type="text"
                      placeholder="Ex: 40 horas, 20h"
                      value={cargaHoraria}
                      onChange={(e) => setCargaHoraria(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Data de Conclusão</label>
                    <input
                      type="date"
                      value={dataConclusao}
                      onChange={(e) => setDataConclusao(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Upload do Arquivo */}
                <div>
                  <label style={labelStyle}>
                    Arquivo do Certificado (PDF, Imagem JPG/PNG) <span style={{ color: '#ef4444' }}>*</span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: arquivo ? '#f0fdf4' : '#f8fafc',
                      borderColor: arquivo ? '#10b981' : '#cbd5e1',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Upload size={24} color={arquivo ? '#10b981' : '#64748b'} />
                    {arquivo ? (
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: '#065f46', fontSize: '0.9rem' }}>
                          {arquivo.name}
                        </p>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {(arquivo.size / (1024 * 1024)).toFixed(2)} MB &bull; Clique para trocar
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                          Clique aqui para selecionar seu certificado
                        </p>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          Formatos aceitos: PDF, PNG, JPG, JPEG (máx. 10MB)
                        </span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArquivo(e.target.files[0]);
                        setSubmitError(null);
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setModalAberto(false)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '0.65rem',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#64748b',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.65rem',
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Enviando Comprovante...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Enviar Certificado
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.85rem',
  borderRadius: '0.6rem',
  border: '1px solid #cbd5e1',
  fontSize: '0.92rem',
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
};
