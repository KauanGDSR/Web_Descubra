'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import CardEditBtn from '@/components/ui/CardEditBtn';
import { useDialog } from '@/components/ui/CustomDialog';
import { createClient } from '@/utils/supabase/client';
import { isFormDirty } from '@/lib/data';

interface DbCompany {
  id: string;
  razao_social: string;
  cnpj: string;
  cidade_id: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  cep: string | null;
  responsavel_nome: string | null;
  telefone: string | null;
  email: string | null;
  cidades?: {
    nome: string;
  } | null;
  selo?: 'Ouro' | 'Prata' | 'Bronze' | 'Nenhum';
  pontos_engajamento?: number;
}

interface City {
  id: string;
  nome: string;
}

const formatCnpj = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
};

const formatCep = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 8);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
};

const formatPhone = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
};

const EMPTY = { razao: '', fantasia: '', cep: '', email: '', phone: '', owner: '', cityId: '', endereco: '', password: '', selo: 'Nenhum' };

export default function CompanyTab() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [cnpj, setCnpj] = useState('');
  const [searching, setSearching] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);

  // Carrega as empresas e cidades do Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, citiesRes] = await Promise.all([
        supabase.from('empresas_parceiras').select('*, cidades(nome)').order('razao_social'),
        supabase.from('cidades').select('id, nome').order('nome')
      ]);

      if (compRes.error) throw compRes.error;
      if (citiesRes.error) throw citiesRes.error;

      if (isMounted.current) {
        setCompanies(compRes.data || []);
        setCities(citiesRes.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      if (isMounted.current) {
        dialog.alert('Erro de Conexão', 'Não foi possível ler as empresas parceiras do Supabase.', 'danger');
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

  const openNew = () => { setCnpj(''); setForm(EMPTY); setDetailsVisible(false); setEditIdx(-1); setModalOpen(true); };
  const openEdit = (idx: number) => {
    const c = companies[idx];
    setCnpj(formatCnpj(c.cnpj || ''));
    setForm({
      razao: c.razao_social,
      fantasia: c.nome_fantasia || '',
      cep: formatCep(c.cep || ''),
      email: c.email || '',
      phone: formatPhone(c.telefone || ''),
      owner: c.responsavel_nome || '',
      cityId: c.cidade_id || '',
      endereco: c.endereco || '',
      password: '',
      selo: c.selo || 'Nenhum'
    });
    setDetailsVisible(true);
    setEditIdx(idx);
    setModalOpen(true);
  };

  const isDirty = () => cnpj.trim().length > 0 || detailsVisible || isFormDirty(form as any);
  const requestClose = async () => {
    if (!isDirty()) { closeModal(); return; }
    const ok = await dialog.confirm('Confirmar Fechamento', 'Deseja fechar? Os dados da empresa serão perdidos.', 'warning');
    if (ok) closeModal();
  };

  const closeModal = () => { setModalOpen(false); setEditIdx(-1); setCnpj(''); setForm(EMPTY); setDetailsVisible(false); };

  const handleCnpjSearch = async () => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) { await dialog.alert('CNPJ Inválido', 'Por favor, insira um CNPJ com 14 dígitos.', 'warning'); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/cnpj/${clean}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();

      // Tenta cruzar a cidade do CNPJ com as cidades polo do Descubra
      let matchedCityId = '';
      if (data.municipio) {
        const found = cities.find(c => c.nome.toLowerCase() === data.municipio.toLowerCase());
        if (found) matchedCityId = found.id;
      }

      setForm((f) => ({
        ...f,
        razao: data.razao_social || '',
        fantasia: data.nome_fantasia || data.razao_social || '',
        cep: data.cep ? formatCep(data.cep) : '',
        phone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : '',
        email: data.email || '',
        cityId: matchedCityId,
        endereco: data.logradouro ? `${data.logradouro}, ${data.numero || ''} - ${data.bairro || ''}` : ''
      }));
    } catch {
      await dialog.alert('Aviso de Consulta', 'CNPJ não encontrado na base pública. Carregando formulário para preenchimento manual.', 'warning');
      setForm((f) => ({ ...f, razao: '', fantasia: '', cep: '', phone: '', email: '', cityId: '', endereco: '' }));
    }
    setDetailsVisible(true);
    setSearching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editIdx >= 0) {
        const dbEntry = {
          razao_social: form.razao,
          nome_fantasia: form.fantasia || form.razao,
          cnpj: cnpj || null,
          cep: form.cep || null,
          endereco: form.endereco || null,
          email: form.email || null,
          telefone: form.phone || null,
          responsavel_nome: form.owner || null,
          cidade_id: form.cityId || null,
          selo: form.selo || 'Nenhum'
        };
        const compToEdit = companies[editIdx];
        const { error } = await supabase
          .from('empresas_parceiras')
          .update(dbEntry)
          .eq('id', compToEdit.id);

        if (error) throw error;
        await dialog.alert('Dados Atualizados', `Empresa <b>${form.razao}</b> atualizada com sucesso.`, 'success');
      } else {
        const response = await fetch('/api/criar-empresa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razao_social: form.razao,
            nome_fantasia: form.fantasia || form.razao,
            cnpj: cnpj || null,
            cep: form.cep || null,
            endereco: form.endereco || null,
            email: form.email || null,
            telefone: form.phone || null,
            responsavel_nome: form.owner || null,
            cidade_id: form.cityId || null,
            senha: form.password,
            selo: form.selo || 'Nenhum'
          })
        });

        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Erro na requisição');

        await dialog.alert('Parceria Cadastrada', `Empresa <b>${form.razao}</b> cadastrada no sistema com sucesso.`, 'success');
      }

      closeModal();
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro ao tentar gravar no Supabase.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let val = e.target.value;
      if (k === 'cep') {
        val = formatCep(val);
      } else if (k === 'phone') {
        val = formatPhone(val);
      } else if (k === 'owner') {
        val = val.replace(/[0-9]/g, '');
      }
      setForm((f) => ({ ...f, [k]: val }));
    };

  return (
    <div>
      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Empresas Parceiras</h2>
          <p className="admin-form-subtitle">Gerencie e consulte as empresas conveniadas ao programa</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNew}
          style={{ borderRadius: 'var(--border-radius-sm)', padding: '0.65rem 1.25rem', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-secondary)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Cadastrar Empresa
        </button>
      </div>

      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px' }}>
          <div className="map-spinner"></div>
          <p>Carregando empresas parceiras do Supabase...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhuma empresa parceira cadastrada no banco de dados.</p>
        </div>
      ) : (
        /* Grid de cards */
        <div className="company-cards-grid">
          {companies.map((c, idx) => (
            <div key={c.id} className="company-card">
              <CardEditBtn onClick={() => openEdit(idx)} title="Editar empresa" />
              <div className="company-card-header">
                <div className="company-card-avatar">{c.razao_social.charAt(0)}</div>
                <div className="company-card-title-group">
                  <span className="company-card-name">{c.razao_social}</span>
                  <span className="company-card-cnpj-city">CNPJ: {c.cnpj || '—'} • {c.cidades?.nome || 'Pólo Não Associado'}</span>
                </div>
              </div>
              <div className="company-card-badges">
                <span className="company-card-badge status-active">Ativa</span>
                {c.selo && c.selo !== 'Nenhum' && (
                  <span className="company-card-badge" style={{
                    backgroundColor: c.selo === 'Ouro' ? 'rgba(245,158,11,0.15)' : c.selo === 'Prata' ? 'rgba(148,163,184,0.15)' : 'rgba(217,119,6,0.15)',
                    color: c.selo === 'Ouro' ? '#b45309' : c.selo === 'Prata' ? '#475569' : '#78350f',
                    fontWeight: 700
                  }}>
                    {c.selo === 'Ouro' ? '🥇 Ouro' : c.selo === 'Prata' ? '🥈 Prata' : '🥉 Bronze'}
                  </span>
                )}
                <span className="company-card-tag">{c.nome_fantasia || c.razao_social}</span>
              </div>
              <div className="company-card-details">
                <div className="company-card-detail-item"><span className="company-card-detail-label">CEP</span><span className="company-card-detail-value">{c.cep || '—'}</span></div>
                <div className="company-card-detail-item"><span className="company-card-detail-label">Endereço</span><span className="company-card-detail-value" style={{ fontSize: '0.78rem' }}>{c.endereco || '—'}</span></div>
                <div className="company-card-detail-item"><span className="company-card-detail-label">Responsável</span><span className="company-card-detail-value">{c.responsavel_nome || '—'}</span></div>
                <div className="company-card-detail-item"><span className="company-card-detail-label">E-mail</span><span className="company-card-detail-value">{c.email || '—'}</span></div>
                <div className="company-card-detail-item"><span className="company-card-detail-label">Telefone</span><span className="company-card-detail-value">{c.telefone || '—'}</span></div>
                <div className="company-card-detail-item">
                  <span className="company-card-detail-label">Selo</span>
                  <select
                    value={c.selo || 'Nenhum'}
                    onChange={async (e) => {
                      const newSelo = e.target.value as any;
                      const { error } = await supabase
                        .from('empresas_parceiras')
                        .update({ selo: newSelo })
                        .eq('id', c.id);
                      if (error) {
                        dialog.alert('Erro ao atualizar selo', error.message, 'danger');
                      } else {
                        loadData();
                      }
                    }}
                    className="form-control"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', height: 'auto', marginTop: '0.1rem', cursor: 'pointer' }}
                  >
                    <option value="Nenhum">Nenhum</option>
                    <option value="Bronze">🥉 Bronze</option>
                    <option value="Prata">🥈 Prata</option>
                    <option value="Ouro">🥇 Ouro</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={requestClose}>
        <button className="modal-close-btn" onClick={requestClose} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="admin-form-header">
          <h2 className="admin-form-title">{editIdx >= 0 ? 'Editar Empresa Parceira' : 'Nova Empresa Parceira'}</h2>
          <p className="admin-form-subtitle">Consulte o CNPJ na base da Receita Federal antes de preencher os dados</p>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          {/* Busca CNPJ */}
          <div className="form-group" style={{ maxWidth: 500, marginBottom: '1rem' }}>
            <label className="form-label">CNPJ da Empresa</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                className="form-control"
                value={cnpj || ''}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCnpjSearch())}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                required
                disabled={editIdx >= 0}
              />
              {editIdx === -1 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCnpjSearch}
                  disabled={searching}
                  style={{ borderRadius: 'var(--border-radius-sm)', whiteSpace: 'nowrap', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }}
                >
                  {searching ? 'Buscando...' : 'Buscar Dados'}
                </button>
              )}
            </div>
          </div>

          {/* Campos da empresa (aparecem após busca ou na edição) */}
          {detailsVisible && (
            <div style={{ borderTop: '1px dashed rgba(10,37,64,0.1)', paddingTop: '2rem' }}>
              <h3 className="admin-form-title" style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Dados da Parceria</h3>
              <div className="admin-grid-form">
                <div className="form-group">
                  <label className="form-label">Razão Social</label>
                  <input className="form-control" value={form.razao || ''} onChange={set('razao')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome Fantasia</label>
                  <input className="form-control" value={form.fantasia || ''} onChange={set('fantasia')} />
                </div>
                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <input className="form-control" value={form.cep || ''} onChange={set('cep')} placeholder="00000-000" maxLength={9} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade Pólo</label>
                  <select className="form-control" value={form.cityId || ''} onChange={set('cityId')} required>
                    <option value="" disabled>Selecione a cidade pólo</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Endereço Comercial</label>
                  <input className="form-control" value={form.endereco || ''} onChange={set('endereco')} placeholder="Rua, número, bairro..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsável pela Parceria</label>
                  <input className="form-control" value={form.owner || ''} onChange={set('owner')} placeholder="Nome do contato" required />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail Comercial</label>
                  <input className="form-control" type="email" value={form.email || ''} onChange={set('email')} placeholder="email@empresa.com.br" required />
                </div>
                {editIdx === -1 && (
                  <div className="form-group">
                    <label className="form-label">Senha de Acesso</label>
                    <input className="form-control" type="password" value={form.password || ''} onChange={set('password')} placeholder="Mínimo de 6 caracteres" required />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Telefone Comercial</label>
                  <input className="form-control" value={form.phone || ''} onChange={set('phone')} placeholder="(00) 00000-0000" maxLength={15} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Atribuir Selo de Engajamento</label>
                  <select className="form-control" value={form.selo || 'Nenhum'} onChange={set('selo' as any)} required>
                    <option value="Nenhum">Empresa Parceira (Nenhum)</option>
                    <option value="Bronze">🥉 Selo Bronze</option>
                    <option value="Prata">🥈 Selo Prata</option>
                    <option value="Ouro">🥇 Selo Ouro</option>
                  </select>
                </div>
              </div>
              <div className="form-actions-wrapper" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={requestClose} disabled={submitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }} disabled={submitting}>
                  {submitting ? 'Salvando...' : editIdx >= 0 ? 'Salvar Alterações' : 'Salvar Empresa'}
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
