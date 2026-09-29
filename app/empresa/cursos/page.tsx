'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Building2,
  ExternalLink,
  BookOpen,
  RefreshCw,
  Search,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import Modal from '@/frontend/components/ui/Modal';
import { useDialog } from '@/frontend/components/ui/CustomDialog';

interface CursoEmpresa {
  id: string;
  titulo: string;
  parceiro_nome: string;
  descricao: string;
  carga_horaria: string;
  modalidade: string;
  status: string;
  link_inscricao?: string | null;
  ativo: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  id: '',
  titulo: '',
  descricao: '',
  carga_horaria: '20 horas',
  modalidade: 'Presencial',
  status: 'Inscrições Abertas',
  link_inscricao: '',
  ativo: true
};

export default function EmpresaCursosPage() {
  const dialog = useDialog();

  const [cursos, setCursos] = useState<CursoEmpresa[]>([]);
  const [companyName, setCompanyName] = useState('Empresa Parceira');
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalidade, setFilterModalidade] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchCursos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/empresa/cursos');
      const data = await res.json();

      if (data.tableMissing) {
        setTableMissing(true);
        setCursos([]);
      } else if (res.ok && data.cursos) {
        setTableMissing(false);
        setCursos(data.cursos);
        if (data.companyName) setCompanyName(data.companyName);
      }
    } catch (err: any) {
      console.error('Erro ao carregar capacitações da empresa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (curso: CursoEmpresa) => {
    setForm({
      id: curso.id,
      titulo: curso.titulo,
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      dialog.alert('Campo Obrigatório', 'Informe o título do curso/capacitação.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = modalMode === 'edit';
      const res = await fetch('/api/empresa/cursos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar capacitação.');

      await dialog.alert('Sucesso', data.mensagem || 'Capacitação salva com sucesso!', 'success');
      setIsModalOpen(false);
      fetchCursos();
    } catch (err: any) {
      dialog.alert('Erro ao Salvar', err.message || 'Erro de conexão.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (curso: CursoEmpresa) => {
    const confirmed = await dialog.confirm(
      'Remover Capacitação',
      `Deseja realmente remover o curso "${curso.titulo}"?`,
      'danger'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/empresa/cursos?id=${curso.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');

      await dialog.alert('Removido', 'Capacitação removida com sucesso.', 'success');
      fetchCursos();
    } catch (err: any) {
      dialog.alert('Erro', err.message, 'danger');
    }
  };

  const filteredCursos = useMemo(() => {
    return cursos.filter((c) => {
      const matchesSearch =
        c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.descricao && c.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesModalidade = !filterModalidade || c.modalidade === filterModalidade;
      return matchesSearch && matchesModalidade;
    });
  }, [cursos, searchTerm, filterModalidade]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <GraduationCap size={28} /> Cursos & Capacitações da Empresa
          </h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Ofertados por <strong>{companyName}</strong> aos jovens participantes do Programa Descubra.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchCursos}
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
            onClick={handleOpenCreate}
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
            Ofertar Nova Capacitação
          </button>
        </div>
      </div>

      {tableMissing && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '0.75rem', padding: '1rem', color: '#b45309', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>A tabela de cursos ainda precisa ser criada no banco de dados pelo administrador do sistema.</span>
        </div>
      )}

      {/* Busca */}
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar entre os cursos da sua empresa..."
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

        <select
          value={filterModalidade}
          onChange={(e) => setFilterModalidade(e.target.value)}
          style={{
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            border: '1px solid #cbd5e1',
            fontSize: '0.88rem',
            background: '#fff',
            color: 'var(--color-text)',
            outline: 'none'
          }}
        >
          <option value="">Todas as Modalidades</option>
          <option value="Presencial">Presencial</option>
          <option value="EAD / Online">EAD / Online</option>
          <option value="Híbrido">Híbrido</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ background: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ margin: 0 }}>Carregando suas capacitações...</p>
        </div>
      ) : filteredCursos.length === 0 ? (
        <div style={{ background: '#fff', padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
          <BookOpen size={44} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', margin: '0 0 0.4rem' }}>
            Nenhuma capacitação ofertada ainda
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            Sua empresa pode ofertar oficinas, treinamentos internos ou trilhas preparatórias para capacitar os jovens do Descubra.
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: '0.65rem 1.35rem',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            + Ofertar Primeiro Curso
          </button>
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span
                    style={{
                      background: curso.status === 'Inscrições Abertas' ? '#f0fdf4' : '#eff6ff',
                      color: curso.status === 'Inscrições Abertas' ? '#16a34a' : '#0284c7',
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
                      onClick={() => handleOpenEdit(curso)}
                      title="Editar"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0284c7', padding: '0.2rem' }}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(curso)}
                      title="Excluir"
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
                  <span>{companyName}</span>
                </div>

                {curso.descricao && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.5, margin: 0 }}>
                    {curso.descricao}
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>
                  Modalidade: <strong>{curso.modalidade}</strong> &bull; {curso.carga_horaria || 'Carga livre'}
                </span>

                {curso.link_inscricao && (
                  <a
                    href={curso.link_inscricao}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                  >
                    Inscrição <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
            {modalMode === 'create' ? 'Ofertar Nova Capacitação / Curso' : 'Editar Capacitação'}
          </h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Título do Curso / Oficina *</label>
            <input
              type="text"
              required
              placeholder="Ex: Oficina de Excel para Negócios, Atendimento ao Cliente..."
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Carga Horária</label>
              <input
                type="text"
                placeholder="Ex: 20 horas, 40h..."
                value={form.carga_horaria}
                onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Modalidade</label>
              <select
                value={form.modalidade}
                onChange={(e) => setForm({ ...form, modalidade: e.target.value })}
                style={inputStyle}
              >
                <option value="Presencial">Presencial</option>
                <option value="EAD / Online">EAD / Online</option>
                <option value="Híbrido">Híbrido</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status da Turma</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              style={inputStyle}
            >
              <option value="Inscrições Abertas">Inscrições Abertas</option>
              <option value="Em Breve">Em Breve</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Link Externo de Inscrição ou Formulário (opcional)</label>
            <input
              type="url"
              placeholder="https://exemplo.com/inscricao"
              value={form.link_inscricao || ''}
              onChange={(e) => setForm({ ...form, link_inscricao: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Descrição / Conteúdo da Oficina</label>
            <textarea
              rows={3}
              placeholder="Descreva o que será ensinado, requisitos mínimos ou local de realização..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
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
              disabled={submitting}
              style={{
                padding: '0.65rem 1.5rem',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Salvando...' : modalMode === 'create' ? 'Publicar Capacitação' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

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
