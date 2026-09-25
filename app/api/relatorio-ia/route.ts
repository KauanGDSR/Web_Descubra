import { NextResponse, NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { rateLimit } from '@/backend/lib/rate-limit';
import { uuidSchema } from '@/backend/lib/schemas';
import { gerarRelatorioIndividual, gerarRelatorioGeral } from '@/backend/services/relatorio.service';

export async function POST(request: NextRequest) {
  // 1. Rate Limiting de IA (ASVS 9.2: 10 requisições por minuto por IP)
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    // 2. Verificação de Autenticação
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Busca perfil do técnico/administrador
    const { data: tecnico, error: tecError } = await supabaseAuth
      .from('tecnicos')
      .select('cargo, equipamento_id')
      .eq('id', user.id)
      .single();

    if (tecError || !tecnico) {
      return NextResponse.json(
        { error: 'Acesso negado. Usuário sem perfil adequado.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, jovem_id, prompt_livre } = body;

    if (!tipo || !['individual', 'geral'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de relatório inválido. Requer "individual" ou "geral".' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Erro de configuração: Chave da IA não encontrada no backend.' },
        { status: 500 }
      );
    }

    const isTecnicoAdmin = tecnico.cargo === 'admin';

    // 1. Relatório Individual
    if (tipo === 'individual') {
      const parsedUuid = uuidSchema.safeParse(jovem_id);
      if (!parsedUuid.success) {
        return NextResponse.json({ error: 'ID do jovem inválido.' }, { status: 400 });
      }

      const resultado = await gerarRelatorioIndividual(
        jovem_id,
        prompt_livre,
        tecnico.equipamento_id,
        isTecnicoAdmin
      );

      return NextResponse.json({
        success: true,
        ...resultado,
      });
    }

    // 2. Relatório Geral Institucional
    const resultado = await gerarRelatorioGeral(
      prompt_livre,
      tecnico.equipamento_id,
      isTecnicoAdmin
    );

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (err: any) {
    console.error('Erro em /api/relatorio-ia:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno na geração do relatório.' },
      { status: 500 }
    );
  }
}
