'use client';

import React, { useState } from 'react';
import { 
  Heart, CheckCircle2, Sparkles, Scale, Megaphone, Users, 
  TrendingUp, Trophy, Newspaper, Globe, ShieldCheck, Briefcase
} from 'lucide-react';

const BronzeSeal = { src: '/assets/selo-bronze.png.jpeg' };
const PrataSeal = { src: '/assets/selo-prata.png.jpeg' };
const OuroSeal = { src: '/assets/selo-ouro.png.jpeg' };

type TabType = 'bronze' | 'prata' | 'ouro';

const selosData = {
  bronze: {
    titulo: 'Selo Bronze â€” Apoiador DescubraHub',
    missao: 'Doar Tempo e Conhecimento',
    nivel: 'Bronze',
    imagem: BronzeSeal,
    corHex: 'var(--color-orange)',
    bgBadge: 'rgba(249,115,22,0.12)',
    textBadge: '#d97706',
    tagline: 'A menor barreira de entrada, sem custo financeiro. Ideal para microempresas e MEIs.',
    passos: [
      'Cadastro BÃ¡sico: O dono da empresa ou colaborador designado cria o perfil como "Empresa Parceira".',
      'Oferta de Mentoria: Cadastre disponibilidade de tempo (ex: 2 horas por mÃªs) ou uma "PÃ­lula de Conhecimento".',
    ],
    gatilho: 'Completar pelo menos UMA das aÃ§Ãµes prÃ¡ticas:',
    gatilhosItens: [
      'Realizar 2 sessÃµes de mentoria (presencial ou videochamada no app) com jovens na fila, orientando sobre currÃ­culo ou profissÃ£o.',
      'Promover 1 dia de Job Shadowing: receber jovens na empresa por uma tarde para observarem o ambiente real de trabalho.',
    ],
    beneficiosPilares: [
      {
        icone: Globe,
        cor: '#4f46e5',
        bgCor: 'rgba(79,70,229,0.08)',
        titulo: 'Visibilidade Digital',
        descricao: 'Perfil da empresa destacado no app com o selo, ganhando prioridade nas recomendaÃ§Ãµes automÃ¡ticas do sistema para jovens em busca de vagas.'
      },
      {
        icone: Users,
        cor: '#059669',
        bgCor: 'rgba(5,150,105,0.08)',
        titulo: 'Clima Organizacional',
        descricao: 'Colaboradores que doam tempo de mentoria sentem maior propÃ³sito e satisfaÃ§Ã£o no trabalho â€” impacto direto na retenÃ§Ã£o interna.'
      },
      {
        icone: ShieldCheck,
        cor: '#2563eb',
        bgCor: 'rgba(37,99,235,0.08)',
        titulo: 'ReputaÃ§Ã£o ComunitÃ¡ria',
        descricao: 'A empresa passa a ser reconhecida como parceira social ativa pela Prefeitura de Pirapora e pelas entidades de assistÃªncia (CREAS/CRAS).'
      },
    ],
    divulgacoes: [
      'ðŸ“± Perfil da empresa publicado como "Apoiador Ativo" no feed de oportunidades do app, visto por jovens e famÃ­lias da regiÃ£o.',
      'ðŸ“¢ CitaÃ§Ã£o da empresa em posts nas redes sociais oficiais do DescubraHub (Instagram e Facebook da Secretaria Municipal).',
      'ðŸŒ Logotipo e nome da empresa listados na pÃ¡gina "Quem Apoia" do site institucional do DescubraHub.',
    ]
  },
  prata: {
    titulo: 'Selo Prata â€” Ponte para o Futuro',
    missao: 'Gerar Empregabilidade e Renda',
    nivel: 'Prata',
    imagem: PrataSeal,
    corHex: 'var(--color-text-light)',
    bgBadge: 'rgba(100,116,139,0.12)',
    textBadge: '#475569',
    tagline: 'Foco em gerar o primeiro emprego formal fora das cotas legais obrigatÃ³rias.',
    passos: [
      'PublicaÃ§Ã£o da Vaga: Divulgue sua oportunidade de contrataÃ§Ã£o diretamente na plataforma de forma simples.',
      'Triagem Assistida: Aguarde o encaminhamento dos candidatos prÃ©-selecionados pela equipe tÃ©cnica do CRAS/CREAS.',
    ],
    gatilho: 'AÃ§Ã£o PrÃ¡tica obrigatÃ³ria de contrataÃ§Ã£o:',
    gatilhosItens: [
      'Assinar um contrato de trabalho formal (CLT padrÃ£o) ou estÃ¡gio remunerado com o jovem encaminhado.',
      'Registrar a contrataÃ§Ã£o na plataforma para validaÃ§Ã£o e homologaÃ§Ã£o do gestor do CREAS.',
    ],
    beneficiosPilares: [
      {
        icone: Briefcase,
        cor: '#4f46e5',
        bgCor: 'rgba(79,70,229,0.08)',
        titulo: 'MÃ£o de Obra Qualificada',
        descricao: 'Os jovens contratados sÃ£o prÃ©-selecionados e acompanhados por assistentes sociais, reduzindo o turnover e os custos de recrutamento e seleÃ§Ã£o.'
      },
      {
        icone: TrendingUp,
        cor: '#059669',
        bgCor: 'rgba(5,150,105,0.08)',
        titulo: 'Agenda ESG e LicitaÃ§Ãµes',
        descricao: 'O selo Prata pode ser utilizado para pontuar em clÃ¡usulas de Responsabilidade Social em licitaÃ§Ãµes pÃºblicas municipais e estaduais.'
      },
    ],
    divulgacoes: [
      'ðŸ·ï¸ Autocolante fÃ­sico oficial do DescubraHub enviado para a vitrine da empresa â€” visibilidade no comÃ©rcio de rua de Pirapora.',
      'ðŸ“¸ Post de destaque nas redes sociais oficiais do Programa: "ConheÃ§a a empresa que transformou a vida de [Nome do Jovem]!"',
      'ðŸ“° MenÃ§Ã£o no boletim informativo mensal da Secretaria Municipal de AssistÃªncia Social, distribuÃ­do a lideranÃ§as empresariais da cidade.',
      'ðŸ… Certificado digital personalizado para uso em apresentaÃ§Ãµes, site e redes sociais da empresa.',
    ]
  },
  ouro: {
    titulo: 'Selo Ouro â€” Transformador Social',
    missao: 'AbraÃ§ar a Causa Principal',
    nivel: 'Ouro',
    imagem: OuroSeal,
    corHex: 'var(--color-yellow)',
    bgBadge: 'rgba(245,158,11,0.12)',
    textBadge: '#b45309',
    tagline: 'InclusÃ£o intencional de jovens em altÃ­ssima vulnerabilidade ou abertura formal de cotas de Aprendizagem.',
    passos: [
      'Alinhamento EstratÃ©gico: Apoiar jovens egressos do sistema socioeducativo, de casas de acolhimento ou em situaÃ§Ã£o de trabalho infantil.',
      'Intencionalidade: Abrir as portas para transformar realidades crÃ­ticas monitoradas sigilosamente pelo CREAS.',
    ],
    gatilho: 'Cumprir pelo menos UM critÃ©rio de alto impacto:',
    gatilhosItens: [
      'OpÃ§Ã£o A: Abrir e preencher vagas formais de Jovem Aprendiz (cota legal com SENAI/SEST SENAT) contratando jovens encaminhados pelo programa.',
      'OpÃ§Ã£o B: Contratar intencionalmente jovem de alta vulnerabilidade por meio de encaminhamento confidencial do CREAS.',
    ],
    beneficiosPilares: [
      {
        icone: Trophy,
        cor: '#d97706',
        bgCor: 'rgba(217,119,6,0.08)',
        titulo: 'Honra ao MÃ©rito PÃºblico',
        descricao: 'Reconhecimento pelo ComitÃª Gestor Interinstitucional (Prefeitura + MPT + Entidades). Convite para cerimÃ´nia anual de premiaÃ§Ã£o com cobertura da mÃ­dia regional.'
      },
      {
        icone: Megaphone,
        cor: '#7c3aed',
        bgCor: 'rgba(124,58,237,0.08)',
        titulo: 'Case de Sucesso Regional',
        descricao: 'A empresa Ã© posicionada como referÃªncia regional de ESG, abrindo portas para linhas de crÃ©dito social do BNDES/BDMG com taxas de juros reduzidas.'
      },
    ],
    divulgacoes: [
      'ðŸ† TrofÃ©u fÃ­sico oficial entregue em cerimÃ´nia pÃºblica anual com autoridades municipais e cobertura jornalÃ­stica local.',
      'ðŸ“º Reportagem especial no portal de notÃ­cias e emissoras locais: "A empresa de Pirapora que transforma o futuro da juventude".',
      'ðŸŽ–ï¸ Destaque como "Case de Sucesso" em eventos e feiras de empreendedorismo da regiÃ£o Norte de Minas.',
      'ðŸŒ PÃ¡gina dedicada no site do Programa Descubra com a histÃ³ria da empresa e depoimentos dos jovens contratados.',
      'ðŸ“£ IndicaÃ§Ã£o prioritÃ¡ria pela Prefeitura como empresa de referÃªncia social em processos de licitaÃ§Ã£o e parcerias institucionais.',
    ]
  }
};

export default function ManualSelosPage() {
  const [activeTab, setActiveTab] = useState<TabType>('bronze');
  const selo = selosData[activeTab];

  const tabs: { key: TabType; label: string; img: any }[] = [
    { key: 'bronze', label: 'ðŸ¥‰ Bronze', img: BronzeSeal },
    { key: 'prata',  label: 'ðŸ¥ˆ Prata',  img: PrataSeal },
    { key: 'ouro',   label: 'ðŸ¥‡ Ouro',   img: OuroSeal },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header com as classes nativas do sistema */}
      <div className="admin-form-header">
        <h2 className="admin-form-title">Manual de Selos â€” CertificaÃ§Ã£o Social</h2>
        <p className="admin-form-subtitle">
          Descubra as missÃµes, os benefÃ­cios estratÃ©gicos e a visibilidade pÃºblica que cada nÃ­vel de engajamento gera para a sua empresa. Quanto mais vocÃª apoia a juventude de Pirapora, mais sua marca cresce.
        </p>
      </div>

      {/* Tab Navigation com estilos padronizados */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="btn"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: isSelected ? '2px solid var(--color-secondary)' : '1px solid rgba(10,37,64,0.12)',
                backgroundColor: isSelected ? 'rgba(13,92,58,0.06)' : '#fff',
                color: isSelected ? 'var(--color-secondary)' : 'var(--color-text-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.50rem',
                cursor: 'pointer',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                transition: 'var(--transition-fast)'
              }}
            >
              <img 
                src={tab.img.src} 
                alt={tab.label} 
                style={{ height: '22px', width: '22px', borderRadius: '4px', objectFit: 'cover' }} 
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bloco de ConteÃºdo Principal */}
      <div className="report-stat-card" style={{ display: 'block', padding: '2rem', width: '100%', borderTop: `4px solid ${selo.corHex}` }}>
        
        {/* Selo Header */}
        <div className="company-card-header" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <img
            src={selo.imagem.src}
            alt={selo.titulo}
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: `2px solid ${selo.corHex}`,
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0
            }}
          />
          <div className="company-card-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span className="company-card-badge" style={{ backgroundColor: selo.bgBadge, color: selo.textBadge, fontWeight: 700, width: 'fit-content' }}>
              NÃ­vel {selo.nivel}
            </span>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
              {selo.titulo}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Heart size={14} style={{ color: 'var(--color-error)', fill: 'var(--color-error)' }} />
              {selo.tagline}
            </p>
          </div>
        </div>

        {/* InformaÃ§Ãµes detalhadas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Coluna Esquerda: Requisitos e Como Conquistar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Passo a Passo */}
            <div style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1.25rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-secondary)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Passo a Passo na Plataforma
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selo.passos.map((passo, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <span style={{
                      backgroundColor: 'var(--color-secondary)',
                      color: 'white',
                      borderRadius: '50%',
                      height: '22px',
                      width: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {idx + 1}
                    </span>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0, lineHeight: '1.4' }}>
                      {passo}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gatilho PrÃ¡tico */}
            <div style={{ backgroundColor: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', padding: '1.25rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-success)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} />
                {selo.gatilho}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selo.gatilhosItens.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0, lineHeight: '1.4' }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Coluna Direita: BenefÃ­cios e Marketing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Por que vale a pena */}
            <div style={{ backgroundColor: 'rgba(10,37,64,0.02)', border: '1px solid rgba(10,37,64,0.06)', padding: '1.25rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-light)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Por que vale a pena? (BenefÃ­cios)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selo.beneficiosPilares.map((pilar, idx) => {
                  const Icon = pilar.icone;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                      <div style={{
                        padding: '0.4rem',
                        borderRadius: '6px',
                        backgroundColor: pilar.bgCor,
                        color: pilar.cor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: pilar.cor }}>
                          {pilar.titulo}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 500, margin: '2px 0 0', lineHeight: '1.4' }}>
                          {pilar.descricao}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Como Ã© divulgado */}
            <div style={{ backgroundColor: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.15)', padding: '1.25rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#7c3aed', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Newspaper size={14} />
                Como sua empresa serÃ¡ divulgada
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selo.divulgacoes.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(10,37,64,0.04)' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, margin: 0, lineHeight: '1.4' }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Grid de BenefÃ­cios Gerais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {[
          {
            icon: Scale,
            cor: 'var(--color-error)',
            bgCor: 'rgba(239,68,68,0.08)',
            titulo: 'SeguranÃ§a Legal & Fiscal',
            descricao: 'Cumpra cotas obrigatÃ³rias, reduza riscos de autuaÃ§Ãµes do MPT e use o selo como contrapartida em TACs judiciais trabalhistas.'
          },
          {
            icon: Megaphone,
            cor: '#4f46e5',
            bgCor: 'rgba(79,70,229,0.08)',
            titulo: 'Marketing de Impacto & ESG',
            descricao: 'Use a chancela do DescubraHub no seu marketing para atrair o consumidor consciente e se destacar na agenda ESG perante investidores e parceiros.'
          },
          {
            icon: Trophy,
            cor: 'var(--color-yellow)',
            bgCor: 'rgba(245,158,11,0.08)',
            titulo: 'Reconhecimento & Prioridade',
            descricao: 'Empresas selos Prata e Ouro sÃ£o indicadas prioritariamente pela Prefeitura em licitaÃ§Ãµes e parcerias, e ganham acesso a crÃ©dito social BNDES/BDMG.'
          }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="report-stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
              <div style={{
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: item.bgCor,
                color: item.cor,
                width: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                  {item.titulo}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 500, margin: '4px 0 0', lineHeight: '1.4' }}>
                  {item.descricao}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Linha do tempo de jornada */}
      <div className="report-stat-card" style={{ display: 'block', padding: '2rem', width: '100%' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
          <span className="company-card-badge" style={{ backgroundColor: 'rgba(13,92,58,0.12)', color: 'var(--color-secondary)', fontWeight: 800, margin: '0 auto', width: 'fit-content' }}>
            A Jornada da Empresa
          </span>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0.5rem 0 0' }}>
            Da IntenÃ§Ã£o ao Impacto Regional
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 500, margin: 0 }}>
            Uma linha do tempo de crescimento sustentÃ¡vel junto ao DescubraHub e Ã  juventude de Pirapora.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { img: BronzeSeal, etapa: 'Etapa 1: Apoiador', titulo: 'DoaÃ§Ã£o de Tempo', desc: 'Cadastra-se, doa mentorias e ganha visibilidade digital e comunitÃ¡ria.' },
            { img: PrataSeal,  etapa: 'Etapa 2: Ponte',    titulo: 'GeraÃ§Ã£o de Renda',    desc: 'Contrata jovem qualificado, ganha o selo fÃ­sico para vitrine e benefÃ­cios fiscais.' },
            { img: OuroSeal,   etapa: 'Etapa 3: Transformador', titulo: 'Impacto Extremo', desc: 'Inclui jovens em alta vulnerabilidade e recebe Honra ao MÃ©rito pÃºblico e visibilidade regional.' },
          ].map((ponto, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', flex: '1 1 200px' }}>
              <div style={{
                height: '76px',
                width: '76px',
                borderRadius: '50%',
                border: '2px solid rgba(10,37,64,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
                backgroundColor: '#fff',
                flexShrink: 0
              }}>
                <img src={ponto.img.src} alt={ponto.titulo} style={{ height: '60px', width: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {ponto.etapa}
                </span>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-primary)', margin: '2px 0 0' }}>
                  {ponto.titulo}
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', fontWeight: 500, margin: '4px 0 0', lineHeight: '1.3' }}>
                  {ponto.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

