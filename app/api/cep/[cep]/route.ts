import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cep/[cep]
 * Proxy resiliente para consulta de CEP com múltiplos provedores em fallback:
 * 1. BrasilAPI (rápida, integra múltiplos provedores)
 * 2. ViaCEP (provedor tradicional brasileiro)
 * 3. AwesomeAPI (provedor de contingência)
 * 
 * Evita bloqueios de CORS, AdBlockers de clientes e instabilidades de um único provedor.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ cep: string }> }) {
  const { cep } = await params;
  const clean = (cep || '').replace(/\D/g, '');

  if (clean.length !== 8) {
    return NextResponse.json({ error: 'CEP deve ter 8 dígitos numéricos.' }, { status: 400 });
  }

  // Provedor 1: BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`, {
      headers: { 'User-Agent': 'DescubraApp/1.0 (contato@descubra.org)' },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 } // Cache de 24h
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.city || data.neighborhood || data.street)) {
        return NextResponse.json({
          cep: data.cep || clean,
          logradouro: data.street || '',
          bairro: data.neighborhood || '',
          localidade: data.city || '',
          uf: data.state || '',
          provedor: 'brasilapi'
        });
      }
    }
  } catch (err) {
    console.warn(`[CEP Proxy] Falha no provedor BrasilAPI para o CEP ${clean}:`, err);
  }

  // Provedor 2: ViaCEP (Fallback 1)
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      headers: { 'User-Agent': 'DescubraApp/1.0 (contato@descubra.org)' },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) {
        return NextResponse.json({
          cep: data.cep || clean,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          localidade: data.localidade || '',
          uf: data.uf || '',
          provedor: 'viacep'
        });
      }
    }
  } catch (err) {
    console.warn(`[CEP Proxy] Falha no provedor ViaCEP para o CEP ${clean}:`, err);
  }

  // Provedor 3: AwesomeAPI (Fallback 2)
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${clean}`, {
      headers: { 'User-Agent': 'DescubraApp/1.0 (contato@descubra.org)' },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 86400 }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.city || data.district || data.address)) {
        return NextResponse.json({
          cep: data.cep || clean,
          logradouro: data.address || '',
          bairro: data.district || '',
          localidade: data.city || '',
          uf: data.state || '',
          provedor: 'awesomeapi'
        });
      }
    }
  } catch (err) {
    console.warn(`[CEP Proxy] Falha no provedor AwesomeAPI para o CEP ${clean}:`, err);
  }

  return NextResponse.json(
    { error: 'Não foi possível encontrar o CEP informado nos provedores oficiais.' },
    { status: 404 }
  );
}
