'use client';

import React, { useEffect } from 'react';

export type JoinCategory = 'empresas' | 'municipios' | 'instituicoes';

interface Step {
  num: string;
  title: string;
  desc: string;
}

interface Benefit {
  title: string;
  desc: string;
  icon: string;
}

interface ModalContent {
  id: JoinCategory;
  categoryLabel: string;
  themeColor: 'orange' | 'secondary' | 'sky';
  badgeBg: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  leadText: string;
  stepsTitle: string;
  steps: Step[];
  benefitsTitle: string;
  benefits: Benefit[];
  requirements: string[];
  ctaLabel: string;
  emailSubject: string;
  emailBody: string;
}

const MODAL_DATA: Record<JoinCategory, ModalContent> = {
  empresas: {
    id: 'empresas',
    categoryLabel: 'Empresas & Empregadores',
    themeColor: 'orange',
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    badgeColor: 'var(--color-orange)',
    title: 'Adesão de Empresas ao DescubraHub',
    subtitle: 'Inclusão produtiva com conformidade legal, incentivos tributários e alto impacto social.',
    leadText:
      'O DescubraHub conecta sua organização a adolescentes e jovens em vulnerabilidade social, oferecendo suporte técnico especializado para contratação protegida, cumprimento de cotas e formação profissional.',
    stepsTitle: 'Como funciona o processo de contratação',
    steps: [
      {
        num: '1',
        title: 'Manifestação de Interesse e Levantamento de Vagas',
        desc: 'Sua empresa preenche o cadastro informando a quantidade prevista de vagas (Aprendizagem, Estágio ou CLT +18) e as áreas de atuação corporativa ou operacional.',
      },
      {
        num: '2',
        title: 'Alinhamento com a Entidade Formadora',
        desc: 'A equipe do programa conecta a empresa à entidade qualificadora parceira (como Sistema S, CIEE, ASSPROM, etc.) para estruturação do curso teórico obrigatório de aprendizagem.',
      },
      {
        num: '3',
        title: 'Seleção Humanizada e Encaminhamento Assistido',
        desc: 'Os jovens acompanhados pela rede pública socioassistencial são indicados e passam por processos seletivos acolhedores e orientados ao seu perfil e potencial.',
      },
      {
        num: '4',
        title: 'Contratação Protegida e Tutoria Contínua',
        desc: 'Formalização do contrato especial de aprendizagem, com designação de orientador interno na empresa e acompanhamento psicossocial conjunto pela rede.',
      },
    ],
    benefitsTitle: 'Vantagens para a sua Organização',
    benefits: [
      {
        icon: 'legal',
        title: 'Segurança Jurídica & Cota Legal',
        desc: 'Atendimento prioritário às exigências do Art. 429 da CLT com respaldo formal do MPMG, TRT-MG e Ministério do Trabalho.',
      },
      {
        icon: 'tax',
        title: 'Incentivos Financeiros',
        desc: 'Recolhimento de apenas 2% de FGTS (contra 8% convencionais), sem incidência de aviso prévio e isenção da multa rescisória de 40%.',
      },
      {
        icon: 'esg',
        title: 'Agenda ESG & Cidadania Corporativa',
        desc: 'Pontuação positiva em governança social com geração de impacto socioeconômico mensurável e reconhecimento público.',
      },
      {
        icon: 'talent',
        title: 'Desenvolvimento de Talentos',
        desc: 'Jovens altamente motivados que aprendem a rotina e cultura da empresa simultaneamente à qualificação técnica.',
      },
    ],
    requirements: [
      'CNPJ regular e ambiente corporativo em conformidade com normas de saúde e segurança',
      'Designação de um colaborador responsável para tutoria e acompanhamento do jovem',
      'Cumprimento da jornada de aprendizagem compatível com a frequência escolar (4h a 6h diárias)',
      'Garantia de remuneração com base no salário mínimo/hora e direitos trabalhistas protegidos',
    ],
    ctaLabel: 'Quero Oferecer Vagas na Minha Empresa',
    emailSubject: '[Adesão Empresa] Manifestação de Interesse - DescubraHub',
    emailBody:
      'Olá,%20gostaria%20de%20solicitar%20mais%20informações%20para%20a%20adesão%20da%20minha%20empresa%20ao%20Programa%20Descubra.%0D%0A%0D%0ANome%20da%20Empresa:%20%0D%0ACNPJ:%20%0D%0AMunicípio:%20%0D%0ANúmero%20estimado%20de%20vagas:%20%0D%0ANome%20do%20Contato:%20%0D%0ATelefone:%20',
  },
  municipios: {
    id: 'municipios',
    categoryLabel: 'Municípios & Gestão Pública',
    themeColor: 'secondary',
    badgeBg: 'rgba(13, 92, 58, 0.12)',
    badgeColor: 'var(--color-secondary)',
    title: 'Adesão de Municípios ao DescubraHub',
    subtitle: 'Fortalecimento da rede socioassistencial, articulação intersetorial e garantia de direitos da juventude.',
    leadText:
      'A adesão municipal ao DescubraHub institui um pacto intersetorial entre a Prefeitura e as instituições de justiça, integrando CRAS, CREAS e Conselhos Tutelares para inserir jovens em vulnerabilidade no mercado de trabalho protegido.',
    stepsTitle: 'Passo a passo para implementação no município',
    steps: [
      {
        num: '1',
        title: 'Celebração do Termo de Adesão Técnica',
        desc: 'O Prefeito ou gestor municipal formaliza a cooperação técnica interinstitucional com o Comitê Gestor Estadual do Descubra (MPMG, SEDESE e TRT-MG).',
      },
      {
        num: '2',
        title: 'Criação do Comitê Intersetorial Local',
        desc: 'Articulação entre Assistência Social (CRAS/CREAS), Educação, Saúde, Desenvolvimento Econômico e Conselho Tutelar para alinhamento de fluxos de atendimento.',
      },
      {
        num: '3',
        title: 'Mapeamento e Cadastramento no DescubraHub',
        desc: 'Técnicos municipais utilizam a plataforma para georreferenciar e cadastrar adolescentes e jovens de 14 a 21 anos em situação de risco prioritário.',
      },
      {
        num: '4',
        title: 'Sensibilização e Mobilização do Comércio Local',
        desc: 'Engajamento de empresários, indústrias e entidades formadoras da cidade para criação e destinação de vagas aos jovens cadastrados.',
      },
    ],
    benefitsTitle: 'Vantagens para a Gestão Municipal',
    benefits: [
      {
        icon: 'community',
        title: 'Queda na Vulnerabilidade & Reincidência',
        desc: 'Rompimento de ciclos de vulnerabilidade e diminuição substancial dos índices de reincidência infracional juvenil no território.',
      },
      {
        icon: 'justice',
        title: 'Articulação Direta com Justiça e MPMG',
        desc: 'Canal estruturado e preventivo com as Promotorias de Justiça da Infância e Varas do Trabalho, agilizando fluxos de proteção.',
      },
      {
        icon: 'data',
        title: 'Gestão Inteligente por Dados Georreferenciados',
        desc: 'Acesso total à plataforma digital com mapas de calor, perfil de risco social e relatórios analíticos para políticas públicas assertivas.',
      },
      {
        icon: 'suas',
        title: 'Fortalecimento das Equipes do SUAS',
        desc: 'Capacitação contínua e metodologia testada para assistentes sociais, psicólogos e orientadores de medidas socioeducativas.',
      },
    ],
    requirements: [
      'Assinatura do Termo de Adesão pelo Chefe do Poder Executivo ou autoridade delegada',
      'Designação de ponto focal na Secretaria Municipal de Assistência Social ou Desenvolvimento',
      'Compromisso com o acompanhamento familiar contínuo através da rede socioassistencial (CRAS/CREAS)',
      'Participação das equipes técnicas nas oficinas e alinhamentos metodológicos do Programa',
    ],
    ctaLabel: 'Solicitar Termo de Adesão para o Município',
    emailSubject: '[Adesão Município] Solicitação de Termo de Cooperação - DescubraHub',
    emailBody:
      'Olá,%20represento%20o%20poder%20público%20municipal%20e%20gostaria%20de%20iniciar%20os%20trâmites%20para%20adesão%20ao%20Programa%20Descubra.%0D%0A%0D%0AMunicípio:%20%0D%0AÓrgão/Secretaria:%20%0D%0ANome%20do%20Responsável:%20%0D%0ACargo:%20%0D%0ATelefone%20Institucional:%20',
  },
  instituicoes: {
    id: 'instituicoes',
    categoryLabel: 'Entidades Formadoras & Sociedade Civil',
    themeColor: 'sky',
    badgeBg: 'rgba(14, 165, 233, 0.12)',
    badgeColor: 'var(--color-sky)',
    title: 'Adesão de Instituições Parceiras',
    subtitle: 'Oferta de qualificação técnico-profissional alinhada às demandas reais e com suporte pedagógico integrado.',
    leadText:
      'As instituições de formação profissionalizante e organizações da sociedade civil são o alicerce pedagógico do Descubra, preparando os jovens para o mercado através de formação teórica compatível com a realidade do trabalho protegido.',
    stepsTitle: 'Como atua a instituição qualificadora parceira',
    steps: [
      {
        num: '1',
        title: 'Comprovação de Credenciamento no CNAP',
        desc: 'A entidade formadora valida seu credenciamento no Cadastro Nacional de Aprendizagem Profissional do Ministério do Trabalho e Emprego.',
      },
      {
        num: '2',
        title: 'Planejamento Pedagógico Humanizado',
        desc: 'Adequação da matriz de cursos técnicos às necessidades reais do mercado regional, contemplando competências socioemocionais e cidadania.',
      },
      {
        num: '3',
        title: 'Formação de Turmas e Matrícula Assistida',
        desc: 'Acolhimento dos jovens indicados pela rede socioassistencial com suporte inicial intensivo para adaptação à rotina de estudos e trabalho.',
      },
      {
        num: '4',
        title: 'Monitoramento Integrado de Frequência e Evasão',
        desc: 'Acompanhamento conjunto do rendimento do aprendiz com as empresas contratantes e com os técnicos da rede pública de proteção.',
      },
    ],
    benefitsTitle: 'Vantagens para a Entidade Parceira',
    benefits: [
      {
        icon: 'impact',
        title: 'Impacto Social de Alta Relevância',
        desc: 'Atendimento a adolescentes que mais precisam de oportunidade formativa, gerando transformação comprovada de trajetórias.',
      },
      {
        icon: 'network',
        title: 'Sinergia Direta com Empresas Contratantes',
        desc: 'Acesso a ampla rede de empresas parceiras com demanda imediata para contratação dos aprendizes matriculados.',
      },
      {
        icon: 'seal',
        title: 'Reconhecimento & Parceria Governamental',
        desc: 'Participação oficial em um dos maiores programas de inclusão de Minas Gerais com chancela do MPMG, TRT-MG e SEDESE.',
      },
      {
        icon: 'support',
        title: 'Rede de Apoio Multidisciplinar',
        desc: 'Suporte dos serviços sociais e de psicologia do município para superação de vulnerabilidades que impactam o aprendizado.',
      },
    ],
    requirements: [
      'Inscrição ativa no CNAP (Cadastro Nacional de Aprendizagem Profissional) e no CMDCA local',
      'Estrutura física e tecnológica compatível para realização das aulas teóricas',
      'Corpo docente capacitado e metodologia pedagógica voltada para jovens em vulnerabilidade',
      'Compromisso com o envio periódico de relatórios de frequência e desempenho pedagógico',
    ],
    ctaLabel: 'Cadastrar Instituição Formadora no Programa',
    emailSubject: '[Adesão Instituição] Credenciamento de Entidade Formadora - DescubraHub',
    emailBody:
      'Olá,%20represento%20uma%20entidade%20formadora%20/%20instituição%20de%20ensino%20e%20gostaria%20de%20integrar%20a%20rede%20de%20parceiros%20do%20DescubraHub.%0D%0A%0D%0ANome%20da%20Instituição:%20%0D%0ACNPJ:%20%0D%0ANº%20CNAP:%20%0D%0ACursos%20Oferecidos:%20%0D%0AMunicípio(s)%20de%20Atuação:%20%0D%0ANome%20do%20Responsável:%20%0D%0ATelefone:%20',
  },
};

function BenefitIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'legal':
    case 'justice':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'tax':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'esg':
    case 'community':
    case 'impact':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case 'talent':
    case 'suas':
    case 'support':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'data':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'network':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case 'seal':
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
  }
}

interface JoinModalProps {
  isOpen: boolean;
  category: JoinCategory | null;
  onClose: () => void;
}

export default function JoinModal({ isOpen, category, onClose }: JoinModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  const data = MODAL_DATA[category];
  const mailtoLink = `mailto:contato@programadescubra.mg.gov.br?subject=${encodeURIComponent(
    data.emailSubject
  )}&body=${data.emailBody}`;

  return (
    <div
      className="join-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
    >
      <div
        className={`join-modal-dialog theme-${data.themeColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de destaque com a cor temática */}
        <div className={`join-modal-topbar bar-${data.themeColor}`} />

        {/* Botão de Fechar */}
        <button
          type="button"
          className="join-modal-close"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Cabeçalho do Pop-up */}
        <div className="join-modal-header">
          <div className="join-modal-meta">
            <span
              className="join-modal-badge"
              style={{ backgroundColor: data.badgeBg, color: data.badgeColor }}
            >
              {data.categoryLabel}
            </span>
          </div>
          <h2 id="join-modal-title" className="join-modal-title">
            {data.title}
          </h2>
          <p className="join-modal-subtitle">{data.subtitle}</p>
        </div>

        {/* Corpo rolável com o conteúdo detalhado */}
        <div className="join-modal-body">
          {/* Caixa de introdução */}
          <div className={`join-modal-lead-box lead-box-${data.themeColor}`}>
            <div className="lead-box-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p className="lead-box-text">{data.leadText}</p>
          </div>

          {/* Passo a Passo */}
          <div className="join-modal-section">
            <h3 className="join-modal-section-title">
              <span className="section-title-bullet" />
              {data.stepsTitle}
            </h3>
            <div className="join-modal-steps">
              {data.steps.map((step) => (
                <div key={step.num} className="join-modal-step-item">
                  <div className={`join-modal-step-num num-${data.themeColor}`}>
                    {step.num}
                  </div>
                  <div className="join-modal-step-content">
                    <h4 className="join-modal-step-title">{step.title}</h4>
                    <p className="join-modal-step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Principais Benefícios */}
          <div className="join-modal-section">
            <h3 className="join-modal-section-title">
              <span className="section-title-bullet" />
              {data.benefitsTitle}
            </h3>
            <div className="join-modal-benefits-grid">
              {data.benefits.map((benefit, idx) => (
                <div key={idx} className="join-modal-benefit-card">
                  <div className={`benefit-icon-wrapper icon-wrap-${data.themeColor}`}>
                    <BenefitIcon icon={benefit.icon} />
                  </div>
                  <div>
                    <h4 className="benefit-card-title">{benefit.title}</h4>
                    <p className="benefit-card-desc">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requisitos e Compromissos */}
          <div className="join-modal-section">
            <h3 className="join-modal-section-title">
              <span className="section-title-bullet" />
              Diretrizes & Compromissos de Adesão
            </h3>
            <ul className="join-modal-reqs-list">
              {data.requirements.map((req, idx) => (
                <li key={idx} className="join-modal-req-item">
                  <div className="req-check-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rodapé com botões de ação e aviso legal */}
        <div className="join-modal-footer">
          <div className="join-modal-footer-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Iniciativa interinstitucional com MPMG, TRT-MG, SEDESE e parceiros.
          </div>
          <div className="join-modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}
            >
              Fechar
            </button>
            <a
              href={mailtoLink}
              className={`btn ${data.themeColor === 'orange' ? 'btn-primary' : data.themeColor === 'secondary' ? 'btn-secondary' : 'btn-primary'}`}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.9rem',
                backgroundColor:
                  data.themeColor === 'sky'
                    ? 'var(--color-sky)'
                    : data.themeColor === 'secondary'
                    ? 'var(--color-secondary)'
                    : 'var(--color-orange)',
                color: '#fff',
                border: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {data.ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
