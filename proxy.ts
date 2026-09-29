import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy / Middleware de Autenticação — Proteção Global de Rotas e RBAC
 *
 * Em Next.js 16+, proxy.ts intercepta todas as requisições de rotas protegidas
 * (/admin, /tecnicos, /empresa, /jovem) antes da execução de JavaScript no navegador.
 *
 * Protege rotas para TODOS os tipos de usuários:
 * - /jovem/*     -> Jovens Aprendizes
 * - /admin/*     -> Administradores (cargo === 'admin')
 * - /tecnicos/*  -> Técnicos Socioassistenciais e Administradores
 * - /empresa/*   -> Empresas Parceiras
 * - /login       -> Redireciona usuários já autenticados para seu devido painel
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validação segura de sessão com Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login';
  const isJovemRoute = pathname.startsWith('/jovem');
  const isAdminRoute = pathname.startsWith('/admin');
  const isTecnicoRoute = pathname.startsWith('/tecnicos');
  const isEmpresaRoute = pathname.startsWith('/empresa');
  const isProtectedRoute = isJovemRoute || isAdminRoute || isTecnicoRoute || isEmpresaRoute;

  // 1. Se NÃO autenticado e tentando acessar qualquer rota protegida -> redireciona para login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Se autenticado, verifica ou descobre o perfil do usuário (RBAC)
  if (user) {
    let role = request.cookies.get('descubra_user_role')?.value;

    // Se o cookie de perfil ainda não estiver presente, identifica no banco
    if (!role) {
      try {
        const { data: tecnico } = await supabase
          .from('tecnicos')
          .select('cargo')
          .eq('id', user.id)
          .maybeSingle();

        if (tecnico) {
          role = tecnico.cargo === 'admin' ? 'admin' : 'tecnico';
        } else {
          const { data: empresa } = await supabase
            .from('empresas_parceiras')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (empresa) {
            role = 'empresa';
          } else {
            const { data: jovem } = await supabase
              .from('jovens')
              .select('id')
              .eq('id', user.id)
              .maybeSingle();

            if (jovem) {
              role = 'jovem';
            }
          }
        }

        if (role) {
          response.cookies.set('descubra_user_role', role, {
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      } catch (err) {
        console.error('Erro ao determinar perfil do usuário no proxy:', err);
      }
    }

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      tecnico: '/tecnicos',
      empresa: '/empresa',
      jovem: '/jovem',
    };

    // 3. Se estiver na página de login já autenticado -> redireciona para o painel correspondente
    if (isAuthRoute) {
      const dest = role ? redirectMap[role] || '/' : '/';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 4. Verificação de permissões por perfil (RBAC)
    if (role) {
      // /admin/* -> somente admin
      if (isAdminRoute && role !== 'admin') {
        const dest = role === 'tecnico' ? '/tecnicos' : role === 'empresa' ? '/empresa' : '/jovem';
        return NextResponse.redirect(new URL(dest, request.url));
      }

      // /tecnicos/* -> tecnicos ou admin
      if (isTecnicoRoute && role !== 'tecnico' && role !== 'admin') {
        const dest = role === 'empresa' ? '/empresa' : '/jovem';
        return NextResponse.redirect(new URL(dest, request.url));
      }

      // /empresa/* -> somente empresas
      if (isEmpresaRoute && role !== 'empresa') {
        const dest = role === 'admin' ? '/admin' : role === 'tecnico' ? '/tecnicos' : '/jovem';
        return NextResponse.redirect(new URL(dest, request.url));
      }

      // /jovem/* -> somente jovens
      if (isJovemRoute && role !== 'jovem') {
        const dest = role === 'admin' ? '/admin' : role === 'tecnico' ? '/tecnicos' : '/empresa';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
