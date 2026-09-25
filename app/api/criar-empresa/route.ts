import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';
import { criarEmpresaSchema } from '@/backend/lib/schemas';

export async function POST(request: Request) {
  try {
    // 0. VERIFICAÇÃO DE SEGURANÇA - Apenas admins podem usar essa rota
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    const { data: reqAdmin } = await supabase
      .from('tecnicos')
      .select('cargo')
      .eq('id', user.id)
      .single();

    if (!reqAdmin || reqAdmin.cargo !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem cadastrar empresas com senhas.' },
        { status: 403 }
      );
    }

    // Validação estrita via Zod Schema (ASVS 1.1 + 4.2)
    const body = await request.json();
    const parsed = criarEmpresaSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(' | ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      razao_social,
      nome_fantasia,
      cnpj,
      cep,
      endereco,
      email,
      telefone,
      responsavel_nome,
      cidade_id,
      senha,
      selo,
    } = parsed.data;

    const admin = getAdminClient();

    // 1. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Erro ao criar conta da empresa no Auth.' },
        { status: 400 }
      );
    }

    // 2. Insere na tabela empresas_parceiras
    const { error: companyError } = await (admin.from('empresas_parceiras') as any).insert({
      id: authData.user.id,
      razao_social,
      nome_fantasia: nome_fantasia || razao_social,
      cnpj,
      cep: cep || null,
      endereco: endereco || null,
      email,
      telefone: telefone || null,
      responsavel_nome,
      cidade_id: cidade_id || null,
      selo: selo || 'Nenhum',
    });

    if (companyError) {
      console.error('Erro ao salvar empresa na tabela:', companyError);
      const { error: deleteError } = await admin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error(
          `[ROLLBACK FAILURE] Usuário Auth criado (id: ${authData.user.id}, email: ${email}) mas não foi possível deletá-lo após falha no insert.`,
          deleteError
        );
      }
      return NextResponse.json(
        { error: 'Erro interno ao salvar os dados da empresa no banco de dados.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `Empresa "${razao_social}" cadastrada com sucesso!`, id: authData.user.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Erro na criação de empresa:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
