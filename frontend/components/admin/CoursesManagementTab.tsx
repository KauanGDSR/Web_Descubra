'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Clock,
  CheckCircle,
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
  Check
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

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalidade, setFilterModalidade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formCurso, setFormCurso] = useState(EMPTY_CURSO_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async () => {
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
      dialog.alert('Erro de Conexão', 'Não foi possível carregar a lista de cursos.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      loadData();
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
      loadData();
    } catch (err: any) {
      dialog.alert('Erro ao Excluir', err.message, 'danger');
    }
  };

  // Filtragem
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

  // Estatísticas
  const stats = useMemo(() => {
    const total = cursos.length;
    const ativas = cursos.filter((c) => c.status === 'Inscrições Abertas' && c.ativo).length;
    const presencial = cursos.filter((c) => c.modalidade === 'Presencial').length;
    const onlineOuHibrido = cursos.filter((c) => c.modalidade === 'EAD / Online' || c.modalidade === 'Híbrido').length;
    return { total, ativas, presencial, onlineOuHibrido };
  }, [cursos]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <GraduationCap size={28} /> Gestão de Cursos & Capacitações
          </h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Cadastre e gerencie turmas abertas por entidades formadoras (SENAC, SENAI, Rede Cidadã) e empresas parceiras para os jovens do Descubra.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadData}
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
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

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
        </div>
      </div>

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
            {stats.total}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cadastrados no catálogo</span>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase' }}>Inscrições Abertas</span>
            <CheckCircle size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a', marginTop: '0.4rem' }}>
            {stats.ativas}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Visíveis aos alunos</span>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, textTransform: 'uppercase' }}>Formato Presencial</span>
            <Building2 size={20} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0284c7', marginTop: '0.4rem' }}>
            {stats.presencial}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Turmas em polos/unidades</span>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: 600, textTransform: 'uppercase' }}>EAD / Híbrido</span>
            <Layers size={20} color="#9333ea" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#9333ea', marginTop: '0.4rem' }}>
            {stats.onlineOuHibrido}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Com formação online</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por curso, entidade formadora ou parceiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.4rem',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={filterModalidade}
            onChange={(e) => setFilterModalidade(e.target.value)}
            style={selectFilterStyle}
          >
            <option value="">Todas as Modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="EAD / Online">EAD / Online</option>
            <option value="Híbrido">Híbrido</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={selectFilterStyle}
          >
            <option value="">Todos os Status</option>
            <option value="Inscrições Abertas">Inscrições Abertas</option>
            <option value="Em Breve">Em Breve</option>
            <option value="Encerrado">Encerrado</option>
          </select>
        </div>
      </div>

      {/* Lista de Cursos */}
      {loading ? (
        <div style={{ background: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ margin: 0 }}>Carregando catálogo de cursos...</p>
        </div>
      ) : filteredCursos.length === 0 ? (
        <div style={{ background: '#fff', padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
          <BookOpen size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', margin: '0 0 0.4rem' }}>
            Nenhum curso encontrado
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
            {cursos.length === 0
              ? 'Nenhum curso ou capacitação cadastrado ainda. Clique em "Cadastrar Novo Curso" para ofertar uma turma.'
              : 'Nenhum curso corresponde aos filtros de busca aplicados.'}
          </p>
          {cursos.length === 0 && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              + Cadastrar Primeiro Curso
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span
                    style={{
                      background: curso.status === 'Inscrições Abertas' ? '#f0fdf4' : curso.status === 'Em Breve' ? '#eff6ff' : '#f1f5f9',
                      color: curso.status === 'Inscrições Abertas' ? '#16a34a' : curso.status === 'Em Breve' ? '#0284c7' : '#64748b',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {curso.status}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={() => handleToggleAtivo(curso)}
                      title={curso.ativo ? 'Curso Ativo (clique para ocultar)' : 'Curso Oculto (clique para ativar)'}
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

      {/* Modal de Criação / Edição */}
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
                placeholder="Ex: SENAC Minas, SENAI, Rede Cidadã..."
                value={formCurso.parceiro_nome}
                onChange={(e) => setFormCurso({ ...formCurso, parceiro_nome: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Carga Horária</label>
              <input
                type="text"
                placeholder="Ex: 40 horas, 160h, 360h..."
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
              placeholder="https://exemplo.com/inscricao-curso"
              value={formCurso.link_inscricao || ''}
              onChange={(e) => setFormCurso({ ...formCurso, link_inscricao: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Descrição / Conteúdo Programático</label>
            <textarea
              rows={3}
              placeholder="Detalhes sobre os tópicos abordados, pré-requisitos e benefícios da capacitação..."
              value={formCurso.descricao}
              onChange={(e) => setFormCurso({ ...formCurso, descricao: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="ativoCheckbox"
              checked={formCurso.ativo}
              onChange={(e) => setFormCurso({ ...formCurso, ativo: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="ativoCheckbox" style={{ fontSize: '0.88rem', color: 'var(--color-text)', cursor: 'pointer' }}>
              Ativo e visível para os alunos na aba Cursos & Capacitações
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: '0.65rem 1.25rem',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem'
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
  outline: 'none'
};
