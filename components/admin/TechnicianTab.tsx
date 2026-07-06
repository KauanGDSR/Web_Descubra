'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import CardEditBtn from '@/components/ui/CardEditBtn';
import { useDialog } from '@/components/ui/CustomDialog';
import { createClient } from '@/utils/supabase/client';
import { ROLES, isFormDirty } from '@/lib/data';

interface DbTechnician {
  id: string;
  nome: string;
  telefone_whatsapp: string;
  cargo: string;
  equipamento_id: string | null;
  telegram_id: string | null;
  equipamentos?: {
    nome: string;
    cidade_id: string | null;
    cidades?: {
      nome: string;
    };
  } | null;
}

interface Equipment {
  id: string;
  nome: string;
  cidade_id: string | null;
}

interface City {
  id: string;
  nome: string;
}

const EMPTY = { name: '', email: '', password: '', phone: '', role: '', cityId: '', unitId: '', telegramId: '' };

export default function TechnicianTab() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [technicians, setTechnicians] = useState<DbTechnician[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);

  // Carrega dados iniciais do banco
  const loadData = async () => {
    setLoading(true);
    try {
      const [techsRes, equipsRes, citiesRes] = await Promise.all([
        supabase.from('tecnicos').select('*, equipamentos(*, cidades(*))').order('nome'),
        supabase.from('equipamentos').select('id, nome, cidade_id').order('nome'),
        supabase.from('cidades').select('id, nome').order('nome')
      ]);

      if (techsRes.error) throw techsRes.error;
      if (equipsRes.error) throw equipsRes.error;
      if (citiesRes.error) throw citiesRes.error;

      if (isMounted.current) {
        setTechnicians((techsRes.data as unknown as DbTechnician[]) || []);
        setEquipments(equipsRes.data || []);
        setCities(citiesRes.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      if (isMounted.current) {
        dialog.alert('Erro de Carregamento', 'Não foi possível ler os dados do banco de dados.', 'danger');
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

  const openNew = () => { setForm(EMPTY); setEditIdx(-1); setModalOpen(true); };
  const openEdit = (idx: number) => {
    const t = technicians[idx];
    setForm({
      name: t.nome,
      email: '', // E-mail e senha não são editáveis diretamente por motivos de segurança do Auth
      password: '',
      phone: t.telefone_whatsapp,
      role: t.cargo === 'admin' ? 'Coordenador' : 'Técnico de Referência',
      cityId: t.equipamentos?.cidade_id || '',
      unitId: t.equipamento_id || '',
      telegramId: t.telegram_id || ''
    });
    setEditIdx(idx);
    setModalOpen(true);
  };

  const requestClose = async () => {
    if (!isFormDirty(form as any)) { closeModal(); return; }
    const ok = await dialog.confirm('Confirmar Fechamento', 'Deseja fechar? Os dados preenchidos serão perdidos.', 'warning');
    if (ok) closeModal();
  };

  const closeModal = () => { setModalOpen(false); setEditIdx(-1); setForm(EMPTY); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isNew = editIdx === -1;
      const cargoMapped = form.role === 'Coordenador' ? 'admin' : 'tecnico';

      if (isNew) {
        // Novo registro envolve criação de conta no Supabase Auth via API dedicada
        const response = await fetch('/api/criar-tecnico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: form.name,
            email: form.email,
            senha: form.password,
            telefone_whatsapp: form.phone,
            equipamento_id: form.unitId || null,
            cargo: cargoMapped,
            telegram_id: form.telegramId || null
          })
        });

        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Erro na requisição');

        await dialog.alert('Cadastro Realizado', `Técnico <b>${form.name}</b> foi criado no sistema com sucesso.`, 'success');
      } else {
        // Edição atualiza apenas a tabela tecnicos localmente
        const techToEdit = technicians[editIdx];
        const { error } = await supabase
          .from('tecnicos')
          .update({
            nome: form.name,
            telefone_whatsapp: form.phone,
            equipamento_id: form.unitId || null,
            cargo: cargoMapped,
            telegram_id: form.telegramId || null
          })
          .eq('id', techToEdit.id);

        if (error) throw error;

        await dialog.alert('Cadastro Atualizado', `Dados de <b>${form.name}</b> atualizados no sistema com sucesso.`, 'success');
      }

      closeModal();
      loadData(); // Recarrega do banco
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro interno ao tentar salvar os dados.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (editIdx < 0) return;
    const t = technicians[editIdx];
    const ok = await dialog.confirm(
      'Confirmar Exclusão', 
      `Tem certeza que deseja excluir o técnico <b>${t.nome}</b>? Esta ação removerá o registro do banco de dados.`, 
      'danger'
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tecnicos')
        .delete()
        .eq('id', t.id);

      if (error) throw error;

      await dialog.alert('Sucesso', 'Técnico excluído com sucesso.', 'success');
      closeModal();
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Excluir', err.message || 'Erro ao tentar excluir o técnico.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtra equipamentos com base na cidade selecionada
  const filteredEquipments = form.cityId
    ? equipments.filter((e) => e.cidade_id === form.cityId)
    : equipments;

  const formatPhone = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let val = e.target.value;
      if (k === 'name') {
        val = val.replace(/[0-9]/g, '');
      } else if (k === 'phone') {
        val = formatPhone(val);
      } else if (k === 'telegramId') {
        val = val.replace(/\D/g, '');
      }
      setForm((f) => ({ ...f, [k]: val }));
    };

  return (
    <div>
      {/* Header da seção */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Técnicos Cadastrados</h2>
          <p className="admin-form-subtitle">Gerencie os técnicos de referência no banco de dados</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNew}
          style={{ borderRadius: 'var(--border-radius-sm)', padding: '0.65rem 1.25rem', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-secondary)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Cadastrar Técnico
        </button>
      </div>

      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px' }}>
          <div className="map-spinner"></div>
          <p>Buscando lista de técnicos do Supabase...</p>
        </div>
      ) : technicians.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhum técnico cadastrado no banco de dados.</p>
        </div>
      ) : (
        /* Grid de cards */
        <div className="tech-cards-grid">
          {technicians.map((t, idx) => (
            <div key={t.id} className="tech-card">
              <CardEditBtn onClick={() => openEdit(idx)} title="Editar técnico" />
              <div className="tech-card-header">
                <div className="tech-card-avatar">{t.nome.charAt(0)}</div>
                <div className="tech-card-title-group">
                  <span className="tech-card-name">{t.nome}</span>
                  <span className="tech-card-role-city">
                    {t.cargo === 'admin' ? 'Coordenador' : 'Técnico de Referência'} • {t.equipamentos?.cidades?.nome || 'Pólo Não Informado'}
                  </span>
                </div>
              </div>
              <div className="tech-card-badges">
                <span className="tech-card-badge status-active">Ativo</span>
                <span className="tech-card-tag">{t.equipamentos?.nome || 'Sem pólo associado'}</span>
              </div>
              <div className="tech-card-details">
                <div className="tech-card-detail-item"><span className="tech-card-detail-label">Telefone</span><span className="tech-card-detail-value">{t.telefone_whatsapp}</span></div>
                <div className="tech-card-detail-item"><span className="tech-card-detail-label">Telegram ID</span><span className="tech-card-detail-value">{t.telegram_id || '—'}</span></div>
                <div className="tech-card-detail-item"><span className="tech-card-detail-label">ID de Registro</span><span className="tech-card-detail-value" style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{t.id}</span></div>
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
          <h2 className="admin-form-title">{editIdx >= 0 ? 'Editar Técnico' : 'Novo Técnico'}</h2>
          <p className="admin-form-subtitle">Preencha os dados do técnico de referência para gravação no Supabase</p>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid-form">
            <div className="form-group full-width">
              <label className="form-label">Nome completo</label>
              <input className="form-control" value={form.name} onChange={set('name')} placeholder="Nome completo do técnico" required />
            </div>

            {/* Credenciais de Auth (Apenas na criação) */}
            {editIdx === -1 && (
              <>
                <div className="form-group">
                  <label className="form-label">E-mail de Login</label>
                  <input className="form-control" type="email" value={form.email} onChange={set('email')} placeholder="email@mg.gov.br" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha de Acesso</label>
                  <input className="form-control" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 caracteres" required />
                </div>
              </>
            )}

             <div className="form-group">
              <label className="form-label">Telefone (WhatsApp)</label>
              <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="(00) 00000-0000" required />
            </div>

            <div className="form-group">
              <label className="form-label">Telegram ID (Opcional)</label>
              <input className="form-control" value={form.telegramId} onChange={set('telegramId')} placeholder="Ex: 123456789" />
            </div>

            <div className="form-group">
              <label className="form-label">Cargo / Função</label>
              <select className="form-control" value={form.role} onChange={set('role')} required>
                <option value="" disabled>Selecione o cargo</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cidade de Atuação</label>
              <select className="form-control" value={form.cityId} onChange={set('cityId')} required>
                <option value="" disabled>Selecione a cidade</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unidade de Referência (Pólo)</label>
              <select className="form-control" value={form.unitId} onChange={set('unitId')} required disabled={!form.cityId}>
                <option value="" disabled>Selecione a unidade</option>
                {filteredEquipments.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions-wrapper" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
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
                  Excluir Técnico
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }} disabled={submitting}>
              {submitting ? 'Salvando...' : editIdx >= 0 ? 'Salvar Alterações' : 'Cadastrar Técnico'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
