import { NextResponse, NextRequest } from 'next/server';
import { generateObject, type ModelMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getAdminClient, sanitizeNumericId } from '@/lib/supabase-admin';

// ── FUNÇÕES AUXILIARES DE NOME (escopo do módulo, não re-criadas a cada request) ──

function normalizarNome(n: string): string {
  return n
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calcularSimilaridade(s1: string, s2: string): number {
  const n1 = normalizarNome(s1);
  const n2 = normalizarNome(s2);
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1;

  const palavras1 = n1.split(/\s+/);
  const palavras2 = n2.split(/\s+/);
  let acertos = 0;

  for (const p1 of palavras1) {
    let melhorMatchPalavra = false;
    for (const p2 of palavras2) {
      if (p1 === p2) {
        melhorMatchPalavra = true;
        break;
      }
      if (p1.length >= 3 && p2.length >= 3) {
        if (p1.includes(p2) || p2.includes(p1)) {
          melhorMatchPalavra = true;
          break;
        }
        const dist = levenshteinDistance(p1, p2);
        const maxLen = Math.max(p1.length, p2.length);
        if (dist <= 2 && dist / maxLen < 0.4) {
          melhorMatchPalavra = true;
          break;
        }
      }
    }
    if (melhorMatchPalavra) acertos++;
  }

  const scoreBase = acertos / palavras1.length;
  const diferencaTamanho = Math.abs(palavras1.length - palavras2.length);
  const penalidade = diferencaTamanho * 0.02;
  return Math.max(0, scoreBase - penalidade);
}

// ── MÉTODO POST (WEBHOOK DO TELEGRAM) ────────────────────────────────────────
export async function POST(request: NextRequest) {
  let telegramChatId = '';
  try {
    // Verificação de segurança do webhook do Telegram
    const telegramSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    if (!telegramSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('TELEGRAM_WEBHOOK_SECRET não configurada no servidor em produção. Rejeitando requisições.');
        return NextResponse.json({ error: 'Erro de configuração do servidor.' }, { status: 500 });
      } else {
        console.warn('⚠️ AVISO: TELEGRAM_WEBHOOK_SECRET não configurada localmente. Ignorando validação em desenvolvimento.');
      }
    } else {
      const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (headerSecret !== telegramSecret) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
      }
    }

    const body = await request.json();

    // O Telegram manda a mensagem dentro de body.message
    const message = body.message;
    if (!message) {
      return NextResponse.json({ ok: true, message: 'Evento ignorado (sem mensagem)' }, { status: 200 });
    }

    // Extrai o chat_id e o user_id — sanitiza para apenas dígitos (proteção de injeção)
    telegramChatId = sanitizeNumericId(String(message.chat.id));
    const telegramUserId = sanitizeNumericId(String(message.from?.id || message.chat.id));

    // EVITAR LOOP DE BOTS
    if (message.from?.is_bot) {
      return NextResponse.json({ ok: true, message: 'Mensagem de bot ignorada' }, { status: 200 });
    }

    const isAudio = !!(message.voice || message.audio);
    const messageText: string = message.text || message.caption || '';

    if (messageText.length > 500) {
      await sendTelegramMessage(
        telegramChatId,
        `⚠️ *Mensagem muito longa!*\nSua mensagem possui ${messageText.length} caracteres, mas o limite máximo permitido é de 500 caracteres.\n\nPor favor, envie uma nova mensagem com menos caracteres.`
      );
      return NextResponse.json({ ok: true, message: 'Mensagem excede o limite de 500 caracteres' }, { status: 200 });
    }

    // Ignora comandos de bots (mensagens que começam com /)
    if (messageText.startsWith('/')) {
      return NextResponse.json({ ok: true, message: 'Comando ignorado' }, { status: 200 });
    }

    if (!messageText.trim() && !isAudio && !message.contact) {
      return NextResponse.json({ ok: true, message: 'Evento ignorado (sem texto, áudio ou contato)' }, { status: 200 });
    }

    // ── INTEGRAÇÃO COM SUPABASE ──────────────────────────────────────────────
    const supabaseClient = getAdminClient();

    // ── [SEC-05] RATE LIMITING — Máximo 10 mensagens por chat por minuto ─────
    const umaMinutoAtras = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: msgCount } = await supabaseClient
      .from('sessoes_pendentes')
      .select('*', { count: 'exact', head: true })
      .eq('telegram_chat_id', telegramChatId)
      .gte('updated_at', umaMinutoAtras);

    if ((msgCount ?? 0) >= 10) {
      console.warn(`Rate limit atingido para chat_id: ${telegramChatId}`);
      return NextResponse.json({ ok: true }, { status: 200 }); // Silently ignore
    }

    // Se o usuário compartilhou o contato, tentamos vinculá-lo via telefone
    if (message.contact) {
      const rawTgPhone = String(message.contact.phone_number).replace(/\D/g, '');
      const tgPhoneDigits = rawTgPhone.startsWith('55') ? rawTgPhone.slice(2) : rawTgPhone;

      // Busca os técnicos cadastrados
      const { data: todosTecnicos } = await supabaseClient
        .from('tecnicos')
        .select('id, nome, telefone_whatsapp') as { data: Array<{ id: string; nome: string; telefone_whatsapp: string }> | null };

      if (todosTecnicos) {
        const tecnicoCorrespondente = todosTecnicos.find(t => {
          const dbPhoneDigits = String(t.telefone_whatsapp).replace(/\D/g, '');
          return dbPhoneDigits.endsWith(tgPhoneDigits) || tgPhoneDigits.endsWith(dbPhoneDigits);
        });

        if (tecnicoCorrespondente) {
          const { error: updateError } = await (supabaseClient
            .from('tecnicos') as any)
            .update({ telegram_id: telegramUserId })
            .eq('id', tecnicoCorrespondente.id);

          if (!updateError) {
            await sendTelegramMessage(
              telegramChatId,
              `✅ *Vínculo concluído com sucesso!*\n\nOlá, *${tecnicoCorrespondente.nome}*.\nSeu usuário do Telegram foi vinculado ao seu cadastro pelo telefone.\n\nAgora você já pode enviar relatos e áudios diretamente por aqui!`,
              { remove_keyboard: true }
            );
            return NextResponse.json({ ok: true, message: 'Técnico vinculado via telefone.' }, { status: 200 });
          }
        }
      }

      await sendTelegramMessage(
        telegramChatId,
        `❌ *Telefone não cadastrado.*\nO telefone do contato compartilhado (${message.contact.phone_number}) não foi localizado em nenhum cadastro de técnico no sistema. Entre em contato com o administrador.`,
        { remove_keyboard: true }
      );
      return NextResponse.json({ ok: true, message: 'Telefone do contato não correspondido.' }, { status: 200 });
    }

    // Busca o técnico pelo telegram_user_id ou telegram_chat_id
    const { data: tecnicos, error: tecError } = await supabaseClient
      .from('tecnicos')
      .select('id, nome, equipamento_id, cargo')
      .or(`telegram_id.eq.${telegramUserId},telegram_id.eq.${telegramChatId}`) as { data: Array<{ id: string; nome: string; equipamento_id: string | null; cargo: string }> | null; error: unknown };

    if (tecError || !tecnicos || tecnicos.length === 0) {
      console.log(`Técnico não encontrado para o Telegram ID: ${telegramUserId}`);

      const keyboard = {
        keyboard: [[{ text: '📱 Compartilhar meu Telefone', request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true
      };

      await sendTelegramMessage(
        telegramChatId,
        '❌ *Usuário do Telegram não cadastrado.*\nPara vincular seu Telegram ao sistema automaticamente, compartilhe seu contato clicando no botão abaixo:',
        keyboard
      );
      return NextResponse.json({ ok: true, message: 'Técnico não cadastrado.' }, { status: 200 });
    }

    const tecnico = tecnicos[0];

    if (!tecnico.equipamento_id) {
      await sendTelegramMessage(
        telegramChatId,
        `❌ O técnico *${tecnico.nome}* está cadastrado mas não possui um Equipamento de Referência vinculado. Entre em contato com o administrador.`
      );
      return NextResponse.json({ ok: true, message: 'Técnico sem equipamento vinculado.' }, { status: 200 });
    }

    // ── CHECAGEM DE SESSÃO PENDENTE DE CONFIRMAÇÃO ───────────────────────────
    // [BUG-04] Ignora sessões com mais de 24 horas (TTL)
    const vintequatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: sessaoPendente, error: sessaoError } = await (supabaseClient
      .from('sessoes_pendentes')
      .select('id, jovem_id, dados_extraidos, jovens(nome_completo)')
      .eq('telegram_chat_id', telegramChatId)
      .gte('created_at', vintequatroHorasAtras)
      .maybeSingle()) as { data: { id: string; jovem_id: string; dados_extraidos: { assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null; resumo?: string | null; }; jovens: { nome_completo: string } | { nome_completo: string }[] | null } | null; error: unknown };

    // ── CONFIGURAÇÕES DO GOOGLE GEMINI ───────────────────────────────────────
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('GOOGLE_GENERATIVE_AI_API_KEY não configurada.');
      return NextResponse.json({ error: 'Erro interno de configuração de IA.' }, { status: 500 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN não configurada.');
      return NextResponse.json({ error: 'Erro interno de configuração do Telegram.' }, { status: 500 });
    }

    let base64Media = '';
    let mimeType = 'audio/ogg';

    if (isAudio) {
      const audioObj = message.voice || message.audio;
      const fileId = audioObj.file_id;
      mimeType = audioObj.mime_type || 'audio/ogg';

      const fileResult = await downloadTelegramFile(fileId, token);
      if (fileResult) {
        base64Media = fileResult;
      } else {
        await sendTelegramMessage(
          telegramChatId,
          '⚠️ Não consegui processar o áudio enviado. Por favor, tente enviar novamente.'
        );
        return NextResponse.json({ ok: true, message: 'Falha ao baixar áudio.' }, { status: 200 });
      }
    }

    // ── FLUXO A: COM SESSÃO PENDENTE (ETAPA 2 - CONFIRMAR / CANCELAR / CORRIGIR) ──
    if (sessaoPendente) {
      const jovensInfo = sessaoPendente.jovens as { nome_completo: string } | { nome_completo: string }[] | null;
      const nomeJovem = Array.isArray(jovensInfo)
        ? jovensInfo[0]?.nome_completo
        : jovensInfo?.nome_completo;

      const promptConfirmacao = `
        Você é um assistente inteligente de análise de dados. Um técnico educacional ou social está interagindo com uma proposta de acompanhamento pendente para o jovem "${nomeJovem || 'Não identificado'}" que ainda não foi salva de forma definitiva no banco de dados.
        
        Dados atuais da proposta pendente:
        - Assiduidade: "${sessaoPendente.dados_extraidos.assiduidade || 'Não informado'}"
        - Desempenho: "${sessaoPendente.dados_extraidos.desempenho || 'Não informado'}"
        - Comportamento: "${sessaoPendente.dados_extraidos.comportamento || 'Não informado'}"
        - Resumo: "${sessaoPendente.dados_extraidos.resumo || 'Não informado'}"
        
        Mensagem recebida do técnico (pode ser texto ou áudio):
        "${messageText}"
        
        Sua tarefa é analisar a mensagem e determinar a AÇÃO do técnico:
        1. 'confirmar': se ele concordar, disser que está certo, falar que pode salvar, der ok, sim, confirmar, etc. (ex: "sim", "confirmar", "ok", "está certo", "salvar", "pode salvar", "positivo", "fechou", "isso", "correto").
        2. 'cancelar': se ele mandar cancelar, rejeitar explicitamente, falar para não salvar, esquecer, etc. (ex: "não", "cancelar", "cancela", "esquece", "apaga", "não salvar", "descartar", "rejeitar").
        3. 'corrigir': se ele trouxer novas informações ou mandar alterar algum campo (ex: "ele faltou", "comportamento foi bom", "mude o desempenho para excelente", "o resumo deve dizer que ele participou mais", "na verdade foi ruim").
        
        Se a ação for 'corrigir', você deve atualizar os dados, MESCLANDO os valores anteriores da proposta com as novas correções informadas pelo técnico. Os campos não alterados devem ser mantidos idênticos. Retorne o objeto 'dados_atualizados' com os novos valores estruturados.
      `;

      let aiMessagesEtapa2: ModelMessage[] = [];
      if (isAudio) {
        aiMessagesEtapa2 = [{
          role: 'user',
          content: [
            { type: 'text', text: promptConfirmacao },
            { type: 'file', data: base64Media, mediaType: mimeType },
          ],
        }];
      } else {
        aiMessagesEtapa2 = [{
          role: 'user',
          content: [{ type: 'text', text: promptConfirmacao }],
        }];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let dadosConfirmacao;
      let usageEtapa2;

      try {
        const response = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: z.object({
            acao: z.enum(['confirmar', 'cancelar', 'corrigir']).describe('Ação decidida com base na mensagem do técnico'),
            dados_atualizados: z.object({
              assiduidade: z.string().nullable().describe('Assiduidade atualizada ou mantida'),
              desempenho: z.string().nullable().describe('Desempenho atualizado ou mantido'),
              comportamento: z.string().nullable().describe('Comportamento atualizado ou mantido'),
              resumo: z.string().nullable().describe('Resumo atualizado ou mantido'),
            }).describe('Novos dados a serem salvos se a ação for corrigir'),
          }),
          messages: aiMessagesEtapa2,
          abortSignal: controller.signal,
        });
        dadosConfirmacao = response.object;
        usageEtapa2 = response.usage;
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          console.warn(`[TIMEOUT] AI processing took more than 30s in Etapa 2.`);
          await sendTelegramMessage(
            telegramChatId,
            `⚠️ *Tempo de processamento esgotado!*\nA inteligência artificial demorou mais de 30 segundos para responder. Por favor, tente enviar sua mensagem novamente.`
          );
          return NextResponse.json({ ok: true, message: 'AI processing timeout' }, { status: 200 });
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      console.log(
        `[TOKEN USAGE] Etapa 2 (Confirmar/Corrigir) | chat_id: ${telegramChatId} | ` +
        `Prompt: ${usageEtapa2?.inputTokens ?? '?'} | ` +
        `Resposta: ${usageEtapa2?.outputTokens ?? '?'} | ` +
        `Total: ${usageEtapa2?.totalTokens ?? '?'} tokens`
      );

      const { acao, dados_atualizados } = dadosConfirmacao;

      if (acao === 'confirmar') {
        // [BUG-05] Re-busca a sessão para garantir que usamos os dados mais recentes
        // (podem ter sido atualizados em um 'corrigir' anterior)
        const { data: sessaoAtualizada } = await (supabaseClient
          .from('sessoes_pendentes')
          .select('dados_extraidos')
          .eq('id', sessaoPendente.id)
          .single()) as { data: { dados_extraidos: { assiduidade?: string | null; desempenho?: string | null; comportamento?: string | null; resumo?: string | null; } } | null };

        const dadosFinais = sessaoAtualizada?.dados_extraidos ?? sessaoPendente.dados_extraidos;

        // Insere o Acompanhamento definitivo no banco
        const { error: acError } = await (supabaseClient
          .from('acompanhamentos') as any)
          .insert({
            jovem_id: sessaoPendente.jovem_id,
            resumo: dadosFinais.resumo || null,
            assiduidade: dadosFinais.assiduidade ? String(dadosFinais.assiduidade).slice(0, 50) : null,
            desempenho: dadosFinais.desempenho ? String(dadosFinais.desempenho).slice(0, 50) : null,
            comportamento: dadosFinais.comportamento ? String(dadosFinais.comportamento).slice(0, 50) : null,
            data_registro: new Date().toISOString(),
          });

        if (acError) {
          console.error('Erro ao inserir acompanhamento:', acError);
          await sendTelegramMessage(telegramChatId, '❌ Ocorreu um erro ao salvar o registro. Tente novamente mais tarde.');
          return NextResponse.json({ error: 'Erro ao salvar acompanhamento' }, { status: 500 });
        }

        // [BUG-05] Lógica da Gamificação usa os dados FINAIS (após possíveis correções)
        const ganhouPontos =
          (dadosFinais.desempenho && dadosFinais.desempenho.toLowerCase().includes('excelente')) ||
          (dadosFinais.comportamento && dadosFinais.comportamento.toLowerCase().includes('excelente'));

        if (ganhouPontos) {
          try {
            const { error: ptsErr } = await (supabaseClient as any)
              .rpc('incrementar_pontos_jovem', {
                p_jovem_id: sessaoPendente.jovem_id,
                p_pontos: 15
              });
            if (ptsErr) throw ptsErr;
          } catch (ptsErr) {
            console.error('Erro ao somar pontos da gamificação:', ptsErr);
          }
        }

        // Deleta a sessão pendente
        await (supabaseClient.from('sessoes_pendentes') as any)
          .delete()
          .eq('id', sessaoPendente.id);

        let confirmacao = `✅ *Acompanhamento registrado com sucesso no banco de dados!*

👤 *Jovem:* ${nomeJovem || 'Não identificado'}
📋 *Resumo:* ${dadosFinais.resumo || '_Não informado_'}
📅 *Assiduidade:* ${dadosFinais.assiduidade || '_Não informado_'}
📈 *Desempenho:* ${dadosFinais.desempenho || '_Não informado_'}
💬 *Comportamento:* ${dadosFinais.comportamento || '_Não informado_'}`;

        if (ganhouPontos) {
          confirmacao += `\n\n🏆 *Jovem ganhou +15 Descubra Points!*`;
        }

        await sendTelegramMessage(telegramChatId, confirmacao);
        return NextResponse.json({ ok: true, success: true }, { status: 200 });

      } else if (acao === 'cancelar') {
        await (supabaseClient.from('sessoes_pendentes') as any)
          .delete()
          .eq('id', sessaoPendente.id);

        await sendTelegramMessage(telegramChatId, '❌ *Operação cancelada!* O registro de acompanhamento pendente foi descartado e não foi salvo.');
        return NextResponse.json({ ok: true, success: true, message: 'Cancelado com sucesso.' }, { status: 200 });

      } else if (acao === 'corrigir') {
        await (supabaseClient.from('sessoes_pendentes') as any)
          .update({ dados_extraidos: dados_atualizados })
          .eq('id', sessaoPendente.id);

        const retorno = `📝 *Resumo do Acompanhamento Atualizado:*

👤 *Jovem:* ${nomeJovem || 'Não identificado'}
📋 *Resumo:* ${dados_atualizados.resumo || '_Não informado_'}
📅 *Assiduidade:* ${dados_atualizados.assiduidade || '_Não informado_'}
📈 *Desempenho:* ${dados_atualizados.desempenho || '_Não informado_'}
💬 *Comportamento:* ${dados_atualizados.comportamento || '_Não informado_'}

📌 *Os dados atualizados estão corretos?*
• Responda *Sim*, *Confirmar* ou *Ok* para salvar de forma permanente no banco de dados.
• Ou envie novas correções (texto ou áudio).
• Responda *Cancelar* para descartar este registro.`;

        await sendTelegramMessage(telegramChatId, retorno);
        return NextResponse.json({ ok: true, success: true, message: 'Corrigido e aguardando confirmação.' }, { status: 200 });
      }
    }

    // ── FLUXO B: SEM SESSÃO PENDENTE (ETAPA 1 - CAPTURA INICIAL DO RELATO) ──────
    const promptBase = `
      Você é um assistente de análise de dados. Um técnico educacional ou social enviou a seguinte mensagem no Telegram reportando sobre um jovem.

      Extraia as informações necessárias para preencher os campos.
      Se não houver menção explícita a algum dos campos (como desempenho ou comportamento), retorne null para aquele campo.
    `;

    let aiMessages: ModelMessage[] = [];

    if (isAudio) {
      aiMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: promptBase },
          { type: 'file', data: base64Media, mediaType: mimeType },
        ],
      }];
    } else {
      aiMessages = [{
        role: 'user',
        content: [{ type: 'text', text: promptBase + `\n\nMensagem do técnico:\n"${messageText}"` }],
      }];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let dados_ia;
    let usageEtapa1;

    try {
      const response = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: z.object({
          aluno: z.string().describe('O nome do aluno mencionado na mensagem'),
          assiduidade: z.string().nullable().describe('Frequência/assiduidade (ex: boa, faltou, presente)'),
          desempenho: z.string().nullable().describe('Desempenho do aluno (ex: excelente, com dificuldades)'),
          comportamento: z.string().nullable().describe('Comportamento (ex: participativo, agitado)'),
          resumo: z.string().nullable().describe('Breve resumo profissional da mensagem'),
        }),
        messages: aiMessages,
        abortSignal: controller.signal,
      });
      dados_ia = response.object;
      usageEtapa1 = response.usage;
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.warn(`[TIMEOUT] AI processing took more than 30s in Etapa 1.`);
        await sendTelegramMessage(
          telegramChatId,
          `⚠️ *Tempo de processamento esgotado!*\nA inteligência artificial demorou mais de 30 segundos para responder. Por favor, tente enviar sua mensagem novamente.`
        );
        return NextResponse.json({ ok: true, message: 'AI processing timeout' }, { status: 200 });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(
      `[TOKEN USAGE] Etapa 1 (Extracao) | chat_id: ${telegramChatId} | ` +
      `Prompt: ${usageEtapa1?.inputTokens ?? '?'} | ` +
      `Resposta: ${usageEtapa1?.outputTokens ?? '?'} | ` +
      `Total: ${usageEtapa1?.totalTokens ?? '?'} tokens`
    );

    const { aluno, assiduidade, desempenho, comportamento, resumo } = dados_ia;

    if (!aluno || !aluno.trim() || aluno.toLowerCase() === 'null') {
      await sendTelegramMessage(
        telegramChatId,
        '⚠️ Não consegui identificar o nome do jovem na sua mensagem. Por favor, mencione o nome completo do aluno e tente novamente.\n\nExemplo: _"O jovem João Silva teve um bom desempenho hoje..."_'
      );
      return NextResponse.json({ ok: true, message: 'Nome do aluno não identificado.' }, { status: 200 });
    }

    // Normaliza o nome extraído pela IA (remove caracteres especiais e wildcards SQL)
    const cleanAluno = aluno.replace(/[%_]/g, '').trim();
    const queryNome = normalizarNome(cleanAluno);

    if (queryNome.length < 3) {
      await sendTelegramMessage(
        telegramChatId,
        '⚠️ O nome do jovem identificado é muito curto ou inválido. Por favor, forneça o nome completo ou pelo menos um nome com mais de 3 letras.'
      );
      return NextResponse.json({ ok: true, message: 'Nome do aluno inválido.' }, { status: 200 });
    }

    let queryJovens = (supabaseClient
      .from('jovens') as any)
      .select('id, nome_completo, nome_social');

    if (tecnico.cargo !== 'admin') {
      queryJovens = queryJovens.eq('equipamento_id', tecnico.equipamento_id);
    }

    const { data: jovens, error: jovensError } = await queryJovens as { data: Array<{ id: string; nome_completo: string; nome_social: string | null }> | null; error: unknown };

    if (jovensError || !jovens || jovens.length === 0) {
      await sendTelegramMessage(
        telegramChatId,
        `⚠️ Não encontrei nenhum jovem cadastrado no seu Equipamento de Referência.`
      );
      return NextResponse.json({ ok: true, message: 'Equipamento sem jovens cadastrados.' }, { status: 200 });
    }

    let melhorJovem: typeof jovens[0] | null = null;
    let maiorScore = 0;

    for (const j of jovens) {
      const scoreCompleto = calcularSimilaridade(queryNome, j.nome_completo);
      const scoreSocial = j.nome_social ? calcularSimilaridade(queryNome, j.nome_social) : 0;
      const scoreJovem = Math.max(scoreCompleto, scoreSocial);

      if (scoreJovem > maiorScore && scoreJovem >= 0.45) {
        maiorScore = scoreJovem;
        melhorJovem = j;
      }
    }

    if (!melhorJovem) {
      await sendTelegramMessage(
        telegramChatId,
        `⚠️ Não encontrei nenhum jovem no seu Equipamento de Referência com nome semelhante a *"${queryNome}"*. Verifique a grafia e tente novamente.`
      );
      return NextResponse.json({ ok: true, message: 'Jovem não encontrado por aproximação.' }, { status: 200 });
    }

    const jovemSelecionado = melhorJovem;

    // [BUG-04] Limpa sessões pendentes antigas (expiradas há mais de 24h) do mesmo chat
    await (supabaseClient.from('sessoes_pendentes') as any)
      .delete()
      .eq('telegram_chat_id', telegramChatId);

    // Insere na sessão pendente
    const { error: insertSessaoError } = await (supabaseClient
      .from('sessoes_pendentes') as any)
      .insert({
        tecnico_id: tecnico.id,
        telegram_chat_id: telegramChatId,
        jovem_id: jovemSelecionado.id,
        dados_extraidos: {
          aluno: jovemSelecionado.nome_completo,
          assiduidade: assiduidade || null,
          desempenho: desempenho || null,
          comportamento: comportamento || null,
          resumo: resumo || null
        }
      });

    if (insertSessaoError) {
      console.error('Erro ao salvar proposta pendente:', insertSessaoError);
      await sendTelegramMessage(telegramChatId, '❌ Ocorreu um erro ao preparar a proposta de acompanhamento. Tente novamente.');
      return NextResponse.json({ error: 'Erro ao criar proposta pendente' }, { status: 500 });
    }

    const propostaText = `📝 *Proposta de Acompanhamento Extraída:*

👤 *Jovem:* ${jovemSelecionado.nome_completo}
📋 *Resumo:* ${resumo || '_Não informado_'}
📅 *Assiduidade:* ${assiduidade || '_Não informado_'}
📈 *Desempenho:* ${desempenho || '_Não informado_'}
💬 *Comportamento:* ${comportamento || '_Não informado_'}

📌 *Os dados estão corretos?*
• Responda *Sim*, *Confirmar* ou *Ok* para salvar de forma permanente no banco de dados.
• Ou escreva/fale as correções (ex: *Mude o comportamento para Excelente*).
• Responda *Cancelar* para descartar este registro.`;

    await sendTelegramMessage(telegramChatId, propostaText);

    return NextResponse.json({ ok: true, success: true }, { status: 200 });

  } catch (err: unknown) {
    console.error('Erro no webhook do Telegram:', err);
    if (telegramChatId) {
      await sendTelegramMessage(
        telegramChatId,
        '❌ *Erro Interno:* Desculpe, ocorreu uma instabilidade ao salvar o acompanhamento ou ao conectar com a IA. Por favor, tente enviar novamente em alguns instantes.'
      );
    }
    return NextResponse.json({ ok: true, success: false, message: 'Erro interno tratado e notificado' }, { status: 200 });
  }
}

// ── FUNÇÃO AUXILIAR: Enviar Mensagem de Resposta via Telegram ────────────────
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN não configurado.');
    return;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem pelo Telegram:', error);
  }
}

// ── FUNÇÃO AUXILIAR: Baixar arquivo do Telegram ──────────────────────────────
async function downloadTelegramFile(fileId: string, token: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const json = await response.json();
    if (!json.ok || !json.result?.file_path) {
      console.error('Erro ao obter caminho do arquivo do Telegram:', json);
      return null;
    }

    const filePath = json.result.file_path;
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    const arrayBuffer = await fileResponse.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Erro no download do arquivo do Telegram:', error);
    return null;
  }
}
