import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware de Autenticação — Proteção de Rotas Privadas no Servidor
 *
 * Interceta TODAS as requisições às rotas protegidas (/admin, /tecnicos,
 * /empresa, /jovem) antes de qualquer renderização de UI ou execução de
 * JavaScript no browser. Redireciona para /login se a sessão for inválida.
 *
 * Referência: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: Não adicione lógica entre createServerClient e auth.getUser().
  // Um simples erro pode fazer a sessão do usuário expirar de forma inesperada.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas privadas que exigem autenticação
  const privateRoutes = ['/admin', '/tecnicos', '/empresa', '/jovem'];
  const isPrivateRoute = privateRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPrivateRoute && !user) {
    // Redireciona para /login e preserva a URL de destino como parâmetro
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - Arquivos de assets (imagens, fontes, etc.)
     * - Rotas de API (já possuem proteção própria)
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
