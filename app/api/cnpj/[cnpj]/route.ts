import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cnpj/[cnpj]
 * Proxy para a BrasilAPI — evita problemas de CORS e expõe a chamada de forma segura.
 * No futuro pode adicionar cache, rate-limiting, e logging de consultas.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params;
  const clean = cnpj.replace(/\D/g, '');

  if (clean.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      headers: {
        'User-Agent': 'DescubraApp/1.0 (contato@descubra.org)'
      },
      next: { revalidate: 3600 }, // Cache de 1 hora
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'CNPJ não encontrado' }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar a BrasilAPI' }, { status: 500 });
  }
}
