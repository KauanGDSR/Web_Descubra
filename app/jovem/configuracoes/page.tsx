'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCircle, 
  Settings, 
  HelpCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  Calendar, 
  GraduationCap, 
  KeyRound, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Users, 
  DollarSign, 
  Wifi, 
  Monitor, 
  Briefcase, 
  ShieldCheck, 
  Tag, 
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface JovemProfile {
  id: string;
  nome_completo: string;
  nome_social: string | null;
  possui_nome_social: boolean;
  data_nascimento: string | null;
  idade: number | null;
  cpf: string | null;
  sexo: string | null;
  cor_pele: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  bairro: string | null;
  nome_responsavel: string | null;
  grau_parentesco: string | null;
  telefone_responsavel: string | null;
  escolaridade: string | null;
  turno_escolar: string | null;
  entidade_formadora: string | null;
  codigo_acesso: string | null;
  pontuacao_atual: number;
  tipo_inscricao: string | null;
  passou_pre_aprendizagem: boolean;
  fez_pre_aprendizagem: boolean;
  recebe_bolsa_familia: boolean | null;
  possui_cadunico: boolean | null;
  possui_acesso_internet: boolean | null;
  possui_computador: boolean | null;
  trabalhou_anteriormente: boolean | null;
  pessoas_residencia: number | null;
  pessoas_trabalham: number | null;
  renda_familiar: number | null;
  esteve_medida_socioeducativa: boolean | null;
  possui_deficiencia: boolean | null;
  deficiencia_qual: string | null;
  areas_interesse: string[] | null;
  equipamentos?: any;
}

const FAQS = [
  {
    q: 'Como funciona a candidatura às vagas do Mural de Vagas?',
    a: 'As vagas disponíveis são cadastradas diretamente pelas empresas parceiras do Programa Descubra. Como aluno vinculado ao programa, seu técnico de referência avalia sua pontuação de vulnerabilidade e encaminha seu perfil oficial para a empresa.'
  },
  {
    q: 'Quais os direitos e remuneração do Jovem Aprendiz?',
    a: 'Pela Lei da Aprendizagem (Lei nº 10.097/2000), o jovem contratado tem direito a carteira de trabalho assinada (CTPS), bolsa auxílio proporcional à jornada, FGTS de 2%, vale-transporte, 13º salário e férias coincidentes com o recesso escolar.'
  },
  {
    q: 'O que acontece se eu faltar ao curso ou ao trabalho?',
    a: 'A assiduidade é acompanhada semanalmente pelo técnico de referência. Em caso de ausência por motivo de saúde ou força maior, apresente o atestado médico ou declaração comprobatória em até 48 horas para que a falta seja justificada sem prejuízos.'
  },
  {
    q: 'O que é a pontuação do Programa Descubra e como ganho mais?',
    a: 'É um índice calculado com base em critérios de vulnerabilidade social previstos nas diretrizes do Descubra. Você acumula pontos mantendo boa assiduidade nas oficinas socioassistenciais, enviando relatos de trajetória na aba Meu Progresso e concluindo as etapas de pré-aprendizagem. Os pontos podem ser trocados por prêmios na Loja de Prêmios!'
  },
  {
    q: 'Como falar com meu técnico de referência?',
    a: 'Você pode comparecer presencialmente na sua Unidade de Referência (CREAS / CRAS cadastrado) ou solicitar contato pelo telefone ou WhatsApp da coordenação do Programa Descubra informados logo abaixo nesta aba.'
  }
];

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams.get('tab') === 'suporte' || searchParams.get('tab') === 'ajuda'
    ? 'suporte'
    : 'perfil';

  const [activeTab, setActiveTab] = useState<'perfil' | 'suporte'>(initialTab);
  const [profile, setProfile] = useState<JovemProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPin, setCopiedPin] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let loadedProfile: JovemProfile | null = null;

        if (session?.user?.id) {
          const { data } = await supabase
            .from('jovens')
            .select('*, equipamentos(nome, tipo, endereco, telefone)')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) loadedProfile = data as unknown as JovemProfile;
        }

        if (!loadedProfile) {
          const { data } = await supabase
            .from('jovens')
            .select('*, equipamentos(nome, tipo, endereco, telefone)')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) loadedProfile = data as unknown as JovemProfile;
        }

        setProfile(loadedProfile);
      } catch (err) {
        console.error('Erro ao buscar dados do jovem:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleTabChange = (tab: 'perfil' | 'suporte') => {
    setActiveTab(tab);
    router.replace(`/jovem/configuracoes?tab=${tab}`, { scroll: false });
  };

  const handleCopyPin = (pin: string) => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando configurações da sua conta...</p>
      </div>
    );
  }

  const displayName = profile?.nome_social || profile?.nome_completo || 'Jovem Aprendiz';
  const poloNome = Array.isArray(profile?.equipamentos)
    ? (profile?.equipamentos[0]?.nome || 'CREAS Pirapora')
    : (profile?.equipamentos?.nome || 'CREAS Pirapora');

  const statusLabel = profile?.passou_pre_aprendizagem 
    ? 'Apto para Vagas de Aprendizagem' 
    : profile?.fez_pre_aprendizagem 
      ? 'Em Capacitação / Pré-Aprendizagem' 
      : 'Em Acompanhamento Técnico';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      {/* Cabeçalho da Página */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: '#f1f5f9', color: 'var(--color-primary)', padding: '0.5rem', borderRadius: '0.75rem' }}>
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', color: 'var(--color-primary)', margin: 0, fontWeight: 800 }}>
              Configurações
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.2rem', fontSize: '0.88rem' }}>
              Gerencie seus dados pessoais, código de acesso e acesse o suporte oficial.
            </p>
          </div>
        </div>
      </header>

      {/* Seletor de Sub-abas Mobile First */}
      <div
        style={{
          display: 'flex',
          background: '#e2e8f0',
          padding: '0.35rem',
          borderRadius: '0.75rem',
          gap: '0.35rem'
        }}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'perfil'}
          onClick={() => handleTabChange('perfil')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.55rem',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: activeTab === 'perfil' ? '#ffffff' : 'transparent',
            color: activeTab === 'perfil' ? 'var(--color-primary)' : '#64748b',
            boxShadow: activeTab === 'perfil' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <UserCircle size={18} />
          <span>Meu Perfil</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'suporte'}
          onClick={() => handleTabChange('suporte')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.55rem',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: activeTab === 'suporte' ? '#ffffff' : 'transparent',
            color: activeTab === 'suporte' ? 'var(--color-primary)' : '#64748b',
            boxShadow: activeTab === 'suporte' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <HelpCircle size={18} />
          <span>Ajuda & Suporte</span>
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: MEU PERFIL */}
      {activeTab === 'perfil' && (
        <motion.div
          key="tab-perfil"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Hero Card do Perfil */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a5f 100%)',
              color: '#ffffff',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 8px 24px rgba(10,37,64,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  flexShrink: 0
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    {displayName}
                  </h3>
                  {profile?.possui_nome_social && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>
                      Nome Social
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', opacity: 0.85 }}>
                  {poloNome} &bull; {profile?.bairro || 'Pirapora - MG'}
                </p>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  background: profile?.passou_pre_aprendizagem ? 'rgba(34, 197, 94, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                  border: profile?.passou_pre_aprendizagem ? '1px solid #22c55e' : '1px solid #38bdf8',
                  color: '#ffffff',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '2rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShieldCheck size={14} />
                {statusLabel}
              </div>
            </div>

            {/* Código de Acesso / PIN Card */}
            {profile?.codigo_acesso && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  border: '1px dashed rgba(255, 255, 255, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <KeyRound size={18} color="#f59e0b" />
                  <div>
                    <span style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                      Seu Código de Acesso (PIN)
                    </span>
                    <strong style={{ fontSize: '1.1rem', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                      {profile.codigo_acesso}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyPin(profile.codigo_acesso || '')}
                  style={{
                    background: copiedPin ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiedPin ? <Check size={14} /> : <Copy size={14} />}
                  {copiedPin ? 'Copiado!' : 'Copiar PIN'}
                </button>
              </div>
            )}
          </div>

          {/* Card: Dados Pessoais & Contato */}
          <div style={sectionCardStyle}>
            <h4 style={sectionHeaderStyle}>
              <UserCircle size={18} color="var(--color-primary)" /> Informações Pessoais & Contato
            </h4>

            <div style={gridFieldsStyle}>
              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Nome Completo de Registro</span>
                <strong style={fieldValueStyle}>{profile?.nome_completo || '—'}</strong>
              </div>

              {profile?.possui_nome_social && (
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Nome Social</span>
                  <strong style={fieldValueStyle}>{profile?.nome_social}</strong>
                </div>
              )}

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>CPF</span>
                <strong style={fieldValueStyle}>{profile?.cpf || 'Cadastrado no sistema'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Idade & Nascimento</span>
                <strong style={fieldValueStyle}>
                  {profile?.idade ? `${profile.idade} anos` : '—'}
                  {profile?.data_nascimento && ` (${profile.data_nascimento})`}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Gênero / Sexo</span>
                <strong style={fieldValueStyle}>{profile?.sexo || '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Cor / Raça</span>
                <strong style={fieldValueStyle}>{profile?.cor_pele || '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Telefone Principal</span>
                <strong style={fieldValueStyle}>{profile?.telefone || '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>WhatsApp</span>
                <strong style={{ ...fieldValueStyle, color: '#16a34a' }}>
                  {profile?.whatsapp || profile?.telefone || '—'}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Endereço & Bairro</span>
                <strong style={fieldValueStyle}>
                  {profile?.endereco ? `${profile.endereco} - ` : ''}{profile?.bairro || 'Pirapora - MG'}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Responsável Legal</span>
                <strong style={fieldValueStyle}>
                  {profile?.nome_responsavel || '—'} 
                  {profile?.grau_parentesco && ` (${profile.grau_parentesco})`}
                </strong>
              </div>
            </div>
          </div>

          {/* Card: Vínculo Institucional & Escolar */}
          <div style={sectionCardStyle}>
            <h4 style={sectionHeaderStyle}>
              <GraduationCap size={18} color="var(--color-primary)" /> Vínculo Institucional & Escolaridade
            </h4>

            <div style={gridFieldsStyle}>
              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Unidade de Atendimento</span>
                <strong style={fieldValueStyle}>{poloNome}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Entidade Formadora</span>
                <strong style={fieldValueStyle}>{profile?.entidade_formadora || 'Programa Descubra'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Escolaridade Atual</span>
                <strong style={fieldValueStyle}>{profile?.escolaridade || 'Ensino Médio'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Turno Escolar</span>
                <strong style={fieldValueStyle}>{profile?.turno_escolar || 'Regular'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Tipo de Inscrição</span>
                <strong style={fieldValueStyle}>{profile?.tipo_inscricao || 'Descubra Regular'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Saldo na Loja de Prêmios</span>
                <strong style={{ ...fieldValueStyle, color: 'var(--color-orange)' }}>
                  {profile?.pontuacao_atual ?? 0} pontos acumulados
                </strong>
              </div>
            </div>
          </div>

          {/* Card: Áreas de Interesse */}
          {profile?.areas_interesse && profile.areas_interesse.length > 0 && (
            <div style={sectionCardStyle}>
              <h4 style={sectionHeaderStyle}>
                <Tag size={18} color="var(--color-primary)" /> Áreas de Interesse Profissional
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {profile.areas_interesse.map((area, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '2rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nota Informativa para o Aluno */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.85rem',
              color: '#64748b',
              lineHeight: 1.5
            }}
          >
            💡 <strong>Precisa atualizar algum dado ou telefone?</strong> Entre em contato com a equipe técnica da sua unidade pelo botão de <strong>Ajuda & Suporte</strong> acima. Os técnicos realizarão a atualização cadastral no sistema oficial.
          </div>
        </motion.div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: AJUDA & SUPORTE */}
      {activeTab === 'suporte' && (
        <motion.div
          key="tab-suporte"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Contato da Unidade de Referência */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.65rem', borderRadius: '0.75rem' }}>
                <Building size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', margin: 0, fontWeight: 800 }}>
                  Sua Unidade de Atendimento
                </h4>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Equipamento socioassistencial responsável pelo seu acompanhamento
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--color-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  {poloNome}
                </strong>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} color="var(--color-primary)" /> Pirapora - MG &bull; Atendimento presencial
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} color="var(--color-primary)" /> Segunda a Sexta: 08h00 às 17h00
                </p>
              </div>

              {/* Botões de Ação Rápida no Mobile */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <a
                  href="https://wa.me/5538999999999?text=Ol%C3%A1%2C%20sou%20aluno%20do%20Programa%20Descubra%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)'
                  }}
                >
                  <MessageCircle size={18} />
                  Falar no WhatsApp
                </a>

                <a
                  href="tel:3837406100"
                  style={{
                    background: '#ffffff',
                    color: 'var(--color-primary)',
                    border: '1.5px solid #cbd5e1',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none'
                  }}
                >
                  <Phone size={18} />
                  Ligar para a Unidade
                </a>
              </div>
            </div>
          </div>

          {/* Dúvidas Frequentes (FAQ) */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Sparkles size={20} color="var(--color-orange)" />
              <h4 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', margin: 0, fontWeight: 800 }}>
                Perguntas Frequentes (FAQ)
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      background: isOpen ? '#f8fafc' : '#ffffff',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <strong style={{ fontSize: '0.92rem', color: 'var(--color-primary)', lineHeight: 1.4 }}>
                        {faq.q}
                      </strong>
                      <span style={{ color: '#64748b', flexShrink: 0 }}>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div
                            style={{
                              padding: '0 1rem 1rem 1rem',
                              color: 'var(--color-text-dark)',
                              fontSize: '0.88rem',
                              lineHeight: 1.6,
                              borderTop: '1px solid #f1f5f9'
                            }}
                          >
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
          <p style={{ color: 'var(--color-text-light)' }}>Carregando configurações...</p>
        </div>
      }
    >
      <ConfiguracoesContent />
    </Suspense>
  );
}

// Estilos Reutilizáveis
const sectionCardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '1rem',
  border: '1px solid #e2e8f0',
  padding: '1.25rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem'
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: 'var(--color-primary)',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const gridFieldsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.85rem'
};

const fieldItemStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '0.75rem 0.85rem',
  borderRadius: '0.65rem',
  border: '1px solid #f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem'
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600
};

const fieldValueStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  color: 'var(--color-text-dark)',
  fontWeight: 600,
  wordBreak: 'break-word'
};
