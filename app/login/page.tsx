'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/frontend/components/ui/LoadingScreen';
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

  const loginWithCredentials = async (targetEmail: string, targetPassword: string) => {
    setIsLoggingIn(true);
    setAuthErrorMsg(null);
    setErrors({});
    const startTime = Date.now();
    const MIN_ANIMATION_MS = 2200;
    
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
          // Verifica se é uma empresa parceira cadastrada
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
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_ANIMATION_MS - elapsed);

      setTimeout(() => {
        window.location.href = targetPath;
      }, remaining);

    } catch (err: any) {
      setIsLoggingIn(false);
      setAuthErrorMsg('Erro inesperado ao realizar login.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = true;
    if (!password) newErrors.password = true;
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    
    await loginWithCredentials(email, password);
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
        <LoadingScreen durationMs={2200} />
      )}
      <div 
        className="login-container"
        style={isLoggingIn ? { display: 'none' } : undefined}
      >
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
            <Link href="/" className="logo-descubra" aria-label="Ir para a Home Page do DescubraHub">
              DescubraHub
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
          <cite className="login-quote-author">DescubraHub MG</cite>
        </div>
      </div>
    </div>
    </>
  );
}
