import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    // 0. VERIFICAÇÃO DE SEGURANÇA - Apenas admins podem usar essa rota
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
    }

    // [SEC-02] Verificação de autorização direta — sem lógica de "self-healing".
    const { data: reqAdmin } = await supabase
      .from('tecnicos')
      .select('cargo')
      .eq('id', user.id)
      .single();

    if (!reqAdmin || reqAdmin.cargo !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem cadastrar empresas com senhas.' }, { status: 403 });
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
      selo
    } = await request.json();

    // Validações básicas
    if (!razao_social || !email || !senha || !cnpj || !responsavel_nome) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios (Razão Social, E-mail, Senha, CNPJ e Responsável).' },
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
    // [BUG-02] Rollback com log de falha para auditoria manual caso o delete também falhe
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
      selo: selo || 'Nenhum'
    });

    if (companyError) {
      console.error('Erro ao salvar empresa na tabela:', companyError);
      const { error: deleteError } = await admin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.error(
          `[ROLLBACK FAILURE] Usuário Auth criado (id: ${authData.user.id}, email: ${email}) mas não foi possível deletá-lo após falha no insert da tabela empresas_parceiras. Limpeza manual necessária.`,
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
