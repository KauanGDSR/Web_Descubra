import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAdminClient } from '@/backend/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export interface CertificadoData {
  id: string;
  jovem_id: string;
  jovem_nome?: string;
  jovem_cidade?: string;
  titulo_curso: string;
  instituicao: string;
  carga_horaria: string;
  data_conclusao: string;
  arquivo_url: string;
  arquivo_nome: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  pontos_atribuidos: number;
  parecer_tecnico?: string | null;
  created_at: string;
}

/**
 * GET /api/jovem/certificados
 * Retorna todos os certificados submetidos pelo jovem logado.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = getAdminClient();

    // 1. Tenta buscar da tabela certificados_cursos
    const { data: dbData, error: dbErr } = await (adminSupabase.from('certificados_cursos') as any)
      .select('*')
      .eq('jovem_id', user.id)
      .order('created_at', { ascending: false });

    if (!dbErr && dbData) {
      return NextResponse.json({ certificados: dbData });
    }

    // 2. Fallback resiliente: lê do storage caso a tabela SQL ainda não tenha sido criada
    const { data: files } = await adminSupabase.storage
      .from('certificados')
      .list(user.id);

    const metaFiles = (files || []).filter(f => f.name.startsWith('meta_') && f.name.endsWith('.json'));
    const certificados: CertificadoData[] = [];

    for (const f of metaFiles) {
      try {
        const { data: blob } = await adminSupabase.storage
          .from('certificados')
          .download(`${user.id}/${f.name}`);
        if (blob) {
          const text = await blob.text();
          certificados.push(JSON.parse(text));
        }
      } catch (e) {
        console.error('Erro ao ler meta certificado:', e);
      }
    }

    certificados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ certificados });
  } catch (err: any) {
    console.error('Erro em GET /api/jovem/certificados:', err);
    return NextResponse.json({ error: 'Erro ao carregar certificados.' }, { status: 500 });
  }
}

/**
 * POST /api/jovem/certificados
 * Recebe o anexo do certificado e os metadados do curso concluído pelo jovem.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para enviar certificados.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('arquivo') as File | null;
    const titulo = formData.get('titulo') as string | null;
    const instituicao = formData.get('instituicao') as string | null;
    const cargaHoraria = formData.get('carga_horaria') as string | null;
    const dataConclusao = formData.get('data_conclusao') as string | null;

    if (!file || !titulo || !instituicao) {
      return NextResponse.json({
        error: 'Título do curso, instituição emissora e anexo do comprovante são obrigatórios.'
      }, { status: 400 });
    }

    const adminSupabase = getAdminClient();

    // 1. Gera ID único e caminho de armazenamento
    const certId = crypto.randomUUID();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`;

    // 2. Faz o upload do arquivo para o bucket certificados
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await adminSupabase.storage
      .from('certificados')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Erro ao fazer upload do certificado:', uploadErr);
      return NextResponse.json({ error: 'Falha ao salvar arquivo do certificado.' }, { status: 500 });
    }

    // 3. Obtém a URL pública do comprovante
    const { data: { publicUrl } } = adminSupabase.storage
      .from('certificados')
      .getPublicUrl(storagePath);

    // Busca dados do jovem para enriquecer o registro
    const { data: jovemRow } = await adminSupabase
      .from('jovens')
      .select('nome_completo, cidade')
      .eq('id', user.id)
      .maybeSingle();

    const certificadoItem: CertificadoData = {
      id: certId,
      jovem_id: user.id,
      jovem_nome: (jovemRow as any)?.nome_completo || 'Jovem Aprendiz',
      jovem_cidade: (jovemRow as any)?.cidade || 'Não informada',
      titulo_curso: titulo.trim(),
      instituicao: instituicao.trim(),
      carga_horaria: (cargaHoraria || '').trim() || 'Não informada',
      data_conclusao: dataConclusao || new Date().toISOString().split('T')[0],
      arquivo_url: publicUrl,
      arquivo_nome: file.name,
      status: 'Pendente',
      pontos_atribuidos: 0,
      parecer_tecnico: null,
      created_at: new Date().toISOString(),
    };

    // 4. Salva na tabela SQL certificados_cursos se existir
    try {
      await (adminSupabase.from('certificados_cursos') as any)
        .insert({
          id: certificadoItem.id,
          jovem_id: certificadoItem.jovem_id,
          titulo_curso: certificadoItem.titulo_curso,
          instituicao: certificadoItem.instituicao,
          carga_horaria: certificadoItem.carga_horaria,
          data_conclusao: certificadoItem.data_conclusao,
          arquivo_url: certificadoItem.arquivo_url,
          arquivo_nome: certificadoItem.arquivo_nome,
          status: certificadoItem.status,
          pontos_atribuidos: 0,
        });
    } catch (e) {
      console.warn('certificados_cursos insert ignorado (usando storage como camada primária):', e);
    }

    // 5. Salva no storage (pasta do jovem e índice global para os técnicos)
    const jsonPayload = JSON.stringify(certificadoItem);
    const metaPath = `${user.id}/meta_${certId}.json`;
    const globalPath = `_all_certificados/${certId}.json`;

    await Promise.all([
      adminSupabase.storage
        .from('certificados')
        .upload(metaPath, jsonPayload, { contentType: 'application/json', upsert: true }),
      adminSupabase.storage
        .from('certificados')
        .upload(globalPath, jsonPayload, { contentType: 'application/json', upsert: true })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Certificado enviado com sucesso! A equipe técnica avaliará seu comprovante para atribuir pontos à sua conta.',
      certificado: certificadoItem,
    });
  } catch (err: any) {
    console.error('Erro inesperado em POST /api/jovem/certificados:', err);
    return NextResponse.json({ error: 'Erro interno ao processar envio do certificado.' }, { status: 500 });
  }
}
