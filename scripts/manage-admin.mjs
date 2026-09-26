import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- Listando usuários no Supabase Auth ---');
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Erro ao listar usuários do Auth:', usersError);
    process.exit(1);
  }

  console.log(`Total de usuários encontrados no Auth: ${usersData.users.length}`);
  for (const u of usersData.users) {
    console.log(`- ID: ${u.id} | Email: ${u.email}`);
  }

  console.log('\n--- Listando registros na tabela "tecnicos" ---');
  const { data: tecnicos, error: tecError } = await supabase.from('tecnicos').select('*');
  if (tecError) {
    console.error('Erro ao ler tabela tecnicos:', tecError);
  } else {
    console.log(`Total na tabela tecnicos: ${tecnicos.length}`);
    for (const t of tecnicos) {
      console.log(`- ID: ${t.id} | Nome: ${t.nome} | Cargo: ${t.cargo}`);
    }
  }

  // Define as credenciais do admin
  const adminEmail = 'admin@descubra.com';
  const adminPassword = 'AdminDescubra2026!';

  let adminUser = usersData.users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());

  if (adminUser) {
    console.log(`\nUsuário ${adminEmail} já existe no Auth (ID: ${adminUser.id}). Atualizando senha...`);
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: adminPassword,
      email_confirm: true,
    });
    if (updateError) {
      console.error('Erro ao atualizar senha do admin:', updateError);
    } else {
      console.log('Senha do admin atualizada com sucesso!');
    }
  } else {
    console.log(`\nCriando novo usuário ${adminEmail} no Auth...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    });
    if (createError) {
      console.error('Erro ao criar usuário admin no Auth:', createError);
      process.exit(1);
    }
    adminUser = created.user;
    console.log(`Usuário Auth criado com sucesso! ID: ${adminUser.id}`);
  }

  // Garante que o perfil existe na tabela tecnicos com cargo='admin'
  const { data: tecExisting } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('id', adminUser.id)
    .single();

  if (tecExisting) {
    console.log(`Registro encontrado na tabela tecnicos. Garantindo cargo='admin'...`);
    const { error: updTecErr } = await supabase
      .from('tecnicos')
      .update({ cargo: 'admin', nome: tecExisting.nome || 'Administrador DescubraHub' })
      .eq('id', adminUser.id);
    if (updTecErr) {
      console.error('Erro ao atualizar cargo na tabela tecnicos:', updTecErr);
    } else {
      console.log('Cargo atualizado para "admin" com sucesso na tabela tecnicos!');
    }
  } else {
    console.log(`Inserindo registro do admin na tabela tecnicos...`);
    const { error: insTecErr } = await supabase
      .from('tecnicos')
      .insert({
        id: adminUser.id,
        nome: 'Administrador DescubraHub',
        telefone_whatsapp: '(38) 99999-9999',
        cargo: 'admin',
        equipamento_id: null,
      });
    if (insTecErr) {
      console.error('Erro ao inserir na tabela tecnicos:', insTecErr);
    } else {
      console.log('Perfil de administrador inserido na tabela tecnicos com sucesso!');
    }
  }

  console.log('\n--- Testando autenticação de login (signInWithPassword) ---');
  const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const publicClient = createClient(supabaseUrl, anonKey);
  const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (loginError) {
    console.error('Falha no teste de login:', loginError.message);
  } else {
    console.log('Login efetuado com sucesso!');
    console.log(`Usuário autenticado ID: ${loginData.user.id}`);
    
    // Consulta o perfil do técnico
    const { data: profile } = await publicClient
      .from('tecnicos')
      .select('cargo, nome')
      .eq('id', loginData.user.id)
      .single();
    console.log(`Perfil obtido: Nome="${profile?.nome}", Cargo="${profile?.cargo}"`);
  }

  console.log('\n=============================================');
  console.log('USUÁRIO ADMINISTRADOR CONFIGURADO COM SUCESSO!');
  console.log(`E-mail: ${adminEmail}`);
  console.log(`Senha: ${adminPassword}`);
  console.log(`Cargo: admin`);
  console.log('=============================================');
}

main().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
