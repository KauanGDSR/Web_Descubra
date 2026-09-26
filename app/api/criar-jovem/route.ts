import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    // 0. VERIFICAÇÃO DE SEGURANÇA - Apenas usuários autenticados (técnicos ou admins) podem criar jovens
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    const { data: reqTecnico } = await supabase
      .from('tecnicos')
      .select('cargo')
      .eq('id', user.id)
      .single();

    if (!reqTecnico) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas técnicos ou administradores podem cadastrar jovens aprendizes.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, senha, dbEntry } = body;

    // Validações básicas
    if (!email || !senha || !dbEntry?.nome_completo) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios (E-mail, Senha e Nome Completo).' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
    }

    if (senha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: {
        role: 'jovem',
        nome: dbEntry.nome_completo
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Erro ao criar credenciais de acesso no Auth.' },
        { status: 400 }
      );
    }

    // 2. Insere na tabela jovens usando o ID do Auth
    const { error: jovemError } = await (admin.from('jovens') as any).insert({
      ...dbEntry,
      id: authData.user.id,
    });

    if (jovemError) {
      console.error('Erro ao salvar jovem na tabela:', jovemError);
      // Tenta rollback do usuário no Auth
      const { error: deleteError } = await admin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error(
          `[ROLLBACK FAILURE] Usuário Auth criado (id: ${authData.user.id}, email: ${email}) mas não foi possível deletá-lo após falha no insert da tabela jovens.`,
          deleteError
        );
      }
      return NextResponse.json(
        { error: 'Erro interno ao salvar os dados do jovem: ' + jovemError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `Jovem "${dbEntry.nome_completo}" cadastrado com sucesso!`, id: authData.user.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Erro na criação de jovem:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
