'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/frontend/components/ui/LoadingScreen';
import { createClient } from '@/utils/supabase/client';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, Phone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  // Estados do Modal / Painel de Recuperação de Acesso
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<'password' | 'email'>('password');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);
  const [recoveryErrorMsg, setRecoveryErrorMsg] = useState<string | null>(null);

  // Carrega e-mail salvo se "Lembrar de mim" estiver ativo
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('descubra_remember_me');
      if (savedRemember === 'false') {
        setRememberMe(false);
      } else {
        const savedEmail = localStorage.getItem('descubra_saved_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRecoveryEmail(savedEmail);
        }
      }
    } catch {
      // Ignora erro de localStorage em ambiente com restrição
    }
  }, []);

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

      // Salva preferência de "Lembrar de mim"
      try {
        if (rememberMe) {
          localStorage.setItem('descubra_remember_me', 'true');
          localStorage.setItem('descubra_saved_email', targetEmail.trim());
        } else {
          localStorage.setItem('descubra_remember_me', 'false');
          localStorage.removeItem('descubra_saved_email');
        }
      } catch {
        // Ignora erro de localStorage
      }

      // Buscar o cargo do usuário para redirecionar corretamente e gravar cookie de sessão
      const user = signInData?.user;
      let targetPath = '/admin';
      let userRole = 'admin';

      if (user) {
        // Primeiro verifica se o usuário é um técnico ou administrador
        const { data: profile } = await supabase
          .from('tecnicos')
          .select('cargo')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.cargo === 'tecnico') {
          targetPath = '/tecnicos';
          userRole = 'tecnico';
        } else if (profile && profile.cargo === 'admin') {
          targetPath = '/admin';
          userRole = 'admin';
        } else {
          // Verifica se é uma empresa parceira cadastrada
          const { data: company } = await supabase
            .from('empresas_parceiras')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (company) {
            targetPath = '/empresa';
            userRole = 'empresa';
          } else {
            // Verifica se é um Jovem Aprendiz
            const { data: jovem } = await supabase
              .from('jovens')
              .select('id')
              .eq('id', user.id)
              .single();
            
            if (jovem) {
              targetPath = '/jovem';
              userRole = 'jovem';
            }
          }
        }

        // Define o cookie de perfil para o middleware validar rapidamente
        document.cookie = `descubra_user_role=${userRole}; path=/; max-age=604800; SameSite=Lax`;
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

  const handleOpenRecovery = (e: React.MouseEvent) => {
    e.preventDefault();
    setRecoveryEmail(email.trim());
    setRecoverySuccessMsg(null);
    setRecoveryErrorMsg(null);
    setShowRecoveryModal(true);
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySuccessMsg(null);
    setRecoveryErrorMsg(null);

    if (!recoveryEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      setRecoveryErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setRecoveryErrorMsg('Não foi possível enviar o e-mail de redefinição. Verifique o endereço digitado.');
      } else {
        setRecoverySuccessMsg(`Enviamos um link de redefinição para "${recoveryEmail}". Verifique sua caixa de entrada e spam.`);
      }
    } catch {
      setRecoveryErrorMsg('Erro inesperado ao processar recuperação de senha. Tente novamente mais tarde.');
    } finally {
      setRecoveryLoading(false);
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
              <label className="checkbox-label" htmlFor="remember-me" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  id="remember-me" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Lembrar de mim
              </label>
              <button 
                type="button" 
                className="forgot-password-link" 
                onClick={handleOpenRecovery}
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: 'var(--color-primary)' }}
              >
                Esqueceu a senha ou o e-mail?
              </button>
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

      {/* MODAL DE RECUPERAÇÃO DE ACESSO (SENHA / E-MAIL) */}
      {showRecoveryModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRecoveryModal(false);
          }}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={22} color="var(--color-secondary)" />
                Recuperação de Acesso
              </h2>
              <button 
                type="button" 
                onClick={() => setShowRecoveryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* ABAS */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { setRecoveryTab('password'); setRecoveryErrorMsg(null); setRecoverySuccessMsg(null); }}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: recoveryTab === 'password' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                  fontWeight: recoveryTab === 'password' ? 600 : 400,
                  color: recoveryTab === 'password' ? 'var(--color-primary)' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Recuperar Senha
              </button>
              <button
                type="button"
                onClick={() => { setRecoveryTab('email'); setRecoveryErrorMsg(null); setRecoverySuccessMsg(null); }}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: recoveryTab === 'email' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                  fontWeight: recoveryTab === 'email' ? 600 : 400,
                  color: recoveryTab === 'email' ? 'var(--color-primary)' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Esqueci meu E-mail
              </button>
            </div>

            {/* CONTEÚDO DA ABA RECUPERAR SENHA */}
            {recoveryTab === 'password' && (
              <div>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Informe seu endereço de e-mail cadastrado. Enviaremos um link de redefinição para que você possa criar uma nova senha.
                </p>

                {recoverySuccessMsg && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>{recoverySuccessMsg}</div>
                  </div>
                )}

                {recoveryErrorMsg && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>{recoveryErrorMsg}</div>
                  </div>
                )}

                {!recoverySuccessMsg && (
                  <form onSubmit={handleSendPasswordReset}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label htmlFor="recovery-email-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                        Seu E-mail Cadastrado
                      </label>
                      <input
                        id="recovery-email-input"
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="exemplo@email.com"
                        className="form-control"
                        required
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowRecoveryModal(false)}
                        className="btn"
                        style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={recoveryLoading}
                        className="btn btn-primary"
                        style={{ flex: 1.5 }}
                      >
                        {recoveryLoading ? 'Enviando link...' : 'Enviar Link'}
                      </button>
                    </div>
                  </form>
                )}

                {recoverySuccessMsg && (
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    Voltar ao Login
                  </button>
                )}
              </div>
            )}

            {/* CONTEÚDO DA ABA ESQUECI MEU E-MAIL */}
            {recoveryTab === 'email' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.85rem', marginBottom: '1rem' }}>
                  <HelpCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.5, margin: 0 }}>
                    Para garantir a proteção e sigilo de dados socioassistenciais, o endereço de e-mail de acesso está vinculado ao cadastro do seu <strong>CPF</strong> no sistema do Programa Descubra.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  <div>
                    <strong>🧑‍🎓 Sou Jovem Aprendiz / Aluno:</strong>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#64748b' }}>
                      Entre em contato com o técnico de referência do seu <strong>CRAS, CREAS ou Entidade Formadora</strong>. O técnico pode consultar seu e-mail cadastrado ou solicitar a atualização imediata.
                    </p>
                  </div>
                  <div>
                    <strong>🏢 Sou Empresa Parceira ou Técnico:</strong>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#64748b' }}>
                      Contate a coordenação do Programa Descubra através dos canais institucionais informando seu CNPJ ou matrícula profissional.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Entendido, voltar ao login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
