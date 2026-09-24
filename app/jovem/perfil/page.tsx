'use client';

import { motion } from 'framer-motion';
import { 
  UserCircle, 
  Mail, 
  MapPin, 
  Phone, 
  GraduationCap, 
  Building, 
  ShieldCheck, 
  KeyRound, 
  Calendar, 
  Users, 
  DollarSign, 
  Wifi, 
  Monitor, 
  Briefcase, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Tag
} from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function PerfilPage() {
  const [profile, setProfile] = useState<JovemProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let loadedProfile: JovemProfile | null = null;

        if (session?.user?.id) {
          const { data } = await supabase
            .from('jovens')
            .select('*, equipamentos(nome, tipo)')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) loadedProfile = data as unknown as JovemProfile;
        }

        if (!loadedProfile) {
          const { data } = await supabase
            .from('jovens')
            .select('*, equipamentos(nome, tipo)')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) loadedProfile = data as unknown as JovemProfile;
        }

        setProfile(loadedProfile);
      } catch (err) {
        console.error('Erro ao buscar perfil do jovem:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const maskCPF = (cpf: string | null) => {
    if (!cpf) return 'Não informado';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
    }
    return cpf;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Não informada';
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando dados do perfil oficial...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Nenhum perfil de jovem encontrado no banco de dados.</p>
      </div>
    );
  }

  const displayName = profile.nome_social || profile.nome_completo;
  const statusBadge = profile.passou_pre_aprendizagem 
    ? 'Apto para Vagas de Aprendizagem' 
    : profile.fez_pre_aprendizagem 
      ? 'Em Pré-Aprendizagem' 
      : 'Em Acompanhamento / Capacitação';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Meu Perfil</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Informações cadastrais e histórico do programa sincronizados com o banco de dados.
        </p>
      </header>

      {/* Card Principal de Identificação */}
      <div style={{
        background: '#fff',
        borderRadius: '1rem',
        border: '1px solid #e2e8f0',
        padding: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), #2563eb)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          fontWeight: 700,
          flexShrink: 0
        }}>
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.35rem' }}>
            {displayName}
          </h3>
          {profile.nome_social && (
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.35rem' }}>
              Nome Civil: <strong>{profile.nome_completo}</strong>
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              color: '#0284c7',
              fontWeight: 600,
              fontSize: '0.82rem',
              background: '#e0f2fe',
              padding: '0.2rem 0.75rem',
              borderRadius: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <ShieldCheck size={14} /> {statusBadge}
            </span>
            <span style={{
              color: '#7e22ce',
              fontWeight: 600,
              fontSize: '0.82rem',
              background: '#f3e8ff',
              padding: '0.2rem 0.75rem',
              borderRadius: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <KeyRound size={14} /> PIN: {profile.codigo_acesso || 'Ativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Seções de Informações */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Dados Pessoais & Documentação */}
        <div style={sectionCardStyle}>
          <h4 style={sectionHeaderStyle}>
            <Calendar size={16} /> Dados Pessoais & Documentação
          </h4>
          <div style={fieldGridStyle}>
            <FieldItem label="CPF" value={maskCPF(profile.cpf)} />
            <FieldItem label="Data de Nascimento" value={`${formatDate(profile.data_nascimento)} (${profile.idade || '--'} anos)`} />
            <FieldItem label="Sexo" value={profile.sexo || 'Não informado'} />
            <FieldItem label="Cor / Raça" value={profile.cor_pele || 'Não informado'} />
            <FieldItem label="Tipo de Inscrição" value={profile.tipo_inscricao || 'Acompanhamento'} />
            <FieldItem label="Pontuação Vulnerabilidade" value={`${profile.pontuacao_atual ?? 0} pontos`} />
          </div>
        </div>

        {/* Contato & Localização */}
        <div style={sectionCardStyle}>
          <h4 style={sectionHeaderStyle}>
            <MapPin size={16} /> Contato & Endereço
          </h4>
          <div style={fieldGridStyle}>
            <FieldItem label="Telefone" value={profile.telefone || 'Não informado'} />
            <FieldItem label="WhatsApp" value={profile.whatsapp || 'Não informado'} />
            <FieldItem label="Bairro" value={profile.bairro || 'Não informado'} fullWidth />
            <FieldItem label="Endereço Completo" value={profile.endereco || 'Não informado'} fullWidth />
          </div>
        </div>

        {/* Responsável Familiar */}
        <div style={sectionCardStyle}>
          <h4 style={sectionHeaderStyle}>
            <Users size={16} /> Responsável Legal
          </h4>
          <div style={fieldGridStyle}>
            <FieldItem label="Nome do Responsável" value={profile.nome_responsavel || 'Não informado'} fullWidth />
            <FieldItem label="Grau de Parentesco" value={profile.grau_parentesco || 'Não informado'} />
            <FieldItem label="Telefone do Responsável" value={profile.telefone_responsavel || 'Não informado'} />
          </div>
        </div>

        {/* Vínculo & Escolaridade */}
        <div style={sectionCardStyle}>
          <h4 style={sectionHeaderStyle}>
            <GraduationCap size={16} /> Escolaridade & Vínculo
          </h4>
          <div style={fieldGridStyle}>
            <FieldItem label="Escolaridade" value={profile.escolaridade || 'Não informada'} />
            <FieldItem label="Turno Escolar" value={profile.turno_escolar || 'Não informado'} />
            <FieldItem 
              label="Unidade de Referência" 
              value={Array.isArray(profile.equipamentos) 
                ? (profile.equipamentos[0]?.nome || 'CREAS Nossa Senhora Aparecida') 
                : (profile.equipamentos?.nome || 'CREAS Nossa Senhora Aparecida')} 
              fullWidth 
            />
            <FieldItem label="Entidade Formadora" value={profile.entidade_formadora || 'Descubra'} fullWidth />
          </div>
        </div>
      </div>

      {/* Áreas de Interesse Profissional */}
      {profile.areas_interesse && profile.areas_interesse.length > 0 && (
        <div style={sectionCardStyle}>
          <h4 style={sectionHeaderStyle}>
            <Tag size={16} /> Áreas de Interesse Profissional Cadastradas
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {profile.areas_interesse.map((area, idx) => (
              <span key={idx} style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '0.4rem 1rem',
                borderRadius: '2rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid #dbeafe'
              }}>
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Indicadores Socioeconômicos Reais */}
      <div style={sectionCardStyle}>
        <h4 style={sectionHeaderStyle}>
          <ShieldCheck size={16} /> Indicadores Socioeconômicos & Conectividade
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <IndicatorItem label="Recebe Bolsa Família" active={profile.recebe_bolsa_familia} />
          <IndicatorItem label="Inscrito no CadÚnico" active={profile.possui_cadunico} />
          <IndicatorItem label="Acesso à Internet" active={profile.possui_acesso_internet} />
          <IndicatorItem label="Possui Computador" active={profile.possui_computador} />
          <IndicatorItem label="Já trabalhou anteriormente" active={profile.trabalhou_anteriormente} />
          <IndicatorItem label="Pessoas na residência" active={Boolean(profile.pessoas_residencia)} customText={`${profile.pessoas_residencia || 0} pessoas`} />
        </div>
      </div>
    </div>
  );
}

function FieldItem({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.92rem', color: 'var(--color-title)', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function IndicatorItem({ label, active, customText }: { label: string; active: boolean | null; customText?: string }) {
  const isPositive = active === true;
  return (
    <div style={{
      background: '#f8fafc',
      padding: '0.75rem',
      borderRadius: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
      border: '1px solid #f1f5f9'
    }}>
      <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>{label}</span>
      {customText ? (
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)' }}>{customText}</span>
      ) : isPositive ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} /> Sim
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>
          <XCircle size={16} /> Não
        </span>
      )}
    </div>
  );
}

const sectionCardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '1rem',
  border: '1px solid #e2e8f0',
  padding: '1.25rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
};

const sectionHeaderStyle: React.CSSProperties = {
  color: 'var(--color-primary)',
  fontSize: '0.95rem',
  fontWeight: 700,
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const fieldGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '0.85rem 1rem',
};
