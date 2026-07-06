'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState('/admin');
  // Acesso Rápido só está disponível em desenvolvimento
  const isDev = process.env.NODE_ENV === 'development';

  const loginWithCredentials = async (targetEmail: string, targetPassword: string) => {
    setIsLoggingIn(true);
    setAuthErrorMsg(null);
    setErrors({});
    
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: targetEmail.trim(),
        password: targetPassword
      });
      
      if (error) {
        setIsLoggingIn(false);
        setAuthErrorMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
        return;
      }

      // Buscar o cargo do usuário para redirecionar corretamente
      const user = signInData?.user;
      let targetPath = '/admin';
      if (user) {
        // Primeiro verifica se o usuário é um técnico ou administrador
        const { data: profile } = await supabase
          .from('tecnicos')
          .select('cargo')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.cargo === 'tecnico') {
          targetPath = '/tecnicos';
        } else if (profile && profile.cargo === 'admin') {
          targetPath = '/admin';
        } else {
          // Caso contrário, verifica se é uma empresa parceira cadastrada
          const { data: company } = await supabase
            .from('empresas_parceiras')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (company) {
            targetPath = '/empresa';
          } else {
            // Verifica se é um Jovem Aprendiz
            const { data: jovem } = await supabase
              .from('jovens')
              .select('id')
              .eq('id', user.id)
              .single();
            
            if (jovem) {
              targetPath = '/jovem';
            }
          }
        }
      }
      
      setRedirectPath(targetPath);
      // Permite que o componente LoadingScreen execute a animação completa antes do redirecionamento
    } catch (err: any) {
      setIsLoggingIn(false);
      setAuthErrorMsg('Erro inesperado ao realizar login.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = true;
    if (!password || password.length < 4) newErrors.password = true;
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    
    await loginWithCredentials(email, password);
  };

  const handleQuickAccess = async (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('123456');
    await loginWithCredentials(quickEmail, '123456');
  };

  const handleForgot = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErrors({ email: true }); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        setAuthErrorMsg('Erro ao enviar e-mail de recuperação. Verifique o e-mail informado.');
      } else {
        setAuthErrorMsg(null);
        alert(`Se "${email}" estiver cadastrado, você receberá um link de recuperação de senha em instantes.`);
      }
    } catch {
      setAuthErrorMsg('Erro inesperado ao solicitar recuperação de senha.');
    }
  };

  return (
    <>
      {isLoggingIn && (
        <LoadingScreen durationMs={3000} onComplete={() => router.push(redirectPath)} />
      )}
      <div className="login-container">
      {/* FORM PANEL */}
      <main className="login-panel-form">
        <nav className="login-header-nav" aria-label="Navegação de retorno">
          <Link href="/" className="btn-back-home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Voltar para o portal
          </Link>
        </nav>

        <div className="login-form-wrapper">
          <div className="login-logo">
            <Link href="/" className="logo-descubra" aria-label="Ir para a Home Page do Programa Descubra">
              Descubra<span>!</span>
            </Link>
          </div>

          <div className="login-intro">
            <h1 className="login-title">Acesse o Portal</h1>
            <p className="login-subtitle">Entre com seus dados para acessar seu perfil de usuário</p>
          </div>

          {authErrorMsg && (
            <div style={{ color: 'var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 500, textAlign: 'center' }}>
              {authErrorMsg}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">E-mail</label>
              <input
                type="email" id="login-email" className="form-control"
                placeholder="Digite seu e-mail" value={email} required
                onChange={(e) => { setEmail(e.target.value); setErrors((err) => ({ ...err, email: false })); }}
                style={{ borderColor: errors.email ? 'var(--color-error)' : undefined }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showPw ? 'text' : 'password'} id="login-password" className="form-control"
                  placeholder="Digite sua senha" value={password} required
                  onChange={(e) => { setPassword(e.target.value); setErrors((err) => ({ ...err, password: false })); }}
                  style={{ borderColor: errors.password ? 'var(--color-error)' : undefined, paddingRight: '3rem' }}
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Esconder senha' : 'Mostrar senha'}>
                  {showPw ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="checkbox-label" htmlFor="remember-me">
                <input type="checkbox" id="remember-me" />
                Lembrar de mim
              </label>
              <a href="#" className="forgot-password-link" onClick={handleForgot}>Esqueci a senha</a>
            </div>

            <button type="submit" className="btn btn-primary" id="btn-login-submit" style={{ width: '100%', borderRadius: 'var(--border-radius-sm)' }}>
              Entrar no Sistema
            </button>
          </form>

          {/* ACESSO RÁPIDO — visível apenas em ambiente de desenvolvimento */}
          {isDev && (
            <div className="login-quick-access">
              <div className="quick-access-divider">
                <span>Acesso Rápido (Dev)</span>
              </div>
              <div className="quick-access-buttons">
                <button
                  type="button"
                  className="btn-quick-login"
                  onClick={() => handleQuickAccess('kauan@tecnico.com')}
                  title="Acessar como Administrador (kauan@tecnico.com)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="quick-access-role">Admin</span>
                  <span className="quick-access-user">Kauan Gabriel</span>
                </button>

                <button
                  type="button"
                  className="btn-quick-login"
                  onClick={() => handleQuickAccess('gildo@tecnico.com')}
                  title="Acessar como Técnico de Referência (gildo@tecnico.com)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v2h.01"/><path d="M19 12v2h.01"/></svg>
                  <span className="quick-access-role">Técnico</span>
                  <span className="quick-access-user">Gildo Alves</span>
                </button>

                <button
                  type="button"
                  className="btn-quick-login"
                  onClick={() => handleQuickAccess('roberto@five.com')}
                  title="Acessar como Empresa Parceira (roberto@five.com)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><line x1="15" y1="16" x2="15" y2="22"/><line x1="9" y1="8" x2="9.01" y2="8"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="15" y1="8" x2="15.01" y2="8"/><line x1="15" y1="12" x2="15.01" y2="12"/></svg>
                  <span className="quick-access-role">Empresa</span>
                  <span className="quick-access-user">Five for All</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* IMAGE PANEL */}
      <div
        className="login-panel-image"
        style={{ backgroundImage: "url('/assets/bg-login.png')" }}
        role="img"
        aria-label="Jovem aprendiz focada no computador"
      >
        <div className="login-image-cutout" role="presentation" />
        <div className="login-panel-content">
          <blockquote className="login-quote">
            A aprendizagem é o caminho que transforma vulnerabilidade em protagonismo juvenil.
          </blockquote>
          <cite className="login-quote-author">Programa Descubra! MG</cite>
        </div>
      </div>
    </div>
    </>
  );
}
