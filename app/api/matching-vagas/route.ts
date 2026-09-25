import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { rateLimit } from '@/backend/lib/rate-limit';
import { uuidSchema } from '@/backend/lib/schemas';
import { matchVagaComJovens, matchJovemComVagas } from '@/backend/services/matching.service';

export async function POST(request: NextRequest) {
  // 1. Rate Limiting de IA (ASVS 9.2: 10 requisições por minuto por IP)
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { vaga_id, jovem_id } = body;

    if (!vaga_id && !jovem_id) {
      return NextResponse.json(
        { error: 'É necessário informar vaga_id ou jovem_id.' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('GOOGLE_GENERATIVE_AI_API_KEY não configurada.');
      return NextResponse.json({ error: 'Erro de configuração do Gemini IA.' }, { status: 500 });
    }

    // 2. Verificação de Autenticação e Perfis
    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    const { data: tecnico } = await supabaseAuth
      .from('tecnicos')
      .select('cargo, equipamento_id')
      .eq('id', user.id)
      .single();

    const { data: company } = await supabaseAuth
      .from('empresas_parceiras')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!tecnico && !company) {
      return NextResponse.json(
        { error: 'Acesso negado. Usuário sem perfil adequado.' },
        { status: 403 }
      );
    }

    const isTecnicoAdmin = tecnico?.cargo === 'admin';
    const tecnicoEquipamentoId = tecnico?.equipamento_id;

    // Modo 1: Matched Vaga -> Jovens
    if (vaga_id) {
      const parsed = uuidSchema.safeParse(vaga_id);
      if (!parsed.success) {
        return NextResponse.json({ error: 'vaga_id inválido (deve ser UUID).' }, { status: 400 });
      }

      const result = await matchVagaComJovens(
        vaga_id,
        company ? user.id : undefined,
        tecnicoEquipamentoId,
        isTecnicoAdmin
      );

      return NextResponse.json(result);
    }

    // Modo 2: Matched Jovem -> Vagas
    if (jovem_id) {
      const parsed = uuidSchema.safeParse(jovem_id);
      if (!parsed.success) {
        return NextResponse.json({ error: 'jovem_id inválido (deve ser UUID).' }, { status: 400 });
      }

      const result = await matchJovemComVagas(
        jovem_id,
        tecnicoEquipamentoId,
        isTecnicoAdmin
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro na rota de API de matching:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao processar o matching inteligente com IA.' },
      { status: 500 }
    );
  }
}
