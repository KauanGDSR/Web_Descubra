'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gift,
  Award,
  Sparkles,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Info
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useDialog } from '@/frontend/components/ui/CustomDialog';
import Modal from '@/frontend/components/ui/Modal';

interface Premio {
  id: string;
  titulo: string;
  parceiro_nome: string;
  custo_pontos: number;
  descricao: string;
  ativo: boolean;
}

interface Resgate {
  id: string;
  status: 'Pendente' | 'Entregue' | 'Cancelado';
  created_at: string;
  premio_id: string;
  premios_parceiros: {
    titulo: string;
    custo_pontos: number;
    parceiro_nome: string;
  } | null;
}

export default function JovemPremiosPage() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'meus-resgates'>('catalogo');

  const [jovemId, setJovemId] = useState<string | null>(null);
  const [pontosAtual, setPontosAtual] = useState<number>(0);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [meusResgates, setMeusResgates] = useState<Resgate[]>([]);

  // Modal de Confirmação de Resgate
  const [premioSelecionado, setPremioSelecionado] = useState<Premio | null>(null);
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let jId = session?.user?.id;

      if (!jId) {
        // Fallback conta demo
        const { data: demo } = await supabase
          .from('jovens')
          .select('id, pontuacao_atual')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (demo) {
          jId = demo.id;
          setPontosAtual(demo.pontuacao_atual ?? 0);
        }
      } else {
        const { data: perfil } = await supabase
          .from('jovens')
          .select('id, pontuacao_atual')
          .eq('id', jId)
          .single();
        if (perfil) {
          setPontosAtual(perfil.pontuacao_atual ?? 0);
        }
      }

      setJovemId(jId || null);

      // Busca prêmios ativos
      const { data: premiosData } = await supabase
        .from('premios_parceiros')
        .select('*')
        .eq('ativo', true)
        .order('custo_pontos', { ascending: true });

      setPremios(premiosData || []);

      // Busca resgates do próprio jovem se houver jovemId
      if (jId) {
        const { data: resgatesData } = await supabase
          .from('resgates_premios')
          .select(`
            id,
            status,
            created_at,
            premio_id,
            premios_parceiros (
              titulo,
              custo_pontos,
              parceiro_nome
            )
          `)
          .eq('jovem_id', jId)
          .order('created_at', { ascending: false });

        setMeusResgates((resgatesData as any) || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da loja de prêmios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenResgate = (premio: Premio) => {
    if (pontosAtual < premio.custo_pontos) {
      dialog.alert(
        'Pontos Insuficientes',
        `Você possui <b>${pontosAtual} pontos</b>. Este prêmio requer <b>${premio.custo_pontos} pontos</b>.<br/><br/>Participe das oficinas, cumpra as tarefas e registre depoimentos para conquistar mais pontos!`,
        'warning'
      );
      return;
    }
    setPremioSelecionado(premio);
    setModalConfirmOpen(true);
  };

  const handleConfirmarResgate = async () => {
    if (!premioSelecionado) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/jovem/resgatar-premio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premioId: premioSelecionado.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar resgate.');

      setModalConfirmOpen(false);
      setPontosAtual(data.novoSaldo);

      await dialog.alert(
        'Solicitação Enviada! 🎉',
        `Seu pedido de resgate para <b>"${premioSelecionado.titulo}"</b> foi enviado para o painel do seu técnico!<br/><br/>Assim que a entrega for validada, você poderá retirar o item.`,
        'success'
      );

      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro no Resgate', err.message || 'Falha ao solicitar resgate do prêmio.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header com Saldo de Pontos */}
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              <Sparkles size={16} />
              Clube de Recompensas DescubraHub
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: 'var(--color-primary)', margin: 0 }}>
              Loja de Prêmios
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
              Troque seus pontos acumulados em atividades, oficinas e acompanhamentos por prêmios reais!
            </p>
          </div>

          {/* Saldo de Pontos Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0d5c3a 0%, #16a34a 100%)',
            borderRadius: '12px',
            padding: '1.1rem 1.75rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 14px rgba(13, 92, 58, 0.25)'
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Gift size={24} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9, fontWeight: 700 }}>
                Seu Saldo Atual
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>
                {pontosAtual} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>pts</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dica de Gamificação */}
      <div style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem'
      }}>
        <Info size={22} style={{ color: '#d97706', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#92400e', lineHeight: 1.5 }}>
          <strong>Como ganhar mais pontos?</strong> Mantenha boa frequência nas oficinas socioassistenciais, envie relatos e depoimentos no painel do aluno e conclua as etapas de pré-aprendizagem.
        </p>
      </div>

      {/* Navegação de Abas */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('catalogo')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'catalogo' ? '2.5px solid var(--color-secondary)' : '2.5px solid transparent',
            padding: '0.6rem 1rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeSubTab === 'catalogo' ? 'var(--color-secondary)' : 'var(--color-text-light)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <ShoppingBag size={18} />
          Prêmios Disponíveis ({premios.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('meus-resgates')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'meus-resgates' ? '2.5px solid var(--color-secondary)' : '2.5px solid transparent',
            padding: '0.6rem 1rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeSubTab === 'meus-resgates' ? 'var(--color-secondary)' : 'var(--color-text-light)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Clock size={18} />
          Meus Resgates ({meusResgates.length})
        </button>
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--color-primary)" />
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando prêmios disponíveis...</p>
        </div>
      ) : activeSubTab === 'catalogo' ? (
        /* ======================================================== */
        /* ABA DE PRÊMIOS DISPONÍVEIS                               */
        /* ======================================================== */
        premios.length === 0 ? (
          <div style={{ background: '#fff', padding: '3.5rem 1.5rem', borderRadius: '1rem', border: '1px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <Gift size={42} style={{ color: 'var(--color-text-light)', opacity: 0.4 }} />
            <h4 style={{ color: 'var(--color-primary)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
              Novos prêmios em preparação!
            </h4>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.88rem', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
              A equipe do Programa Descubra e as empresas parceiras estão cadastrando novas recompensas. Continue pontuando para resgatar em breve!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {premios.map((p) => {
              const temPontos = pontosAtual >= p.custo_pontos;
              const faltam = p.custo_pontos - pontosAtual;

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -3 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(13, 92, 58, 0.08)',
                        color: 'var(--color-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Award size={22} />
                      </div>

                      <span style={{
                        backgroundColor: temPontos ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: temPontos ? '#16a34a' : '#d97706',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px'
                      }}>
                        {p.custo_pontos} pts
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.35rem 0' }}>
                      {p.titulo}
                    </h3>

                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.85rem' }}>
                      <Building2 size={13} /> {p.parceiro_nome}
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--color-text)', lineHeight: 1.5, margin: 0 }}>
                      {p.descricao || 'Retirada orientada pela equipe técnica.'}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      disabled={!temPontos}
                      onClick={() => handleOpenResgate(p)}
                      style={{
                        width: '100%',
                        padding: '0.7rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: temPontos ? 'pointer' : 'not-allowed',
                        backgroundColor: temPontos ? 'var(--color-secondary)' : '#e2e8f0',
                        color: temPontos ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Gift size={16} />
                      {temPontos ? 'Resgatar Prêmio' : `Faltam ${faltam} pontos`}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        /* ======================================================== */
        /* ABA DE MEUS RESGATES                                     */
        /* ======================================================== */
        meusResgates.length === 0 ? (
          <div style={{ background: '#fff', padding: '3.5rem 1.5rem', borderRadius: '1rem', border: '1px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={42} style={{ color: 'var(--color-text-light)', opacity: 0.4 }} />
            <h4 style={{ color: 'var(--color-primary)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
              Você ainda não realizou nenhum resgate
            </h4>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.88rem', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
              Assim que você escolher um prêmio no catálogo e solicitar o resgate, poderá acompanhar a aprovação e entrega por aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {meusResgates.map((r) => {
              const formattedDate = new Date(r.created_at).toLocaleDateString('pt-BR');
              const isPendente = r.status === 'Pendente';
              const isEntregue = r.status === 'Entregue';

              return (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: isEntregue ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: isEntregue ? '#16a34a' : '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isEntregue ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                        {r.premios_parceiros?.titulo || 'Prêmio Solicitado'}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>Parceiro: <b>{r.premios_parceiros?.parceiro_nome || '—'}</b></span>
                        <span>•</span>
                        <span>Data do Pedido: <b>{formattedDate}</b></span>
                        <span>•</span>
                        <span>Pontos Utilizados: <b>{r.premios_parceiros?.custo_pontos || 0} pts</b></span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: isEntregue ? '#dcfce7' : '#fef3c7',
                      color: isEntregue ? '#16a34a' : '#b45309'
                    }}>
                      {isEntregue ? (
                        <>
                          <CheckCircle2 size={15} />
                          Prêmio Entregue
                        </>
                      ) : isPendente ? (
                        <>
                          <Clock size={15} />
                          Aguardando Validação da Equipe
                        </>
                      ) : (
                        'Cancelado'
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal de Confirmação de Resgate */}
      <Modal isOpen={modalConfirmOpen} onClose={() => setModalConfirmOpen(false)}>
        <button className="modal-close-btn" onClick={() => setModalConfirmOpen(false)} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="admin-form-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-secondary)', marginBottom: '0.35rem' }}>
            <Gift size={18} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirmar Resgate
            </span>
          </div>
          <h2 className="admin-form-title">
            Deseja resgatar este prêmio?
          </h2>
        </div>

        {premioSelecionado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.3rem' }}>
                {premioSelecionado.titulo}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', marginBottom: '0.75rem' }}>
                Ofertado por: <strong>{premioSelecionado.parceiro_nome}</strong>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
                {premioSelecionado.descricao}
              </p>
            </div>

            {/* Simulação do Saldo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', padding: '0.75rem', background: 'rgba(10,37,64,0.02)', borderRadius: '8px', border: '1px solid rgba(10,37,64,0.06)' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', display: 'block' }}>Saldo Atual</span>
                <strong style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>{pontosAtual} pts</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-error)', display: 'block' }}>Custo</span>
                <strong style={{ fontSize: '1rem', color: 'var(--color-error)' }}>-{premioSelecionado.custo_pontos} pts</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-secondary)', display: 'block' }}>Saldo Restante</span>
                <strong style={{ fontSize: '1rem', color: 'var(--color-secondary)' }}>{pontosAtual - premioSelecionado.custo_pontos} pts</strong>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: 0, textAlign: 'center' }}>
              Ao confirmar, seu pedido será enviado para aprovação da equipe técnica do Descubra.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModalConfirmOpen(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmarResgate}
                className="btn btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.65rem 1.5rem',
                  backgroundColor: 'var(--color-secondary)',
                  border: 'none',
                  color: '#ffffff'
                }}
              >
                {submitting ? 'Confirmando...' : 'Confirmar Resgate'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
