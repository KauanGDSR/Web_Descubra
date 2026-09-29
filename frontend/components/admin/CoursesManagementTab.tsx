'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Clock,
  CheckCircle,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  BookOpen,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  Copy,
  Check,
  Award,
  FileText,
  FileCheck,
  Calendar,
  User,
  ShieldCheck,
  XCircle,
  Filter,
  ArrowRight
} from 'lucide-react';
import { useDialog } from '@/frontend/components/ui/CustomDialog';
import Modal from '@/frontend/components/ui/Modal';

interface Curso {
  id: string;
  titulo: string;
  parceiro_nome: string;
  descricao: string;
  carga_horaria: string;
  modalidade: string;
  status: string;
  link_inscricao?: string | null;
  ativo: boolean;
  criado_por?: string;
  created_at: string;
}

interface CertificadoItem {
  id: string;
  jovem_id: string;
  jovem_nome?: string;
  jovem_cidade?: string;
  jovem_pontos?: number;
  titulo_curso: string;
  instituicao: string;
  carga_horaria: string;
  data_conclusao: string;
  arquivo_url: string;
  arquivo_nome: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  pontos_atribuidos: number;
  parecer_tecnico?: string | null;
  validado_por?: string | null;
  validado_em?: string | null;
  created_at: string;
}

const EMPTY_CURSO_FORM = {
  id: '',
  titulo: '',
  parceiro_nome: '',
  descricao: '',
  carga_horaria: '40 horas',
  modalidade: 'Presencial',
  status: 'Inscrições Abertas',
  link_inscricao: '',
  ativo: true
};

const SQL_TABLE_SETUP = `-- Script para criar a tabela de Cursos e Capacitações no Supabase:
CREATE TABLE IF NOT EXISTS public.cursos_capacitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  parceiro_nome TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas_parceiras(id) ON DELETE SET NULL,
  carga_horaria TEXT,
  modalidade TEXT DEFAULT 'Presencial',
  status TEXT DEFAULT 'Inscrições Abertas',
  link_inscricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cursos_capacitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de cursos ativos"
ON public.cursos_capacitacoes FOR SELECT
USING (ativo = true OR auth.role() = 'authenticated');

CREATE POLICY "Gerenciar cursos autenticados"
ON public.cursos_capacitacoes FOR ALL
USING (auth.role() = 'authenticated');`;

export default function CoursesManagementTab() {
  const dialog = useDialog();

  // Sub-abas principais
  const [mainTab, setMainTab] = useState<'catalogo' | 'certificados'>('catalogo');

  // Estado dos Cursos Ofertados
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Filtros dos Cursos
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalidade, setFilterModalidade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal de Curso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formCurso, setFormCurso] = useState(EMPTY_CURSO_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Estado dos Certificados dos Alunos
  const [certificados, setCertificados] = useState<CertificadoItem[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certSearch, setCertSearch] = useState('');
  const [certFilterStatus, setCertFilterStatus] = useState('');

  // Modal de Avaliação do Certificado
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificadoItem | null>(null);
  const [evalStatus, setEvalStatus] = useState<'Aprovado' | 'Rejeitado'>('Aprovado');
  const [evalPontos, setEvalPontos] = useState<number>(100);
  const [evalParecer, setEvalParecer] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // Carregar Cursos
  const loadCursos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cursos');
      const data = await res.json();

      if (data.tableMissing) {
        setTableMissing(true);
        setCursos([]);
      } else if (res.ok && data.cursos) {
        setTableMissing(false);
        setCursos(data.cursos);
      }
    } catch (err: any) {
      console.error('Erro ao carregar cursos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar Certificados
  const loadCertificados = async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch('/api/tecnicos/certificados');
      if (res.ok) {
        const data = await res.json();
        setCertificados(data.certificados || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar certificados:', err);
    } finally {
      setLoadingCerts(false);
    }
  };

  useEffect(() => {
    loadCursos();
    loadCertificados();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_TABLE_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleOpenCreateModal = () => {
    setFormCurso(EMPTY_CURSO_FORM);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (curso: Curso) => {
    setFormCurso({
      id: curso.id,
      titulo: curso.titulo,
      parceiro_nome: curso.parceiro_nome,
      descricao: curso.descricao || '',
      carga_horaria: curso.carga_horaria || '',
      modalidade: curso.modalidade || 'Presencial',
      status: curso.status || 'Inscrições Abertas',
      link_inscricao: curso.link_inscricao || '',
      ativo: curso.ativo
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCurso.titulo.trim() || !formCurso.parceiro_nome.trim()) {
      dialog.alert('Campos Obrigatórios', 'Preencha o título do curso e o nome da entidade/parceiro.', 'warning');
      return;
    }

    setFormSubmitting(true);
    try {
      const isEdit = modalMode === 'edit';
      const res = await fetch('/api/admin/cursos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCurso)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar curso.');

      await dialog.alert('Sucesso', data.mensagem || 'Curso salvo com sucesso!', 'success');
      setIsModalOpen(false);
      loadCursos();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar gravar curso.', 'danger');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleAtivo = async (curso: Curso) => {
    try {
      const res = await fetch('/api/admin/cursos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: curso.id, ativo: !curso.ativo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao alterar visibilidade.');

      setCursos((prev) =>
        prev.map((c) => (c.id === curso.id ? { ...c, ativo: !curso.ativo } : c))
      );
    } catch (err: any) {
      dialog.alert('Erro', err.message, 'danger');
    }
  };

  const handleDeleteCurso = async (curso: Curso) => {
    const confirmed = await dialog.confirm(
      'Excluir Curso',
      `Tem certeza que deseja excluir a capacitação "${curso.titulo}"? Esta ação removerá a turma do catálogo dos jovens.`,
      'danger'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/cursos?id=${curso.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir curso.');

      await dialog.alert('Excluído', 'O curso foi removido com sucesso.', 'success');
      loadCursos();
    } catch (err: any) {
      dialog.alert('Erro ao Excluir', err.message, 'danger');
    }
  };

  // Avaliação de Certificado
  const handleOpenEvaluationModal = (cert: CertificadoItem) => {
    setSelectedCert(cert);
    setEvalStatus(cert.status === 'Rejeitado' ? 'Rejeitado' : 'Aprovado');
    setEvalPontos(cert.pontos_atribuidos > 0 ? cert.pontos_atribuidos : 100);
    setEvalParecer(cert.parecer_tecnico || '');
    setIsCertModalOpen(true);
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert) return;

    setSubmittingEval(true);
    try {
      const res = await fetch('/api/tecnicos/certificados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCert.id,
          jovem_id: selectedCert.jovem_id,
          status: evalStatus,
          pontos: evalStatus === 'Aprovado' ? evalPontos : 0,
          parecer_tecnico: evalParecer.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao processar avaliação.');

      dialog.alert(
        'Avaliação Concluída',
        evalStatus === 'Aprovado'
          ? `Certificado aprovado com sucesso! ${evalPontos} pontos foram creditados ao jovem.`
          : 'O certificado foi rejeitado com o parecer informado.',
        'success'
      );

      setIsCertModalOpen(false);
      loadCertificados();
    } catch (err: any) {
      dialog.alert('Erro na Validação', err.message || 'Falha ao salvar parecer técnico.', 'danger');
    } finally {
      setSubmittingEval(false);
    }
  };

  // Filtragem Cursos
  const filteredCursos = useMemo(() => {
    return cursos.filter((c) => {
      const matchesSearch =
        c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.parceiro_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.descricao && c.descricao.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesModalidade = !filterModalidade || c.modalidade === filterModalidade;
      const matchesStatus = !filterStatus || c.status === filterStatus;

      return matchesSearch && matchesModalidade && matchesStatus;
    });
  }, [cursos, searchTerm, filterModalidade, filterStatus]);

  // Filtragem Certificados
  const filteredCertificados = useMemo(() => {
    return certificados.filter((c) => {
      const term = certSearch.toLowerCase();
      const matchesSearch =
        (c.jovem_nome || '').toLowerCase().includes(term) ||
        (c.titulo_curso || '').toLowerCase().includes(term) ||
        (c.instituicao || '').toLowerCase().includes(term);

      const matchesStatus = !certFilterStatus || c.status === certFilterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [certificados, certSearch, certFilterStatus]);

  // Estatísticas Cursos
  const statsCursos = useMemo(() => {
    const total = cursos.length;
    const ativas = cursos.filter((c) => c.status === 'Inscrições Abertas' && c.ativo).length;
    const presencial = cursos.filter((c) => c.modalidade === 'Presencial').length;
    const onlineOuHibrido = cursos.filter((c) => c.modalidade === 'EAD / Online' || c.modalidade === 'Híbrido').length;
    return { total, ativas, presencial, onlineOuHibrido };
  }, [cursos]);

  // Estatísticas Certificados
  const certsPendentesCount = certificados.filter(c => c.status === 'Pendente').length;
  const certsAprovadosCount = certificados.filter(c => c.status === 'Aprovado').length;
  const totalPontosAtribuidos = certificados
    .filter(c => c.status === 'Aprovado')
    .reduce((acc, c) => acc + (c.pontos_atribuidos || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <GraduationCap size={28} /> Gestão de Cursos, Trilhas & Certificados
          </h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Gerencie o catálogo de cursos parceiros e valide os certificados de cursos externos anexados pelos jovens para bonificação com pontos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              loadCursos();
              loadCertificados();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw size={16} className={(loading || loadingCerts) ? 'animate-spin' : ''} />
            Atualizar Dados
          </button>

          {mainTab === 'catalogo' && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--color-secondary)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Plus size={18} />
              Cadastrar Novo Curso
            </button>
          )}
        </div>
      </div>

      {/* Sub-abas de Navegação */}
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
          onClick={() => setMainTab('catalogo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.65rem',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: mainTab === 'catalogo' ? '#fff' : 'transparent',
            color: mainTab === 'catalogo' ? 'var(--color-primary)' : '#64748b',
            boxShadow: mainTab === 'catalogo' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <BookOpen size={18} />
          <span>Cursos & Trilhas Oferecidas</span>
          {cursos.length > 0 && (
            <span style={{
              background: mainTab === 'catalogo' ? 'var(--color-primary)' : '#cbd5e1',
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
          onClick={() => setMainTab('certificados')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.65rem',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: mainTab === 'certificados' ? '#fff' : 'transparent',
            color: mainTab === 'certificados' ? '#10b981' : '#64748b',
            boxShadow: mainTab === 'certificados' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Award size={18} />
          <span>Validar Certificados dos Alunos</span>
          {certsPendentesCount > 0 ? (
            <span style={{
              background: '#f59e0b',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '1rem',
              fontWeight: 700,
              animation: 'pulse 2s infinite'
            }}>
              {certsPendentesCount} pendente{certsPendentesCount > 1 ? 's' : ''}
            </span>
          ) : certificados.length > 0 ? (
            <span style={{
              background: '#10b981',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '1rem',
              fontWeight: 700
            }}>
              {certificados.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: CURSOS OFERTADOS PELAS EMPRESAS / CATÁLOGO             */}
      {/* ============================================================== */}
      {mainTab === 'catalogo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Alerta de Configuração de Banco caso tabela não exista */}
          {tableMissing && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#b45309', fontWeight: 600 }}>
                <AlertCircle size={20} />
                Tabela de cursos ainda não configurada no Supabase
              </div>
              <p style={{ fontSize: '0.88rem', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                Para habilitar o catálogo de cursos dinâmicos no banco de dados, copie o script SQL abaixo e execute no <strong>Supabase &rarr; SQL Editor</strong>.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={handleCopySql}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.4rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.82rem'
                  }}
                >
                  {copiedSql ? <Check size={16} /> : <Copy size={16} />}
                  {copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL'}
                </button>
              </div>
            </div>
          )}

          {/* Cards de Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total de Cursos</span>
                <BookOpen size={20} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.4rem' }}>
                {statsCursos.total}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cadastrados no catálogo</span>
            </div>

            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Inscrições Abertas</span>
                <CheckCircle size={20} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a', marginTop: '0.4rem' }}>
                {statsCursos.ativas}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prontos para inscrição</span>
            </div>

            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, textTransform: 'uppercase' }}>Presenciais</span>
                <Building2 size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0284c7', marginTop: '0.4rem' }}>
                {statsCursos.presencial}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Formações presenciais</span>
            </div>

            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 600, textTransform: 'uppercase' }}>EAD / Híbridos</span>
                <Sparkles size={20} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.4rem' }}>
                {statsCursos.onlineOuHibrido}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Modalidade à distância</span>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por curso, entidade formadora ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={filterModalidade}
              onChange={(e) => setFilterModalidade(e.target.value)}
              style={selectFilterStyle}
            >
              <option value="">Todas Modalidades</option>
              <option value="Presencial">Presencial</option>
              <option value="EAD / Online">EAD / Online</option>
              <option value="Híbrido">Híbrido</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={selectFilterStyle}
            >
              <option value="">Todos Status</option>
              <option value="Inscrições Abertas">Inscrições Abertas</option>
              <option value="Em Breve">Em Breve</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>

          {/* Lista de Cursos */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 0.5rem' }} />
              <p>Carregando capacitações...</p>
            </div>
          ) : filteredCursos.length === 0 ? (
            <div style={{
              background: '#fff',
              border: '1px dashed #cbd5e1',
              borderRadius: '0.75rem',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <GraduationCap size={48} color="#94a3b8" />
              <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Nenhum curso encontrado</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', maxWidth: '420px' }}>
                {cursos.length === 0
                  ? 'Nenhum curso foi cadastrado ainda. Clique em "Cadastrar Novo Curso" para disponibilizar turmas aos jovens.'
                  : 'Nenhum curso atende aos filtros pesquisados. Tente ajustar os termos de busca.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {filteredCursos.map((curso) => (
                <div
                  key={curso.id}
                  style={{
                    background: '#fff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    opacity: curso.ativo ? 1 : 0.65
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '1rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: curso.status === 'Inscrições Abertas' ? '#f0fdf4' : '#fef2f2',
                          color: curso.status === 'Inscrições Abertas' ? '#16a34a' : '#ef4444'
                        }}
                      >
                        {curso.status}
                      </span>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleToggleAtivo(curso)}
                          title={curso.ativo ? 'Ocultar dos jovens' : 'Publicar para os jovens'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: curso.ativo ? '#16a34a' : '#94a3b8',
                            padding: '0.2rem'
                          }}
                        >
                          {curso.ativo ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(curso)}
                          title="Editar Curso"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0284c7', padding: '0.2rem' }}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCurso(curso)}
                          title="Excluir Curso"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: 'var(--color-primary)', margin: '0 0 0.35rem', lineHeight: 1.3 }}>
                      {curso.titulo}
                    </h4>

                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.6rem' }}>
                      <Building2 size={15} />
                      <strong>{curso.parceiro_nome}</strong>
                      {curso.criado_por === 'empresa' && (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: 600 }}>
                          Empresa Parceira
                        </span>
                      )}
                    </div>

                    {curso.descricao && (
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.5, margin: 0 }}>
                        {curso.descricao}
                      </p>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b' }}>
                      Modalidade: <strong>{curso.modalidade}</strong> &bull; {curso.carga_horaria || 'Carga flexível'}
                    </span>

                    {curso.link_inscricao && (
                      <a
                        href={curso.link_inscricao}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                      >
                        Link <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: VALIDAR CERTIFICADOS DOS ALUNOS & PONTUAÇÃO            */}
      {/* ============================================================== */}
      {mainTab === 'certificados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Cards de Métricas dos Certificados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Enviados</span>
                <FileCheck size={20} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.4rem' }}>
                {certificados.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Certificados submetidos</span>
            </div>

            <div style={{ ...kpiCardStyle, borderColor: certsPendentesCount > 0 ? '#fde68a' : '#e2e8f0', background: certsPendentesCount > 0 ? '#fffbeb' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Aguardando Análise</span>
                <Clock size={20} color="#d97706" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#d97706', marginTop: '0.4rem' }}>
                {certsPendentesCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#b45309' }}>Precisam de validação</span>
            </div>

            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Validados / Aprovados</span>
                <CheckCircle2 size={20} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a', marginTop: '0.4rem' }}>
                {certsAprovadosCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cursos certificados</span>
            </div>

            <div style={kpiCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Pontos Concedidos</span>
                <Award size={20} color="#059669" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#059669', marginTop: '0.4rem' }}>
                +{totalPontosAtribuidos} pts
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Creditados aos alunos</span>
            </div>
          </div>

          {/* Filtros Certificados */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por jovem, curso concluído ou instituição..."
                value={certSearch}
                onChange={(e) => setCertSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={certFilterStatus}
              onChange={(e) => setCertFilterStatus(e.target.value)}
              style={selectFilterStyle}
            >
              <option value="">Todos Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Rejeitado">Rejeitados</option>
            </select>
          </div>

          {/* Lista de Certificados Enviados pelos Alunos */}
          {loadingCerts ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 0.5rem' }} />
              <p>Carregando certificados dos jovens...</p>
            </div>
          ) : filteredCertificados.length === 0 ? (
            <div style={{
              background: '#fff',
              border: '1px dashed #cbd5e1',
              borderRadius: '0.75rem',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Award size={48} color="#94a3b8" />
              <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Nenhum certificado para exibir</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', maxWidth: '420px' }}>
                {certificados.length === 0
                  ? 'Os alunos ainda não enviaram certificados externos. Assim que eles anexarem comprovantes de cursos, aparecerão aqui para avaliação.'
                  : 'Nenhum certificado encontrado para os filtros selecionados.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
              {filteredCertificados.map((cert) => {
                const isPendente = cert.status === 'Pendente';
                const isAprovado = cert.status === 'Aprovado';
                const isRejeitado = cert.status === 'Rejeitado';

                return (
                  <div
                    key={cert.id}
                    style={{
                      background: '#fff',
                      borderRadius: '0.85rem',
                      border: isPendente ? '1px solid #fde68a' : isAprovado ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      position: 'relative'
                    }}
                  >
                    <div>
                      {/* Top Bar: Jovem + Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aluno(a)</span>
                          <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.05rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                            {cert.jovem_nome || 'Jovem Aprendiz'}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {cert.jovem_cidade || 'Cidade não informada'} &bull; Saldo: <strong>{cert.jovem_pontos ?? 0} pts</strong>
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
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
                              <Clock size={14} /> Aguardando Avaliação
                            </span>
                          )}

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
                              <CheckCircle2 size={14} /> +{cert.pontos_atribuidos} pts concedidos
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
                              <XCircle size={14} /> Rejeitado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dados do Curso */}
                      <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #f1f5f9', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Curso Realizado</span>
                        <p style={{ margin: '0.2rem 0 0.35rem 0', fontWeight: 700, fontSize: '0.98rem', color: 'var(--color-primary)' }}>
                          {cert.titulo_curso}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.8rem', color: '#475569' }}>
                          <span><strong>Instituição:</strong> {cert.instituicao}</span>
                          {cert.carga_horaria && <span>&bull; <strong>Carga:</strong> {cert.carga_horaria}</span>}
                          {cert.data_conclusao && (
                            <span>&bull; <strong>Concluído:</strong> {new Date(cert.data_conclusao).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>

                      {/* Parecer prévio se houver */}
                      {cert.parecer_tecnico && (
                        <div style={{ fontSize: '0.82rem', color: '#475569', background: '#fff', border: '1px solid #e2e8f0', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                          <strong>Parecer Técnico:</strong> {cert.parecer_tecnico}
                          {cert.validado_por && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Avaliador: {cert.validado_por}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações: Ver arquivo + Botão de Avaliar */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                      <a
                        href={cert.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: 'var(--color-primary)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none'
                        }}
                      >
                        <FileText size={16} /> Ver Arquivo <ExternalLink size={13} />
                      </a>

                      <button
                        onClick={() => handleOpenEvaluationModal(cert)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.55rem 1rem',
                          borderRadius: '0.55rem',
                          border: 'none',
                          background: isPendente ? 'var(--color-primary)' : '#f1f5f9',
                          color: isPendente ? '#fff' : 'var(--color-text)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: isPendente ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        <Award size={15} />
                        {isPendente ? 'Avaliar & Dar Pontos' : 'Reavaliar Pontos'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CRIAÇÃO / EDIÇÃO DE CURSO OFERTADO                   */}
      {/* ============================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
            {modalMode === 'create' ? 'Cadastrar Novo Curso / Capacitação' : 'Editar Curso'}
          </h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSaveCurso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Título do Curso / Formação *</label>
            <input
              type="text"
              required
              placeholder="Ex: Auxiliar Administrativo, Manutenção de Computadores..."
              value={formCurso.titulo}
              onChange={(e) => setFormCurso({ ...formCurso, titulo: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Entidade Formadora / Parceiro *</label>
              <input
                type="text"
                required
                placeholder="Ex: SENAC, SENAI, Rede Cidadã..."
                value={formCurso.parceiro_nome}
                onChange={(e) => setFormCurso({ ...formCurso, parceiro_nome: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Carga Horária</label>
              <input
                type="text"
                placeholder="Ex: 40 horas, 160h..."
                value={formCurso.carga_horaria}
                onChange={(e) => setFormCurso({ ...formCurso, carga_horaria: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Modalidade</label>
              <select
                value={formCurso.modalidade}
                onChange={(e) => setFormCurso({ ...formCurso, modalidade: e.target.value })}
                style={inputStyle}
              >
                <option value="Presencial">Presencial</option>
                <option value="EAD / Online">EAD / Online</option>
                <option value="Híbrido">Híbrido</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status das Inscrições</label>
              <select
                value={formCurso.status}
                onChange={(e) => setFormCurso({ ...formCurso, status: e.target.value })}
                style={inputStyle}
              >
                <option value="Inscrições Abertas">Inscrições Abertas</option>
                <option value="Em Breve">Em Breve</option>
                <option value="Encerrado">Encerrado</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Link Externo de Inscrição / Edital (opcional)</label>
            <input
              type="url"
              placeholder="https://exemplo.com.br/inscricao"
              value={formCurso.link_inscricao}
              onChange={(e) => setFormCurso({ ...formCurso, link_inscricao: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Descrição e Requisitos do Curso</label>
            <textarea
              rows={3}
              placeholder="Descreva o conteúdo programático, público-alvo, turno e requisitos para participação..."
              value={formCurso.descricao}
              onChange={(e) => setFormCurso({ ...formCurso, descricao: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: '0.65rem 1.25rem',
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                color: 'var(--color-text)'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={formSubmitting}
              style={{
                padding: '0.65rem 1.5rem',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                opacity: formSubmitting ? 0.7 : 1
              }}
            >
              {formSubmitting ? 'Salvando...' : modalMode === 'create' ? 'Cadastrar Curso' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: AVALIAÇÃO DE CERTIFICADO DO ALUNO E PONTUAÇÃO         */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => !submittingEval && setIsCertModalOpen(false)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.45rem', borderRadius: '0.5rem' }}>
              <Award size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                Avaliação de Certificado & Pontuação
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Atribua pontos ao aluno pelo esforço na conclusão deste curso
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submittingEval}
            onClick={() => setIsCertModalOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {selectedCert && (
          <form onSubmit={handleSaveEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Box Resumo do Curso e do Jovem */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Aluno(a)</span>
                  <strong style={{ display: 'block', fontSize: '0.98rem', color: 'var(--color-primary)' }}>
                    {selectedCert.jovem_nome}
                  </strong>
                </div>
                <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  Saldo: {selectedCert.jovem_pontos ?? 0} pts
                </span>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Curso Concluído</span>
                <p style={{ margin: '0.1rem 0', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                  {selectedCert.titulo_curso} &bull; <span style={{ color: '#64748b' }}>{selectedCert.instituicao}</span>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
                  {selectedCert.carga_horaria && <span>Carga: {selectedCert.carga_horaria}</span>}
                  {selectedCert.data_conclusao && <span>Conclusão: {new Date(selectedCert.data_conclusao).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>

              <div style={{ marginTop: '0.4rem' }}>
                <a
                  href={selectedCert.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#eff6ff',
                    color: '#2563eb',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <FileText size={15} /> Abrir Comprovante / Certificado <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* Decisão: Aprovar ou Rejeitar */}
            <div>
              <label style={labelStyle}>Decisão da Avaliação *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEvalStatus('Aprovado')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    border: evalStatus === 'Aprovado' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: evalStatus === 'Aprovado' ? '#ecfdf5' : '#fff',
                    color: evalStatus === 'Aprovado' ? '#065f46' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <CheckCircle2 size={18} color={evalStatus === 'Aprovado' ? '#059669' : '#94a3b8'} />
                  Aprovar & Pontuar
                </button>

                <button
                  type="button"
                  onClick={() => setEvalStatus('Rejeitado')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    border: evalStatus === 'Rejeitado' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    background: evalStatus === 'Rejeitado' ? '#fef2f2' : '#fff',
                    color: evalStatus === 'Rejeitado' ? '#991b1b' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <XCircle size={18} color={evalStatus === 'Rejeitado' ? '#dc2626' : '#94a3b8'} />
                  Rejeitar / Solicitar Ajuste
                </button>
              </div>
            </div>

            {/* Seleção de Pontos quando Aprovado */}
            {evalStatus === 'Aprovado' && (
              <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
                <label style={{ ...labelStyle, color: '#166534' }}>
                  Quantidade de Pontos a Atribuir ao Aluno *
                </label>

                {/* Botões Rápidos de Pontuação */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {[50, 100, 150, 200].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setEvalPontos(pts)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: evalPontos === pts ? '2px solid #059669' : '1px solid #a7f3d0',
                        background: evalPontos === pts ? '#059669' : '#fff',
                        color: evalPontos === pts ? '#fff' : '#065f46',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      +{pts} pts
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={evalPontos}
                    onChange={(e) => setEvalPontos(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    style={{ ...inputStyle, width: '130px', fontWeight: 700, fontSize: '1.05rem', color: '#065f46' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                    pontos serão adicionados imediatamente ao saldo do jovem para troca por prêmios.
                  </span>
                </div>
              </div>
            )}

            {/* Parecer Técnico */}
            <div>
              <label style={labelStyle}>
                Parecer / Mensagem de Incentivo ao Aluno
              </label>
              <textarea
                rows={3}
                placeholder={evalStatus === 'Aprovado'
                  ? 'Ex: Parabéns pela dedicação e conclusão do curso! Continue investindo na sua capacitação profissional.'
                  : 'Ex: O arquivo enviado está ilegível ou faltam dados de autenticidade. Por favor, anexe uma versão nítida do certificado.'}
                value={evalParecer}
                onChange={(e) => setEvalParecer(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Botões do Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={submittingEval}
                onClick={() => setIsCertModalOpen(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: '#64748b'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submittingEval}
                style={{
                  padding: '0.65rem 1.5rem',
                  background: evalStatus === 'Aprovado' ? '#059669' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: submittingEval ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                {submittingEval ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Gravando...
                  </>
                ) : evalStatus === 'Aprovado' ? (
                  <>
                    <ShieldCheck size={16} /> Confirmar & Conceder {evalPontos} Pontos
                  </>
                ) : (
                  <>
                    <XCircle size={16} /> Rejeitar Certificado
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

const kpiCardStyle: React.CSSProperties = {
  background: '#fff',
  padding: '1.25rem',
  borderRadius: '0.75rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem'
};

const selectFilterStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  background: '#fff',
  color: 'var(--color-text)',
  outline: 'none'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: '0.35rem'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box'
};
