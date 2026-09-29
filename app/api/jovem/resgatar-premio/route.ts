import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

/**
 * POST /api/jovem/resgatar-premio
 * Processa a solicitação de resgate de um prêmio pelo jovem.
 * Valida o saldo de pontos, cria a solicitação pendente e deduz os pontos da conta do jovem.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { premioId } = body;

    if (!premioId) {
      return NextResponse.json({ error: 'ID do prêmio é obrigatório.' }, { status: 400 });
    }

    const adminSupabase = getAdminClient();

    // 1. Identifica o jovem autenticado estritamente
    const jovemId = user?.id;
    if (!jovemId) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para resgatar prêmios.' },
        { status: 401 }
      );
    }

    // 2. Busca os dados atuais do jovem (pontos)
    const { data: jovem, error: jovemErr } = await (adminSupabase.from('jovens') as any)
      .select('id, nome_completo, nome_social, pontuacao_atual')
      .eq('id', jovemId)
      .single();

    if (jovemErr || !jovem) {
      return NextResponse.json({ error: 'Não foi possível localizar o perfil do jovem.' }, { status: 404 });
    }

    // 3. Busca o prêmio solicitado
    const { data: premio, error: premioErr } = await (adminSupabase.from('premios_parceiros') as any)
      .select('*')
      .eq('id', premioId)
      .eq('ativo', true)
      .single();

    if (premioErr || !premio) {
      return NextResponse.json({ error: 'Prêmio não encontrado ou indisponível para resgate.' }, { status: 404 });
    }

    const custo = Number((premio as any).custo_pontos) || 0;
    const saldoAtual = Number((jovem as any).pontuacao_atual) || 0;

    if (saldoAtual < custo) {
      return NextResponse.json({
        error: `Saldo insuficiente! Você possui ${saldoAtual} pontos, mas este prêmio requer ${custo} pontos.`
      }, { status: 400 });
    }

    // 4. Cria o registro de resgate pendente
    const { data: resgate, error: resgateErr } = await (adminSupabase.from('resgates_premios') as any)
      .insert({
        jovem_id: (jovem as any).id,
        premio_id: (premio as any).id,
        status: 'Pendente'
      })
      .select()
      .single();

    if (resgateErr) {
      console.error('Erro ao inserir resgate:', resgateErr);
      return NextResponse.json({ error: 'Falha ao registrar solicitação de resgate.' }, { status: 500 });
    }

    // 5. Deduz os pontos do jovem
    const novoSaldo = Math.max(0, saldoAtual - custo);
    const { error: updateErr } = await (adminSupabase.from('jovens') as any)
      .update({ pontuacao_atual: novoSaldo })
      .eq('id', (jovem as any).id);

    if (updateErr) {
      console.error('Erro ao atualizar saldo do jovem:', updateErr);
      // Rollback do resgate
      await (adminSupabase.from('resgates_premios') as any).delete().eq('id', (resgate as any).id);
      return NextResponse.json({ error: 'Falha ao deduzir pontos do saldo.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mensagem: `Resgate de "${(premio as any).titulo}" solicitado com sucesso!`,
      novoSaldo,
      resgate
    });
  } catch (err: any) {
    console.error('Erro em POST /api/jovem/resgatar-premio:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao processar resgate.' }, { status: 500 });
  }
}
