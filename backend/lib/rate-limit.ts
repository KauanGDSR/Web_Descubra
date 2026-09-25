import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory Rate Limiter para mitigação de DoS e controle de custos de APIs de IA.
 * Em ambientes distribuídos de alta escala, pode ser substituído por Redis/Upstash.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyFn?: (req: NextRequest) => string;
}

export function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'local';
  const key = options.keyFn ? options.keyFn(req) : ip;

  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + options.windowMs });
    return null; // Permitido
  }

  entry.count++;
  if (entry.count > options.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Muitas requisições. Por favor, aguarde antes de tentar novamente.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(options.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null; // Permitido
}
