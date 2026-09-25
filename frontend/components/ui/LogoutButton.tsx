'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface LogoutButtonProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Botão de Logout que invalida a sessão do Supabase antes de redirecionar.
 * Deve ser usado em todos os headers de painéis protegidos (admin, técnicos, empresa, jovem).
 */
export default function LogoutButton({ className, style, children }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
      style={style}
      aria-label="Sair do sistema"
    >
      {children}
    </button>
  );
}
