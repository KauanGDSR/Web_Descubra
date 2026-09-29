import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export interface CertificadoItem {
  id: string;
  jovem_id: string;
  jovem_nome?: string;
  jovem_cidade?: string;
  jovem_pontos?: number;
  titulo_curso: string;
  instituicao: string;
  carga_horaria: string;
  data_conclusao: string;
  arquivo_url: string;
  arquivo_nome: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  pontos_atribuidos: number;
  parecer_tecnico?: string | null;
  validado_por?: string | null;
  validado_em?: string | null;
  created_at: string;
}

/**
 * GET /api/tecnicos/certificados
 * Lista todos os certificados enviados pelos jovens para validação técnica.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();

    // Valida se o usuário é técnico ou admin
    const isAdmin = user.email?.toLowerCase().includes('admin') || user.user_metadata?.role === 'admin';
    const { data: tecnico } = await (adminSupabase.from('tecnicos') as any)
      .select('id, cargo, nome')
      .eq('id', user.id)
      .maybeSingle();

    if (!tecnico && !isAdmin) {
      return NextResponse.json({ error: 'Acesso restrito à equipe técnica e administração.' }, { status: 403 });
    }

    let certificados: CertificadoItem[] = [];

    // 1. Tenta buscar da tabela PostgreSQL certificados_cursos com join em jovens
    try {
      const { data: dbData, error: dbErr } = await (adminSupabase.from('certificados_cursos') as any)
        .select(`
          id,
          jovem_id,
          titulo_curso,
          instituicao,
          carga_horaria,
          data_conclusao,
          arquivo_url,
          arquivo_nome,
          status,
          pontos_atribuidos,
          parecer_tecnico,
          created_at,
          jovens:jovem_id (
            id,
            nome_completo,
            cidade,
            pontuacao_atual
          )
        `)
        .order('created_at', { ascending: false });

      if (!dbErr && dbData && Array.isArray(dbData)) {
        certificados = dbData.map((item: any) => ({
          id: item.id,
          jovem_id: item.jovem_id,
          jovem_nome: item.jovens?.nome_completo || 'Jovem Aprendiz',
          jovem_cidade: item.jovens?.cidade || 'Não informada',
          jovem_pontos: item.jovens?.pontuacao_atual ?? 0,
          titulo_curso: item.titulo_curso,
          instituicao: item.instituicao,
          carga_horaria: item.carga_horaria || '',
          data_conclusao: item.data_conclusao || '',
          arquivo_url: item.arquivo_url,
          arquivo_nome: item.arquivo_nome,
          status: item.status || 'Pendente',
          pontos_atribuidos: item.pontos_atribuidos || 0,
          parecer_tecnico: item.parecer_tecnico || null,
          created_at: item.created_at,
        }));
      }
    } catch {
      // Ignora erro de tabela não encontrada e prossegue para storage
    }

    // 2. Se a tabela não retornou dados, lê do bucket 'certificados' (pasta _all_certificados)
    if (certificados.length === 0) {
      const { data: indexFiles } = await adminSupabase.storage
        .from('certificados')
        .list('_all_certificados');

      if (indexFiles && indexFiles.length > 0) {
        for (const file of indexFiles) {
          if (!file.name.endsWith('.json')) continue;
          try {
            const { data: blob } = await adminSupabase.storage
              .from('certificados')
              .download(`_all_certificados/${file.name}`);
            if (blob) {
              const text = await blob.text();
              const cert = JSON.parse(text) as CertificadoItem;
              certificados.push(cert);
            }
          } catch (e) {
            console.error('Erro ao ler certificado indexado:', e);
          }
        }
      } else {
        // Fallback: busca por pastas de jovens
        const { data: folders } = await adminSupabase.storage
          .from('certificados')
          .list();

        for (const item of (folders || [])) {
          if (item.name.startsWith('_') || !item.name) continue;
          const { data: userFiles } = await adminSupabase.storage
            .from('certificados')
            .list(item.name);

          const metaFiles = (userFiles || []).filter(f => f.name.startsWith('meta_') && f.name.endsWith('.json'));
          for (const mf of metaFiles) {
            try {
              const { data: blob } = await adminSupabase.storage
                .from('certificados')
                .download(`${item.name}/${mf.name}`);
              if (blob) {
                const text = await blob.text();
                certificados.push(JSON.parse(text));
              }
            } catch (e) {
              console.error('Erro ao ler meta certificado de pasta:', e);
            }
          }
        }
      }

      // Enriquecer com dados de jovens do banco
      if (certificados.length > 0) {
        const jovemIds = Array.from(new Set(certificados.map(c => c.jovem_id).filter(Boolean)));
        if (jovemIds.length > 0) {
          const { data: jovensList } = await (adminSupabase.from('jovens') as any)
            .select('id, nome_completo, cidade, pontuacao_atual')
            .in('id', jovemIds);

          const jovensMap = new Map(((jovensList as any[]) || []).map((j: any) => [j.id, j]));
          certificados = certificados.map(c => {
            const j: any = jovensMap.get(c.jovem_id);
            return {
              ...c,
              jovem_nome: j?.nome_completo || c.jovem_nome || 'Jovem Aprendiz',
              jovem_cidade: j?.cidade || c.jovem_cidade || 'Não informada',
              jovem_pontos: j?.pontuacao_atual ?? c.jovem_pontos ?? 0,
            };
          });
        }
      }
    }

    // Ordena: primeiro os pendentes, depois por data mais recente
    certificados.sort((a, b) => {
      if (a.status === 'Pendente' && b.status !== 'Pendente') return -1;
      if (b.status === 'Pendente' && a.status !== 'Pendente') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      certificados,
      total: certificados.length,
      pendentes: certificados.filter(c => c.status === 'Pendente').length,
    });
  } catch (err: any) {
    console.error('Erro em GET /api/tecnicos/certificados:', err);
    return NextResponse.json({ error: 'Erro ao listar certificados.' }, { status: 500 });
  }
}

/**
 * PATCH /api/tecnicos/certificados
 * Valida um certificado (Aprova ou Rejeita) e concede pontos de bonificação ao jovem.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();

    // Valida se o usuário é técnico ou admin
    const isAdmin = user.email?.toLowerCase().includes('admin') || user.user_metadata?.role === 'admin';
    const { data: tecnico } = await (adminSupabase.from('tecnicos') as any)
      .select('id, cargo, nome')
      .eq('id', user.id)
      .maybeSingle();

    if (!tecnico && !isAdmin) {
      return NextResponse.json({ error: 'Acesso restrito à equipe técnica e administração.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, jovem_id, status, pontos, parecer_tecnico } = body;

    if (!id || !jovem_id || !status) {
      return NextResponse.json({ error: 'ID do certificado, jovem_id e status são obrigatórios.' }, { status: 400 });
    }

    if (!['Aprovado', 'Rejeitado'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido. Use "Aprovado" ou "Rejeitado".' }, { status: 400 });
    }

    const pontosNumero = status === 'Aprovado' ? Math.max(0, parseInt(pontos, 10) || 0) : 0;
    const nowIso = new Date().toISOString();
    const avaliadorNome = tecnico?.nome || (isAdmin ? 'Administração Descubra' : 'Técnico Responsável');

    // 1. Tenta atualizar a tabela PostgreSQL se existir
    try {
      await (adminSupabase.from('certificados_cursos') as any)
        .update({
          status,
          pontos_atribuidos: pontosNumero,
          parecer_tecnico: parecer_tecnico || null,
          tecnico_id: tecnico?.id || null,
          updated_at: nowIso,
        })
        .eq('id', id);
    } catch (e) {
      console.warn('certificados_cursos update ignorado (tabela ausente ou não configurada):', e);
    }

    // 2. Atualiza os arquivos no storage (pasta _all_certificados e pasta do jovem)
    let certData: CertificadoItem | null = null;
    const globalPath = `_all_certificados/${id}.json`;
    const userPath = `${jovem_id}/meta_${id}.json`;

    try {
      const { data: blob } = await adminSupabase.storage
        .from('certificados')
        .download(globalPath);

      if (blob) {
        const text = await blob.text();
        certData = JSON.parse(text);
      }
    } catch {
      // Se não achou em _all_certificados, tenta no caminho do jovem
      try {
        const { data: blobUser } = await adminSupabase.storage
          .from('certificados')
          .download(userPath);
        if (blobUser) {
          const text = await blobUser.text();
          certData = JSON.parse(text);
        }
      } catch {}
    }

    if (certData) {
      certData.status = status;
      certData.pontos_atribuidos = pontosNumero;
      certData.parecer_tecnico = parecer_tecnico || null;
      certData.validado_por = avaliadorNome;
      certData.validado_em = nowIso;

      const updatedJson = JSON.stringify(certData);

      // Salva de volta em ambas as localizações
      await Promise.all([
        adminSupabase.storage
          .from('certificados')
          .upload(globalPath, updatedJson, { contentType: 'application/json', upsert: true }),
        adminSupabase.storage
          .from('certificados')
          .upload(userPath, updatedJson, { contentType: 'application/json', upsert: true }),
      ]);
    }

    // 3. Se aprovado com pontos > 0, bonifica a pontuação do jovem na tabela `jovens`
    let novoSaldo = 0;
    if (status === 'Aprovado' && pontosNumero > 0) {
      const { data: jovemAtual, error: jErr } = await (adminSupabase.from('jovens') as any)
        .select('id, pontuacao_atual')
        .eq('id', jovem_id)
        .single();

      if (!jErr && jovemAtual) {
        const saldoAtual = Number((jovemAtual as any).pontuacao_atual) || 0;
        novoSaldo = saldoAtual + pontosNumero;

        const { error: updErr } = await (adminSupabase.from('jovens') as any)
          .update({ pontuacao_atual: novoSaldo })
          .eq('id', jovem_id);

        if (updErr) {
          console.error('Erro ao atualizar pontuacao_atual do jovem:', updErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: status === 'Aprovado'
        ? `Certificado aprovado com sucesso! ${pontosNumero} pontos adicionados à conta do jovem.`
        : 'Certificado rejeitado com o parecer informado.',
      novoSaldo,
      certificado: certData,
    });
  } catch (err: any) {
    console.error('Erro em PATCH /api/tecnicos/certificados:', err);
    return NextResponse.json({ error: 'Erro ao validar certificado.' }, { status: 500 });
  }
}
