import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getReferralsByCompany,
  updateReferralStatusByCompany,
} from '@/backend/services/candidatos.service';
import { atualizarStatusCandidatoSchema } from '@/backend/lib/schemas';

/**
 * GET /api/candidatos
 * Retorna os encaminhamentos de candidatos para as vagas da empresa autenticada.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const referrals = await getReferralsByCompany(user.id);
    return NextResponse.json(referrals);
  } catch (err: any) {
    console.error('Erro em GET /api/candidatos:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao carregar candidatos.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/candidatos
 * Atualiza o status de um candidato (ex: agendar entrevista, reprovar) com validação IDOR.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = atualizarStatusCandidatoSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(' | ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { referral_id, status, feedback_empresa } = parsed.data;

    await updateReferralStatusByCompany(user.id, referral_id, status, feedback_empresa);

    return NextResponse.json({
      message: 'Status do candidato atualizado com sucesso.',
      referral_id,
      status,
    });
  } catch (err: any) {
    console.error('Erro em PATCH /api/candidatos:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro ao atualizar candidato.' },
      { status: 500 }
    );
  }
}
