import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jovem/depoimentos
 * Retorna os depoimentos do jovem conectado ou todos os depoimentos aprovados.
 */
export async function GET(request: Request) {
  try {
    const adminSupabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const jovemIdParam = searchParams.get('jovemId');

    let query = (adminSupabase.from('depoimentos_alunos') as any)
      .select(`
        id,
        texto_trajetoria,
        status_aprovacao,
        data_envio,
        jovens (
          id,
          nome_completo,
          nome_social,
          equipamentos (
            nome
          )
        )
      `)
      .order('data_envio', { ascending: false });

    if (jovemIdParam) {
      query = query.eq('jovem_id', jovemIdParam);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ depoimentos: data || [] });
  } catch (err: any) {
    console.error('Erro em GET /api/jovem/depoimentos:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/jovem/depoimentos
 * Envia um novo relato / depoimento para aprovação da equipe técnica.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { textoTrajetoria, jovemId: customJovemId } = body;

    if (!textoTrajetoria || textoTrajetoria.trim().length < 10) {
      return NextResponse.json(
        { error: 'Por favor, escreva um relato com no mínimo 10 caracteres.' },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminClient();

    // Identifica o ID do jovem: autenticado, customizado ou fallback
    let jovemId = customJovemId || user?.id;
    if (!jovemId) {
      const { data: demoJovem } = await (adminSupabase.from('jovens') as any)
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      jovemId = (demoJovem as any)?.id;
    }

    if (!jovemId) {
      return NextResponse.json({ error: 'Cadastro de jovem não encontrado.' }, { status: 404 });
    }

    const { data, error } = await (adminSupabase.from('depoimentos_alunos') as any)
      .insert({
        jovem_id: jovemId,
        texto_trajetoria: textoTrajetoria.trim(),
        status_aprovacao: 'Pendente',
        data_envio: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mensagem: 'Depoimento enviado com sucesso! Ele foi encaminhado para a equipe técnica analisar.',
      depoimento: data
    });
  } catch (err: any) {
    console.error('Erro em POST /api/jovem/depoimentos:', err);
    return NextResponse.json({ error: err.message || 'Erro ao enviar depoimento.' }, { status: 500 });
  }
}
