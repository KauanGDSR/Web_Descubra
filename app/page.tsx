'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ===================== HEADER =====================
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`} id="main-header">
      <div className="container">
        <div className="logo-wrapper">
          <a href="#" aria-label="Ir para o topo - Governo de Minas Gerais" style={{ display: 'flex', alignItems: 'center' }}>
            <svg className="logo-gov" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logomarca do Governo de Minas Gerais">
              <polygon points="5,35 25,5 45,35" fill="#EF4444" stroke="#EF4444" strokeWidth="2" />
              <text x="55" y="18" fill="#0D5C3A" fontFamily="'Outfit',sans-serif" fontWeight="800" fontSize="12px">GOVERNO</text>
              <text x="55" y="32" fill="#0D5C3A" fontFamily="'Outfit',sans-serif" fontWeight="400" fontSize="11px">DE MINAS GERAIS</text>
            </svg>
          </a>
          <div className="logo-divider" role="presentation" />
          <a href="#" className="logo-descubra" aria-label="Ir para o topo - Programa Descubra">Descubra<span>!</span></a>
        </div>
        <nav aria-label="Navegação Principal">
          <button className="btn-menu-toggle" id="menu-toggle" aria-expanded={menuOpen} aria-controls="nav-menu" aria-label="Abrir menu de navegação" onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'open' : ''}`} id="nav-menu">
            <li><a href="#about" className="nav-link" onClick={() => setMenuOpen(false)}>Quem Somos</a></li>
            <li><a href="#stats" className="nav-link" onClick={() => setMenuOpen(false)}>Descubra em Números</a></li>
            <li><a href="#join" className="nav-link" onClick={() => setMenuOpen(false)}>Como Aderir</a></li>
            <li>
              <Link href="/login" className="nav-link btn-outline" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '2px solid var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Entrar
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

// ===================== HERO =====================
const SLIDES = ['/assets/hero-img.png', '/assets/slide-2.png', '/assets/bg-login.png'];
const SLIDE_ALTS = ['Jovem aprendiz trabalhando', 'Sala de aula técnica', 'Ambiente corporativo'];

function HeroSection() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showSlide = (idx: number) => setCurrent(idx);
  const startInterval = () => { intervalRef.current = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 3000); };

  useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" id="home">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">Transformando<br />Barreiras em<br /><span>Oportunidades</span></h1>
          <p className="hero-subtitle">O Programa Descubra abre caminhos reais para o mundo do trabalho protegido para adolescentes e jovens em Minas Gerais.</p>
          <div className="hero-actions">
            <a href="#join" className="btn btn-primary" id="cta-hero">Faça parte da nossa rede</a>
            <button className="btn-play-wrapper" id="btn-video" aria-label="Conheça o Programa">
              <span className="btn-play-circle" role="presentation">
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13.3333 8L1.33333 14.9282L1.33333 1.0718L13.3333 8Z"/></svg>
              </span>
              Conheça o Programa
            </button>
          </div>
        </div>
        <div className="hero-image-container">
          <div className="hero-collage-wrapper slideshow-container">
            <div className="hero-slides" style={{ position: 'relative', width: '100%', height: '100%' }}>
              {SLIDES.map((src, i) => (
                <Image key={src} src={src} alt={SLIDE_ALTS[i]} fill sizes="(max-width: 768px) 100vw, 50vw" priority={i === 0} className={`hero-slide ${i === current ? 'active' : ''}`} style={{ objectFit: 'cover' }} />
              ))}
            </div>
            <div className="slideshow-indicators">
              {SLIDES.map((_, i) => (
                <span key={i} className={`slide-dot ${i === current ? 'active' : ''}`} onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); showSlide(i); startInterval(); }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===================== ABOUT =====================
function AboutSection() {
  return (
    <section className="about section-padding" id="about">
      <div className="container">
        <div className="about-collage">
          <div className="about-collage-main">
            <span className="about-collage-tag">Público Alvo</span>
            <h3 className="about-collage-title">Juventude Prioritária de 14 a 21 anos</h3>
            <ul className="about-list">
              {['Egressos de medidas socioeducativas', 'Jovens em acolhimento institucional', 'Resgatados do trabalho infantil', 'Vulnerabilidade socioeconômica extrema'].map((item) => (
                <li key={item} className="about-list-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="about-content">
          <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <span className="section-tag">Quem Somos</span>
            <h2 className="section-title">Cooperação que gera <span>futuro</span></h2>
          </div>
          <div className="about-content-text">
            <p>O <strong>Programa Descubra</strong> é uma rede inédita de cooperação interinstitucional em Minas Gerais. Unimos forças governamentais, judiciais e da sociedade civil para promover caminhos de inclusão social e cidadania ativa.</p>
            <p>Através da oferta de cursos de qualificação e da inserção assistida em vagas de <strong>aprendizagem profissional protegida</strong>, o programa reconecta jovens historicamente invisibilizados ao direito à educação prática, renda e autonomia.</p>
          </div>
          <span className="about-partner-logos-title">Órgãos Iniciadores e Apoiadores</span>
          <div className="about-partners-strip">
            {['MPMG', 'TRT-MG', 'SEDESE'].map((name) => (
              <svg key={name} className="about-partner-logo" viewBox="0 0 100 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-label={`Logo ${name}`}>
                <text x="5" y="22" fontFamily="'Outfit',sans-serif" fontWeight="900" fontSize="16px">{name}</text>
              </svg>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===================== STATS =====================
const STATS = [
  { target: 1600, label: 'Adolescentes e jovens atendidos', icon: 'orange' },
  { target: 25, label: 'Empresas parceiras ativas', icon: 'sky' },
  { target: 25, label: 'Entidades formadoras parceiras', icon: 'yellow' },
  { target: 6400, label: 'Pessoas indiretamente beneficiadas', icon: 'pink' },
];

function StatsSection() {
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [animated, setAnimated] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated) {
        setAnimated(true);
        STATS.forEach((stat, i) => {
          const duration = 2000;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease = progress * (2 - progress);
            setCounts((prev) => { const next = [...prev]; next[i] = Math.floor(ease * stat.target); return next; });
            if (progress < 1) requestAnimationFrame(tick);
            else setCounts((prev) => { const next = [...prev]; next[i] = stat.target; return next; });
          };
          requestAnimationFrame(tick);
        });
      }
    }, { threshold: 0.2 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [animated]);

  const fmt = (n: number, target: number) => (target >= 1000 ? `+ ${n.toLocaleString('pt-BR')}` : `+ ${n}`);

  return (
    <section className="stats section-padding" id="stats" ref={sectionRef}>
      <div className="container">
        <div className="section-title-wrapper">
          <span className="section-tag" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-yellow)' }}>Resultados</span>
          <h2 className="section-title" style={{ color: 'white' }}>O Descubra em <span>Números</span></h2>
        </div>
        <div className="stats-grid">
          {STATS.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon-wrapper stat-icon-${stat.icon}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="stat-number">{fmt(counts[i], stat.target)}</div>
              <div className="stat-text">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===================== JOIN =====================
const JOIN_CARDS = [
  { title: 'Empresas', desc: 'Ofereça vagas de Jovem Aprendiz, Estágio e CLT(+18), promovendo a inclusão produtiva.', cls: 'join-card-1', iconCls: 'join-icon-1', btn: 'btn-primary' },
  { title: 'Municípios', desc: 'Fortaleça e articule a rede municipal de proteção infantojuvenil em seu território.', cls: 'join-card-2', iconCls: 'join-icon-2', btn: 'btn-secondary' },
  { title: 'Instituições Parceiras', desc: 'Oferte cursos e oficinas de qualificação profissional alinhados às diretrizes do programa.', cls: 'join-card-3', iconCls: 'join-icon-3', btn: 'btn-outline' },
];

function JoinSection() {
  return (
    <section className="join section-padding" id="join">
      <div className="container">
        <div className="section-title-wrapper">
          <span className="section-tag">Adesão</span>
          <h2 className="section-title">Como fazer parte do <span>programa</span></h2>
        </div>
        <div className="join-grid">
          {JOIN_CARDS.map((card) => (
            <div key={card.title} className={`join-card ${card.cls}`}>
              <div className={`join-icon-box ${card.iconCls}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <h3 className="join-card-title">{card.title}</h3>
              <p className="join-card-desc">{card.desc}</p>
              <a href="mailto:contato@programadescubra.mg.gov.br" className={`btn ${card.btn} join-action`}>Saiba como</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===================== FOOTER =====================
const PARTNERS = ['MPMG', 'TRT-MG', 'SEDESE', 'SENAI', 'SENAC', 'CIEE', 'ASSPROM', 'REDE CIDADÃ'];

function Footer() {
  return (
    <footer className="footer" id="contacts">
      <div className="container">
        <div className="footer-top">
          <div className="footer-partners">
            <h2 className="footer-partners-title">Cooperação Interinstitucional</h2>
            <div className="footer-partners-grid">
              {PARTNERS.map((name) => (
                <div key={name} className="footer-partner-card">
                  <svg className="footer-partner-logo-svg" viewBox="0 0 100 40">
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit',sans-serif" fontWeight="800" fontSize="14px">{name}</text>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-logo-descubra">Programa Descubra<span>!</span></div>
          <p className="footer-copy">© 2026 Programa Descubra! - Cooperação Interinstitucional de Minas Gerais. Todos os direitos reservados.</p>
          <div className="footer-socials">
            {[{ label: 'LinkedIn', href: 'https://linkedin.com' }, { label: 'Instagram', href: 'https://instagram.com' }, { label: 'YouTube', href: 'https://youtube.com' }].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label={`Acessar ${s.label}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ===================== MAIN =====================
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <StatsSection />
        <JoinSection />
      </main>
      <Footer />
    </>
  );
}
