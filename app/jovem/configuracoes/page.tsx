'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCircle, 
  Settings, 
  HelpCircle, 
  Phone, 
  MapPin, 
  Building, 
  Calendar, 
  GraduationCap, 
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
  MessageCircle, 
  Clock, 
  Sparkles,
  Home,
  FileCheck2,
  Award,
  Info
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
  curso_encaminhado: string | null;
  curso_pre_aprendizagem: string | null;
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
  equipamento_id: string | null;
  equipamentos?: {
    id: string;
    nome: string;
    tipo: string;
    cidades?: {
      nome: string;
    };
  } | null;
}

interface TecnicoInfo {
  id: string;
  nome: string;
  telefone_whatsapp: string | null;
  cargo: string;
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
    a: 'É um índice calculado com base em critérios de vulnerabilidade social previstos nas diretrizes do Descubra. Você acumula pontos mantendo boa assiduidade nas oficinas socioassistenciais, participando das capacitações e concluindo as etapas de pré-aprendizagem. Os pontos podem ser trocados por prêmios na Loja de Prêmios!'
  },
  {
    q: 'Como falar com meu técnico de referência?',
    a: 'Você pode comparecer presencialmente na sua Unidade de Referência (CREAS / CRAS cadastrado) ou entrar em contato direto pelo WhatsApp ou telefone do técnico informados nesta aba.'
  }
];

function formatCpf(val?: string | null) {
  if (!val) return '—';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  return val;
}

function formatDate(val?: string | null) {
  if (!val) return '—';
  const parts = val.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
}

function cleanPhoneForLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return null;
}

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams.get('tab') === 'suporte' || searchParams.get('tab') === 'ajuda'
    ? 'suporte'
    : 'perfil';

  const [activeTab, setActiveTab] = useState<'perfil' | 'suporte'>(initialTab);
  const [profile, setProfile] = useState<JovemProfile | null>(null);
  const [tecnico, setTecnico] = useState<TecnicoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let loadedProfile: JovemProfile | null = null;

        // 1. Validar autenticação do jovem
        if (!session?.user?.id) {
          window.location.href = '/login';
          return;
        }

        const { data, error } = await supabase
          .from('jovens')
          .select('*, equipamentos(id, nome, tipo, cidades(nome))')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!error && data) {
          loadedProfile = data as unknown as JovemProfile;
        } else {
          window.location.href = '/login';
          return;
        }

        setProfile(loadedProfile);

        // 3. Carregar dados reais do técnico de referência da unidade do jovem
        if (loadedProfile?.equipamento_id) {
          const { data: tecData } = await supabase
            .from('tecnicos')
            .select('id, nome, telefone_whatsapp, cargo')
            .eq('equipamento_id', loadedProfile.equipamento_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (tecData) {
            setTecnico(tecData as TecnicoInfo);
          }
        }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando dados oficiais do aluno...</p>
      </div>
    );
  }

  const displayName = profile?.nome_social || profile?.nome_completo || 'Aluno Descubra';
  const poloNome = profile?.equipamentos?.nome || 'Unidade de Referência Descubra';
  const cidadeNome = profile?.equipamentos?.cidades?.nome || 'Pirapora';

  const statusLabel = profile?.passou_pre_aprendizagem || profile?.fez_pre_aprendizagem
    ? 'Pré-Aprendizagem Concluída' 
    : 'Em Acompanhamento / Pré-Aprendizagem';

  const whatsappTecnicoLimpo = cleanPhoneForLink(tecnico?.telefone_whatsapp);
  const whatsappMsg = encodeURIComponent(
    `Olá ${tecnico?.nome ? tecnico.nome : 'equipe técnica'}, sou o(a) aluno(a) ${displayName} do Programa Descubra e gostaria de tirar uma dúvida.`
  );

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
              Configurações & Perfil
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginTop: '0.2rem', fontSize: '0.88rem' }}>
              Dados cadastrais oficiais e contato direto com seu técnico de referência.
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
          {/* Hero Card do Perfil com Dados Reais */}
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
                  {poloNome} &bull; {cidadeNome} - MG
                </p>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  background: profile?.passou_pre_aprendizagem || profile?.fez_pre_aprendizagem ? 'rgba(34, 197, 94, 0.25)' : 'rgba(14, 165, 233, 0.25)',
                  border: profile?.passou_pre_aprendizagem || profile?.fez_pre_aprendizagem ? '1px solid #22c55e' : '1px solid #38bdf8',
                  color: '#ffffff',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '2rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShieldCheck size={15} />
                {statusLabel}
              </div>
            </div>
          </div>

          {/* Card 1: Dados Pessoais & Contato */}
          <div style={sectionCardStyle}>
            <h4 style={sectionHeaderStyle}>
              <UserCircle size={18} color="var(--color-primary)" /> Dados Cadastrais & Contato
            </h4>

            <div style={gridFieldsStyle}>
              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Nome Completo de Registro</span>
                <strong style={fieldValueStyle}>{profile?.nome_completo || '—'}</strong>
              </div>

              {profile?.possui_nome_social && (
                <div style={fieldItemStyle}>
                  <span style={fieldLabelStyle}>Nome Social</span>
                  <strong style={fieldValueStyle}>{profile?.nome_social || '—'}</strong>
                </div>
              )}

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>CPF</span>
                <strong style={fieldValueStyle}>{formatCpf(profile?.cpf)}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Idade & Data de Nascimento</span>
                <strong style={fieldValueStyle}>
                  {profile?.idade ? `${profile.idade} anos` : '—'}
                  {profile?.data_nascimento && ` (${formatDate(profile.data_nascimento)})`}
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
                <span style={fieldLabelStyle}>WhatsApp do Aluno</span>
                <strong style={{ ...fieldValueStyle, color: '#16a34a' }}>
                  {profile?.whatsapp || profile?.telefone || '—'}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Endereço & Bairro</span>
                <strong style={fieldValueStyle}>
                  {profile?.endereco ? `${profile.endereco} — ` : ''}
                  {profile?.bairro || `${cidadeNome} - MG`}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Responsável Legal</span>
                <strong style={fieldValueStyle}>
                  {profile?.nome_responsavel || '—'} 
                  {profile?.grau_parentesco && ` (${profile.grau_parentesco})`}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Telefone do Responsável</span>
                <strong style={fieldValueStyle}>{profile?.telefone_responsavel || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Vínculo Institucional & Programa Descubra */}
          <div style={sectionCardStyle}>
            <h4 style={sectionHeaderStyle}>
              <GraduationCap size={18} color="var(--color-primary)" /> Vínculo Institucional & Programa Descubra
            </h4>

            <div style={gridFieldsStyle}>
              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Unidade de Atendimento</span>
                <strong style={fieldValueStyle}>{poloNome}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Técnico de Referência Responsável</span>
                <strong style={{ ...fieldValueStyle, color: 'var(--color-primary)' }}>
                  {tecnico?.nome || 'Equipe Técnica Descubra'}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Entidade Formadora Vinculada</span>
                <strong style={fieldValueStyle}>{profile?.entidade_formadora || 'Programa Descubra'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Curso Encaminhado / Em Andamento</span>
                <strong style={fieldValueStyle}>
                  {profile?.curso_encaminhado && profile.curso_encaminhado !== 'Nenhum' 
                    ? profile.curso_encaminhado 
                    : 'Aguardando encaminhamento'}
                </strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Escolaridade Atual</span>
                <strong style={fieldValueStyle}>{profile?.escolaridade || '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Turno Escolar</span>
                <strong style={fieldValueStyle}>{profile?.turno_escolar || '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Tipo de Inscrição</span>
                <strong style={fieldValueStyle}>{profile?.tipo_inscricao || 'Descubra'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Pontuação Acumulada</span>
                <strong style={{ ...fieldValueStyle, color: 'var(--color-orange)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Award size={16} /> {profile?.pontuacao_atual ?? 0} pontos
                </strong>
              </div>
            </div>
          </div>

          {/* Card 3: Condições Socioeconômicas & Infraestrutura */}
          <div style={sectionCardStyle}>
            <h4 style={sectionHeaderStyle}>
              <Home size={18} color="var(--color-primary)" /> Dados Socioeconômicos & Moradia
            </h4>

            <div style={gridFieldsStyle}>
              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Possui CadÚnico?</span>
                <strong style={fieldValueStyle}>{profile?.possui_cadunico ? 'Sim' : 'Não'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Recebe Bolsa Família?</span>
                <strong style={fieldValueStyle}>{profile?.recebe_bolsa_familia ? 'Sim' : 'Não'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Pessoas na Residência</span>
                <strong style={fieldValueStyle}>{profile?.pessoas_residencia ?? '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Pessoas que Trabalham</span>
                <strong style={fieldValueStyle}>{profile?.pessoas_trabalham ?? '—'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Acesso à Internet em Casa?</span>
                <strong style={fieldValueStyle}>{profile?.possui_acesso_internet ? 'Sim' : 'Não'}</strong>
              </div>

              <div style={fieldItemStyle}>
                <span style={fieldLabelStyle}>Possui Computador em Casa?</span>
                <strong style={fieldValueStyle}>{profile?.possui_computador ? 'Sim' : 'Não'}</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Áreas de Interesse Profissional */}
          {profile?.areas_interesse && profile.areas_interesse.length > 0 && (
            <div style={sectionCardStyle}>
              <h4 style={sectionHeaderStyle}>
                <Tag size={18} color="var(--color-primary)" /> Áreas de Interesse Profissional
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                {profile.areas_interesse.map((area, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '0.4rem 0.9rem',
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

          {/* Nota Informativa */}
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
            💡 <strong>Precisa atualizar algum dado, endereço ou telefone?</strong> Entre em contato com seu técnico de referência na aba de <strong>Ajuda & Suporte</strong> para realizar a alteração cadastral no sistema oficial.
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
          {/* Contato da Unidade de Referência & Técnico Real */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.65rem', borderRadius: '0.75rem' }}>
                <Building size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', margin: 0, fontWeight: 800 }}>
                  Sua Unidade de Atendimento & Técnico
                </h4>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Equipamento socioassistencial responsável pelo seu acompanhamento
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  {poloNome}
                </strong>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} color="var(--color-primary)" /> {cidadeNome} - MG &bull; Atendimento presencial
                </p>
                {tecnico?.nome && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCircle size={15} color="#059669" /> Técnico de Referência: <strong>{tecnico.nome}</strong>
                  </p>
                )}
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} color="var(--color-primary)" /> Segunda a Sexta: 08h00 às 17h00
                </p>
              </div>

              {/* Botões de Ação com Contato Real */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {whatsappTecnicoLimpo ? (
                  <a
                    href={`https://wa.me/${whatsappTecnicoLimpo}?text=${whatsappMsg}`}
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
                    Falar com o Técnico no WhatsApp
                  </a>
                ) : (
                  <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '0.75rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={16} /> Atendimento presencial no CRAS/CREAS de referência
                  </div>
                )}

                {tecnico?.telefone_whatsapp && (
                  <a
                    href={`tel:${tecnico.telefone_whatsapp.replace(/\D/g, '')}`}
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
                    Ligar ({tecnico.telefone_whatsapp})
                  </a>
                )}
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
                      <span style={{ color: '#64748b' }}>
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
                        >
                          <div
                            style={{
                              padding: '0 1rem 1rem 1rem',
                              color: 'var(--color-text)',
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
