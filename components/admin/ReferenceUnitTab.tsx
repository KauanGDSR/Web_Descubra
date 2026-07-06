'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import CardEditBtn from '@/components/ui/CardEditBtn';
import { useDialog } from '@/components/ui/CustomDialog';
import { createClient } from '@/utils/supabase/client';
import { isFormDirty } from '@/lib/data';

interface City {
  id: string;
  nome: string;
}

interface ExtendedUnit {
  id: string;
  nome: string;
  tipo?: string;
  cidade_id: string | null;
  cidades?: {
    id: string;
    nome: string;
  } | null;

  // Extended fields stored in localStorage
  endereco?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
  bairros_atendidos?: string[];
  publico_atendido?: string[];
}

const EMPTY_FORM = {
  nome: '',
  cidade_id: '',
  endereco: '',
  numero: '',
  bairro: '',
  cep: '',
  telefone: '',
  email: '',
  responsavel_nome: '',
  responsavel_cargo: '',
  bairroInput: '', // temporary input for adding to bairros_atendidos array
  bairros_atendidos: [] as string[],
  publico_atendido: [] as string[]
};

const PUBLICOS_DISPONIVEIS = [
  'Crianças',
  'Adolescentes',
  'Jovens',
  'Famílias',
  'Pessoas com deficiência',
  'Comunidade em geral'
];

export default function ReferenceUnitTab() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [units, setUnits] = useState<ExtendedUnit[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [showFieldsOverride, setShowFieldsOverride] = useState(false);
  const isMounted = useRef(true);

  const showAddressFields = editIdx >= 0 || !!form.endereco || !!form.bairro || !!form.cidade_id || showFieldsOverride;

  const handleCepSearch = async () => {
    const clean = form.cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      await dialog.alert('CEP Inválido', 'Por favor, insira um CEP com 8 dígitos.', 'warning');
      return;
    }
    setSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error('CEP não encontrado');
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado');

      let matchedCityId = form.cidade_id;
      if (data.localidade) {
        const found = cities.find(c => c.nome.toLowerCase() === data.localidade.toLowerCase());
        if (found) matchedCityId = found.id;
      }

      setForm((f) => ({
        ...f,
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade_id: matchedCityId
      }));
      setShowFieldsOverride(true);
    } catch (err: any) {
      await dialog.alert('Aviso de Consulta', 'Não foi possível encontrar o CEP informado. Preencha os campos manualmente.', 'warning');
      setShowFieldsOverride(true);
    } finally {
      setSearchingCep(false);
    }
  };

  // Load data from Supabase + localStorage
  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsRes, citiesRes] = await Promise.all([
        supabase.from('equipamentos').select('*, cidades(id, nome)').order('nome'),
        supabase.from('cidades').select('id, nome').order('nome')
      ]);

      if (unitsRes.error) throw unitsRes.error;
      if (citiesRes.error) throw citiesRes.error;

      const dbUnits = unitsRes.data || [];
      const extendedUnits: ExtendedUnit[] = dbUnits.map((unit: any) => {
        // Read local storage for extra fields
        const localKey = `descubra_equipamentos_ext_${unit.id}`;
        let extData = {};
        try {
          const stored = localStorage.getItem(localKey);
          if (stored) {
            extData = JSON.parse(stored);
          }
        } catch (e) {
          console.error(`Error parsing localStorage for unit ${unit.id}:`, e);
        }
        return {
          ...unit,
          ...extData
        };
      });

      if (isMounted.current) {
        setUnits(extendedUnits);
        setCities(citiesRes.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      if (isMounted.current) {
        dialog.alert('Erro de Conexão', 'Não foi possível carregar as unidades de referência.', 'danger');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setShowFieldsOverride(false);
    setEditIdx(-1);
    setModalOpen(true);
  };

  const openEdit = (idx: number) => {
    const u = units[idx];
    setForm({
      nome: u.nome,
      cidade_id: u.cidade_id || '',
      endereco: u.endereco || '',
      numero: u.numero || '',
      bairro: u.bairro || '',
      cep: u.cep || '',
      telefone: u.telefone || '',
      email: u.email || '',
      responsavel_nome: u.responsavel_nome || '',
      responsavel_cargo: u.responsavel_cargo || '',
      bairroInput: '',
      bairros_atendidos: u.bairros_atendidos || [],
      publico_atendido: u.publico_atendido || []
    });
    setShowFieldsOverride(true);
    setEditIdx(idx);
    setModalOpen(true);
  };

  const requestClose = async () => {
    // Check if form is dirty
    const cleanForm = { ...form };
    delete (cleanForm as any).bairroInput;
    if (!isFormDirty(cleanForm as any)) {
      closeModal();
      return;
    }
    const ok = await dialog.confirm('Confirmar Fechamento', 'Deseja fechar? Os dados preenchidos serão perdidos.', 'warning');
    if (ok) closeModal();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIdx(-1);
    setForm(EMPTY_FORM);
  };

  const formatPhone = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCEP = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Handler for text/select changes
  const set = (k: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let val = e.target.value;
    if (k === 'responsavel_nome' || k === 'responsavel_cargo') {
      val = val.replace(/[0-9]/g, '');
    } else if (k === 'cep') {
      val = formatCEP(val);
    } else if (k === 'telefone') {
      val = formatPhone(val);
    }
    setForm((f) => ({ ...f, [k]: val }));
  };

  // Handler for checkboxes (Público Atendido)
  const handlePublicoChange = (item: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setForm((f) => {
      const current = f.publico_atendido || [];
      const updated = checked
        ? [...current, item]
        : current.filter((x) => x !== item);
      return { ...f, publico_atendido: updated };
    });
  };

  // Add neighborhood to list
  const addBairro = () => {
    const val = form.bairroInput.trim();
    if (!val) return;
    if (form.bairros_atendidos.includes(val)) {
      setForm((f) => ({ ...f, bairroInput: '' }));
      return;
    }
    setForm((f) => ({
      ...f,
      bairros_atendidos: [...f.bairros_atendidos, val],
      bairroInput: ''
    }));
  };

  // Remove neighborhood from list
  const removeBairro = (val: string) => {
    setForm((f) => ({
      ...f,
      bairros_atendidos: f.bairros_atendidos.filter((x) => x !== val)
    }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (form.cep) {
      const cleanCep = form.cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        await dialog.alert('Erro de Validação', 'O CEP informado deve conter 8 dígitos.', 'warning');
        return;
      }
    }
    if (form.telefone) {
      const cleanPhone = form.telefone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        await dialog.alert('Erro de Validação', 'O telefone informado deve conter DDD + número (mínimo de 10 dígitos).', 'warning');
        return;
      }
    }

    setSubmitting(true);

    try {
      let inferredTipo = 'Organização Parceira';
      if (form.nome.toUpperCase().includes('CRAS')) {
        inferredTipo = 'CRAS';
      } else if (form.nome.toUpperCase().includes('CREAS')) {
        inferredTipo = 'CREAS';
      }

      const dbEntry = {
        nome: form.nome,
        tipo: inferredTipo,
        cidade_id: form.cidade_id || null
      };

      const extEntry = {
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        cep: form.cep,
        telefone: form.telefone,
        email: form.email,
        responsavel_nome: form.responsavel_nome,
        responsavel_cargo: form.responsavel_cargo,
        bairros_atendidos: form.bairros_atendidos,
        publico_atendido: form.publico_atendido
      };

      if (editIdx >= 0) {
        // Edit mode
        const unitToEdit = units[editIdx];
        
        const response = await fetch('/api/unidades', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: unitToEdit.id,
            ...dbEntry
          })
        });

        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Erro ao atualizar a unidade.');

        // Save local storage overrides
        localStorage.setItem(
          `descubra_equipamentos_ext_${unitToEdit.id}`,
          JSON.stringify(extEntry)
        );

        await dialog.alert('Sucesso', `Unidade <b>${form.nome}</b> atualizada com sucesso no banco de dados e localmente.`, 'success');
      } else {
        // Insert mode
        const response = await fetch('/api/unidades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbEntry)
        });

        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Erro ao criar a unidade.');

        const newId = json.id;

        // Save local storage overrides
        localStorage.setItem(
          `descubra_equipamentos_ext_${newId}`,
          JSON.stringify(extEntry)
        );

        await dialog.alert('Sucesso', `Unidade <b>${form.nome}</b> cadastrada com sucesso.`, 'success');
      }

      closeModal();
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar gravar dados no Supabase.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (editIdx < 0) return;
    const u = units[editIdx];
    const ok = await dialog.confirm(
      'Confirmar Exclusão', 
      `Tem certeza que deseja excluir a unidade de referência <b>${u.nome}</b>? Esta ação é permanente e removerá todas as configurações associadas.`, 
      'danger'
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/unidades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Erro ao excluir a unidade.');

      // Remove localStorage extra fields
      localStorage.removeItem(`descubra_equipamentos_ext_${u.id}`);

      await dialog.alert('Sucesso', 'Unidade excluída com sucesso.', 'success');
      closeModal();
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Excluir', err.message || 'Erro ao tentar excluir a unidade.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header da seção */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Unidades de Referência</h2>
          <p className="admin-form-subtitle">Gerencie os pólos de atendimento (CRAS, CREAS e Organizações Parceiras)</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNew}
          style={{ borderRadius: 'var(--border-radius-sm)', padding: '0.65rem 1.25rem', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-secondary)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Cadastrar Unidade
        </button>
      </div>

      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px' }}>
          <div className="map-spinner"></div>
          <p>Buscando unidades de referência do Supabase...</p>
        </div>
      ) : units.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhuma unidade de referência cadastrada no banco de dados.</p>
        </div>
      ) : (
        /* Grid de cards */
        <div className="company-cards-grid">
          {units.map((u, idx) => (
            <div key={u.id} className="company-card" style={{ borderTopColor: 'var(--color-secondary)' }}>
              <CardEditBtn onClick={() => openEdit(idx)} title="Editar unidade de referência" />
              <div className="company-card-header">
                <div className="company-card-avatar" style={{ backgroundColor: 'var(--color-secondary)' }}>
                  🏢
                </div>
                <div className="company-card-title-group">
                  <span className="company-card-name">{u.nome}</span>
                  <span className="company-card-cnpj-city">
                    Município: {u.cidades?.nome || 'Não Informado'}
                  </span>
                </div>
              </div>
              <div className="company-card-badges">
                <span className="company-card-badge status-active">Ativo</span>
                {u.responsavel_nome && (
                  <span className="company-card-tag" style={{ fontWeight: 600 }}>
                    Resp: {u.responsavel_nome} ({u.responsavel_cargo || 'Responsável'})
                  </span>
                )}
              </div>
              <div className="company-card-details" style={{ fontSize: '0.8rem' }}>
                <div className="company-card-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="company-card-detail-label">Endereço</span>
                  <span className="company-card-detail-value" style={{ fontSize: '0.78rem' }}>
                    {u.endereco ? `${u.endereco}${u.numero ? `, ${u.numero}` : ''}${u.bairro ? `, ${u.bairro}` : ''}${u.cep ? ` - CEP ${u.cep}` : ''}` : '—'}
                  </span>
                </div>
                <div className="company-card-detail-item">
                  <span className="company-card-detail-label">Telefone</span>
                  <span className="company-card-detail-value">{u.telefone || '—'}</span>
                </div>
                <div className="company-card-detail-item">
                  <span className="company-card-detail-label">E-mail</span>
                  <span className="company-card-detail-value" style={{ wordBreak: 'break-word', fontSize: '0.75rem' }}>{u.email || '—'}</span>
                </div>
                {u.bairros_atendidos && u.bairros_atendidos.length > 0 && (
                  <div className="company-card-detail-item" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="company-card-detail-label">Bairros Atendidos</span>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                      {u.bairros_atendidos.map((b) => (
                        <span key={b} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(10,37,64,0.05)', color: 'var(--color-primary)', border: '1px solid rgba(10,37,64,0.08)' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {u.publico_atendido && u.publico_atendido.length > 0 && (
                  <div className="company-card-detail-item" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="company-card-detail-label">Público Atendido</span>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                      {u.publico_atendido.map((p) => (
                        <span key={p} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(13,92,58,0.05)', color: 'var(--color-secondary)', border: '1px solid rgba(13,92,58,0.1)' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      <Modal isOpen={modalOpen} onClose={requestClose}>
        <button className="modal-close-btn" onClick={requestClose} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="admin-form-header">
          <h2 className="admin-form-title">{editIdx >= 0 ? 'Editar Unidade de Referência' : 'Nova Unidade de Referência'}</h2>
          <p className="admin-form-subtitle">Cadastre ou edite as informações de infraestrutura de acolhimento e abrangência</p>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          {/* Sessão 1: Identificação */}
          <h3 className="summary-section-title">Identificação da Unidade</h3>
          <div className="admin-grid-form">
            <div className="form-group full-width">
              <label className="form-label">Nome da Unidade</label>
              <input
                className="form-control"
                value={form.nome}
                onChange={set('nome')}
                placeholder="Ex: CRAS Centro, CREAS Norte, Lar Solidário"
                required
              />
            </div>
          </div>

          {/* Sessão 2: Localização */}
          <h3 className="summary-section-title">Localização</h3>

          {/* Busca CEP */}
          <div className="form-group" style={{ maxWidth: 500, marginBottom: '1.5rem', borderBottom: showAddressFields ? '1px dashed rgba(10,37,64,0.1)' : 'none', paddingBottom: showAddressFields ? '1.5rem' : '0' }}>
            <label className="form-label">CEP da Unidade</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                className="form-control"
                value={form.cep}
                onChange={set('cep')}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCepSearch())}
                placeholder="00000-000"
                required
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCepSearch}
                disabled={searchingCep}
                style={{ borderRadius: 'var(--border-radius-sm)', whiteSpace: 'nowrap', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }}
              >
                {searchingCep ? 'Buscando...' : 'Buscar CEP'}
              </button>
            </div>
          </div>

          {showAddressFields && (
            <div className="admin-grid-form" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input className="form-control" value={form.endereco} onChange={set('endereco')} placeholder="Rua, Avenida..." />
              </div>
              <div className="form-group">
                <label className="form-label">Número</label>
                <input className="form-control" value={form.numero} onChange={set('numero')} placeholder="Ex: 123" />
              </div>
              <div className="form-group">
                <label className="form-label">Bairro</label>
                <input className="form-control" value={form.bairro} onChange={set('bairro')} placeholder="Nome do bairro" />
              </div>
              <div className="form-group">
                <label className="form-label">Município</label>
                <select className="form-control" value={form.cidade_id} onChange={set('cidade_id')} required>
                  <option value="" disabled>Selecione o município</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Sessão 3: Contato */}
          <h3 className="summary-section-title">Contato</h3>
          <div className="admin-grid-form">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-control" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail institucional</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} placeholder="cras.centro@municipio.mg.gov.br" />
            </div>
            <div className="form-group">
              <label className="form-label">Responsável pela unidade</label>
              <input className="form-control" value={form.responsavel_nome} onChange={set('responsavel_nome')} placeholder="Nome do responsável" />
            </div>
            <div className="form-group">
              <label className="form-label">Cargo do responsável</label>
              <input className="form-control" value={form.responsavel_cargo} onChange={set('responsavel_cargo')} placeholder="Cargo / Função" />
            </div>
          </div>

          {/* Sessão 4: Área de Abrangência */}
          <h3 className="summary-section-title">Área de Abrangência</h3>

          {/* Bairros atendidos com Tags Input dinâmico */}
          <div className="form-group full-width" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Bairros Atendidos</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                className="form-control"
                value={form.bairroInput}
                onChange={set('bairroInput')}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBairro())}
                placeholder="Digite o nome de um bairro e pressione Enter"
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={addBairro}
                style={{ borderRadius: 'var(--border-radius-sm)', padding: '0 1rem' }}
              >
                Adicionar
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: '34px', padding: '0.5rem', border: '1px solid rgba(10,37,64,0.1)', borderRadius: '4px', backgroundColor: '#fcfcfd' }}>
              {form.bairros_atendidos.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>Nenhum bairro adicionado ainda.</span>
              ) : (
                form.bairros_atendidos.map((b) => (
                  <span
                    key={b}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(10,37,64,0.06)', color: 'var(--color-primary)', border: '1px solid rgba(10,37,64,0.1)' }}
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => removeBairro(b)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', color: 'var(--color-error)' }}
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Público atendido */}
          <div className="form-group full-width">
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Público Atendido</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {PUBLICOS_DISPONIVEIS.map((p) => {
                const isChecked = form.publico_atendido.includes(p);
                return (
                  <label key={p} className="checkbox-card" style={{ cursor: 'pointer', padding: '0.75rem', display: 'flex', border: '1px solid rgba(10,37,64,0.1)', borderRadius: '6px', backgroundColor: isChecked ? 'rgba(13,92,58,0.04)' : '#fff', borderColor: isChecked ? 'var(--color-secondary)' : 'rgba(10,37,64,0.1)' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={handlePublicoChange(p)}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', fontSize: '0.8rem', fontWeight: 600, color: isChecked ? 'var(--color-secondary)' : 'var(--color-text-light)' }}>
                      <span style={{ fontSize: '1.1rem' }}>
                        {p === 'Crianças' ? '👶' : p === 'Adolescentes' ? '👦' : p === 'Jovens' ? '🧑' : p === 'Famílias' ? '👨‍👩‍👧‍👦' : p === 'Pessoas com deficiência' ? '♿' : '👥'}
                      </span>
                      {p}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions-wrapper" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={requestClose} disabled={submitting}>Cancelar</button>
              {editIdx >= 0 && (
                <button 
                  type="button" 
                  className="btn" 
                  style={{ borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--color-error)', color: '#fff', border: 'none' }} 
                  onClick={handleDelete} 
                  disabled={submitting}
                >
                  Excluir Unidade
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }} disabled={submitting}>
              {submitting ? 'Salvando...' : editIdx >= 0 ? 'Salvar Alterações' : 'Salvar Unidade'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
