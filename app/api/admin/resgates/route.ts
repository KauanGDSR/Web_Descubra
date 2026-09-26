import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

/**
 * GET /api/admin/resgates
 * Retorna todas as solicitações de resgates feitas pelos jovens.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await (supabase.from('resgates_premios') as any)
      .select(`
        id,
        status,
        created_at,
        jovem_id,
        premio_id,
        jovens (
          id,
          nome_completo,
          nome_social,
          pontuacao_atual,
          equipamentos (
            nome
          )
        ),
        premios_parceiros (
          id,
          titulo,
          custo_pontos,
          parceiro_nome
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ resgates: data || [] });
  } catch (err: any) {
    console.error('Erro em GET /api/admin/resgates:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar resgates.' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/resgates
 * Atualiza o status de uma solicitação de resgate:
 * - 'Entregue': Confirma e finaliza a entrega do prêmio ao aluno.
 * - 'Cancelado': Cancela a solicitação e estorna automaticamente os pontos do prêmio de volta ao aluno!
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, novoStatus } = body;

    if (!id || !novoStatus) {
      return NextResponse.json({ error: 'ID do resgate e novoStatus são obrigatórios.' }, { status: 400 });
    }

    if (!['Pendente', 'Entregue', 'Cancelado'].includes(novoStatus)) {
      return NextResponse.json({ error: 'Status inválido. Use Pendente, Entregue ou Cancelado.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Busca os dados atuais do resgate
    const { data: resgate, error: fetchErr } = await (supabase.from('resgates_premios') as any)
      .select(`
        id,
        status,
        jovem_id,
        premio_id,
        jovens (id, pontuacao_atual),
        premios_parceiros (id, titulo, custo_pontos)
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !resgate) {
      return NextResponse.json({ error: 'Solicitação de resgate não encontrada.' }, { status: 404 });
    }

    // 2. Se for cancelamento de um resgate pendente, estorna os pontos para o jovem
    if (novoStatus === 'Cancelado' && (resgate as any).status === 'Pendente') {
      const custo = (resgate as any).premios_parceiros?.custo_pontos || 0;
      const saldoAtual = (resgate as any).jovens?.pontuacao_atual || 0;
      const novoSaldo = saldoAtual + custo;

      if ((resgate as any).jovem_id) {
        await (supabase.from('jovens') as any)
          .update({ pontuacao_atual: novoSaldo })
          .eq('id', (resgate as any).jovem_id);
      }
    }

    // 3. Atualiza o status do resgate
    const { data: updated, error: updateErr } = await (supabase.from('resgates_premios') as any)
      .update({ status: novoStatus })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      mensagem: novoStatus === 'Entregue' 
        ? 'Prêmio marcado como entregue com sucesso!' 
        : novoStatus === 'Cancelado'
          ? 'Resgate cancelado e pontos estornados ao aluno com sucesso!'
          : 'Status do resgate atualizado com sucesso!',
      resgate: updated
    });
  } catch (err: any) {
    console.error('Erro em PUT /api/admin/resgates:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar resgate.' }, { status: 500 });
  }
}
