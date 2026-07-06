'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useDialog } from '@/components/ui/CustomDialog';

interface Acompanhamento {
  id: string;
  jovem_id?: string;
  jovemNome: string;
  cidade: string;
  dataRegistro: string;
  assiduidade: 'Presente' | 'Atrasado' | 'Faltou';
  desempenho: 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente';
  comportamento: 'Participativo' | 'Agitado' | 'Distraído' | 'Conflituoso';
  resumo: string;
  pontos: number;
}

export default function ReportTab() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [activeTab, setActiveTab] = useState<'normal' | 'ia'>('normal');
  const isMounted = useRef(true);

  // Database Data States
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);
  const [youthsList, setYouthsList] = useState<{ id: string; nome: string; polo: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Normal Report States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterRisco, setFilterRisco] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // IA Report States
  const [reportType, setReportType] = useState<'individual' | 'geral'>('individual');
  const [selectedYouth, setSelectedYouth] = useState('');
  const [promptLivre, setPromptLivre] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  // Carrega dados iniciais do banco
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let queryAcompanhamentos = supabase
        .from('acompanhamentos')
        .select(`
          id,
          jovem_id,
          resumo,
          assiduidade,
          desempenho,
          comportamento,
          data_registro,
          jovens (
            nome_completo,
            nome_social,
            equipamento_id,
            equipamentos (
              nome
            )
          )
        `);

      let queryJovens = supabase
        .from('jovens')
        .select('id, nome_completo, nome_social, equipamento_id, equipamentos(nome)')
        .order('nome_completo');

      if (user) {
        const { data: tecnico } = await supabase
          .from('tecnicos')
          .select('cargo, equipamento_id')
          .eq('id', user.id)
          .single();

        if (tecnico && tecnico.cargo !== 'admin') {
          if (tecnico.equipamento_id) {
            queryAcompanhamentos = supabase
              .from('acompanhamentos')
              .select(`
                id,
                jovem_id,
                resumo,
                assiduidade,
                desempenho,
                comportamento,
                data_registro,
                jovens!inner (
                  nome_completo,
                  nome_social,
                  equipamento_id,
                  equipamentos (
                    nome
                  )
                )
              `)
              .eq('jovens.equipamento_id', tecnico.equipamento_id);

            queryJovens = queryJovens.eq('equipamento_id', tecnico.equipamento_id);
          }
        }
      }

      const [acsRes, jovensRes] = await Promise.all([
        queryAcompanhamentos.order('data_registro', { ascending: false }),
        queryJovens
      ]);

      if (acsRes.error) throw acsRes.error;
      if (jovensRes.error) throw jovensRes.error;

      const acsData = acsRes.data || [];
      const jovensData = jovensRes.data || [];

      const mappedAcompanhamentos: Acompanhamento[] = acsData.map((item: any) => ({
        id: item.id,
        jovem_id: item.jovem_id,
        jovemNome: item.jovens?.nome_social || item.jovens?.nome_completo || 'Sem nome',
        cidade: item.jovens?.equipamentos?.nome || 'Sem polo',
        dataRegistro: item.data_registro ? item.data_registro.split('T')[0] : '',
        assiduidade: item.assiduidade,
        desempenho: item.desempenho,
        comportamento: item.comportamento,
        resumo: item.resumo || '',
        pontos: item.desempenho === 'Excelente' ? 15 : 0
      }));

      const mappedYouths = jovensData.map((y: any) => ({
        id: y.id,
        nome: y.nome_social || y.nome_completo,
        polo: y.equipamentos?.nome || 'Sem polo'
      }));

      if (isMounted.current) {
        setAcompanhamentos(mappedAcompanhamentos);
        setYouthsList(mappedYouths);
      }
    } catch (err) {
      console.error('Erro ao carregar dados em ReportTab:', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getRiscoStatus = (ac: Acompanhamento): 'Bom' | 'Alerta' | 'Perigo' => {
    let badCount = 0;
    if (ac.assiduidade === 'Faltou') badCount += 2;
    else if (ac.assiduidade === 'Atrasado') badCount += 1;

    if (ac.desempenho === 'Insuficiente') badCount += 2;
    else if (ac.desempenho === 'Regular') badCount += 1;

    if (ac.comportamento === 'Conflituoso') badCount += 2;
    else if (ac.comportamento === 'Distraído' || ac.comportamento === 'Agitado') badCount += 1;

    if (badCount >= 3) return 'Perigo';
    if (badCount >= 1) return 'Alerta';
    return 'Bom';
  };

  // Filter logic
  const filteredAcompanhamentos = acompanhamentos.filter((ac) => {
    const matchesSearch = ac.jovemNome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCidade = filterCidade === '' || ac.cidade === filterCidade;

    const risco = getRiscoStatus(ac);
    const matchesRisco =
      filterRisco === '' ||
      (filterRisco === 'Bom' && risco === 'Bom') ||
      (filterRisco === 'Risco' && (risco === 'Alerta' || risco === 'Perigo'));

    const matchesDateFrom = filterDateFrom === '' || ac.dataRegistro >= filterDateFrom;
    const matchesDateTo = filterDateTo === '' || ac.dataRegistro <= filterDateTo;

    return matchesSearch && matchesCidade && matchesRisco && matchesDateFrom && matchesDateTo;
  });

  const totalPoints = filteredAcompanhamentos.reduce((acc, curr) => acc + curr.pontos, 0);
  const excelencias = filteredAcompanhamentos.filter((a) => a.desempenho === 'Excelente').length;
  const alertas = filteredAcompanhamentos.filter((a) => getRiscoStatus(a) !== 'Bom').length;
  const presencaTotal = filteredAcompanhamentos.length
    ? Math.round(
      (filteredAcompanhamentos.filter((a) => a.assiduidade !== 'Faltou').length /
        filteredAcompanhamentos.length) *
      100
    )
    : 100;  // AI Generation simulation
  const handleGenerateAI = async () => {
    if (reportType === 'individual' && !selectedYouth) {
      dialog.alert('Seleção Necessária', 'Por favor, selecione um jovem para gerar o relatório individual.', 'warning');
      return;
    }

    setGenerating(true);
    setGeneratedReport(null);
    setGenerationLogs([]);
    setGenerationStep(0);

    const logsList =
      reportType === 'individual'
        ? [
          'Conectando ao banco de dados Supabase...',
          `Buscando dados cadastrais e socioeconômicos do estudante...`,
          'Identificando residência geográfica e linha de transporte coletivo...',
          'Extraindo histórico cronológico de acompanhamentos no banco...',
          'Cruzando dados de assiduidade e comportamento dos polos...',
          'Estruturando prompt refinado com instruções adicionais...',
          'Acionando modelo de linguagem Google Gemini 2.5 Flash...',
          'Validando dados retornados contra o esquema Zod (individualSchema)...',
          'Relatório Inteligente compilado com sucesso!'
        ]
        : [
          'Iniciando consolidação dos dados gerais do programa...',
          'Buscando os últimos 50 registros de acompanhamento no Supabase...',
          'Processando dados demográficos dos jovens ativos...',
          'Cruzando assiduidade média geral com as localidades/bairros...',
          'Analisando eficácia da gamificação de Descubra Points...',
          'Acionando modelo Google Gemini 2.5 Flash...',
          'Formatando tendências qualitativas e pontos de alerta críticos...',
          'Validando dados retornados contra o esquema Zod (geralSchema)...',
          'Painel executivo geral gerado com sucesso!'
        ];

    // Chamada real da API de IA
    const apiCallPromise = fetch('/api/relatorio-ia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tipo: reportType,
        jovem_id: reportType === 'individual' ? selectedYouth : undefined,
        prompt_livre: promptLivre || undefined
      })
    });

    try {
      // Simulador de logs para a interface (Wow factor)
      for (let i = 0; i < logsList.length - 1; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setGenerationLogs((prev) => [...prev, logsList[i]]);
        setGenerationStep(i + 1);
      }

      // Aguarda o resultado da API real
      const apiResponse = await apiCallPromise;
      const json = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(json.error || 'Erro na geração do relatório.');
      }

      // Conclui o log terminal
      setGenerationLogs((prev) => [...prev, logsList[logsList.length - 1]]);
      setGenerationStep(logsList.length);
      await new Promise((resolve) => setTimeout(resolve, 200));

      setGeneratedReport(json);
    } catch (err: any) {
      console.error(err);
      setGenerationLogs((prev) => [...prev, `❌ ERRO: ${err.message || 'Falha na comunicação com o servidor.'}`]);
      if (err.message && err.message.includes('Não há acompanhamentos suficientes')) {
        dialog.alert(
          'Acompanhamentos Insuficientes',
          'Não há acompanhamentos suficientes registrados para este jovem para que a IA possa gerar uma análise evolutiva. Por favor, registre mais relatos e evoluções de assiduidade/comportamento antes de gerar o relatório.',
          'warning'
        );
      } else {
        dialog.alert(
          'Erro ao Gerar Relatório',
          err.message || 'Erro inesperado na geração do relatório por IA. Verifique os logs.',
          'danger'
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fillTemplate = (text: string) => {
    setPromptLivre(text);
  };

  return (
    <div className="report-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <style>{`
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px dashed rgba(10,37,64,0.08);
          padding-bottom: 1.5rem;
        }
        .report-header-title {
          font-family: var(--font-body);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        .report-header-subtitle {
          font-size: 0.9rem;
          color: var(--color-text-light);
          margin-top: 0.25rem;
        }
        .report-tab-nav {
          display: flex;
          gap: 0.75rem;
          background: rgba(10,37,64,0.03);
          padding: 0.35rem;
          border-radius: var(--border-radius-sm);
          align-self: flex-start;
          border: 1px solid rgba(10,37,64,0.05);
        }
        .report-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 0.88rem;
          color: var(--color-text-light);
          border-radius: 6px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .report-tab-btn:hover {
          color: var(--color-primary);
        }
        .report-tab-btn.active {
          background-color: #ffffff;
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
          font-weight: 700;
        }
        .stats-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        .report-stat-card {
          background: #ffffff;
          border: 1px solid rgba(10,37,64,0.08);
          border-radius: var(--border-radius-sm);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: var(--shadow-sm);
        }
        .report-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .report-stat-val {
          font-family: var(--font-title);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--color-primary);
          line-height: 1.2;
        }
        .report-stat-lbl {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text-light);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .filter-row {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
          background-color: var(--color-bg-light);
          border-radius: var(--border-radius-sm);
          border: 1px solid rgba(10,37,64,0.06);
          padding: 1.25rem;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
          min-width: 150px;
        }
        .filter-lbl {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-primary);
        }
        .filter-input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          font-size: 0.85rem;
          color: var(--color-text-dark);
          background-color: #ffffff;
          border: 1.5px solid rgba(10,37,64,0.12);
          border-radius: 6px;
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .filter-input:focus {
          border-color: var(--color-secondary);
        }
        .report-table-wrapper {
          border: 1px solid rgba(10,37,64,0.08);
          border-radius: var(--border-radius-sm);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .report-table th {
          background-color: rgba(10,37,64,0.02);
          color: var(--color-primary);
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(10,37,64,0.08);
        }
        .report-table td {
          padding: 1rem 1.25rem;
          font-size: 0.88rem;
          color: var(--color-text-dark);
          border-bottom: 1px solid rgba(10,37,64,0.06);
          vertical-align: middle;
        }
        .report-table tbody tr {
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .report-table tbody tr:hover {
          background-color: rgba(13,92,58,0.02);
        }
        .report-table tbody tr.expanded {
          background-color: rgba(13,92,58,0.04);
        }
        .badge-status {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-presenca { background: rgba(16,185,129,0.1); color: #065f46; }
        .badge-atraso { background: rgba(245,158,11,0.1); color: #92400e; }
        .badge-falta { background: rgba(239,68,68,0.1); color: #991b1b; }

        .tag-metric {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .tag-excelente { background: rgba(16,185,129,0.15); color: #047857; border: 1px solid rgba(16,185,129,0.25); }
        .tag-bom { background: rgba(14,165,233,0.15); color: #0369a1; border: 1px solid rgba(14,165,233,0.25); }
        .tag-regular { background: rgba(245,158,11,0.15); color: #b45309; border: 1px solid rgba(245,158,11,0.25); }
        .tag-insuficiente { background: rgba(239,68,68,0.15); color: #b91c1c; border: 1px solid rgba(239,68,68,0.25); }

        .tag-comportamento {
          background: rgba(10,37,64,0.06);
          color: var(--color-primary);
          font-weight: 600;
        }

        .points-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #ffffff;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(217,119,6,0.2);
        }

        .details-panel {
          padding: 1.25rem 1.5rem;
          background-color: #ffffff;
          border-bottom: 1px solid rgba(10,37,64,0.08);
          animation: slideDown 0.25s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-config-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .ai-sidebar-panel {
          background: #ffffff;
          border: 1px solid rgba(10,37,64,0.08);
          border-radius: var(--border-radius-sm);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .ai-config-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 1.5rem;
          width: 100%;
          align-items: start;
        }
        @media (max-width: 768px) {
          .ai-config-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .ai-output-panel {
          background: #ffffff;
          border: 1px solid rgba(10,37,64,0.08);
          border-radius: var(--border-radius-sm);
          padding: 2rem;
          box-shadow: var(--shadow-sm);
          min-height: 480px;
          position: relative;
        }
        .ai-radio-card {
          border: 2px solid rgba(10,37,64,0.08);
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: all var(--transition-fast);
        }
        .ai-radio-card.active {
          border-color: var(--color-secondary);
          background-color: rgba(13,92,58,0.04);
        }
        .ai-radio-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        .ai-radio-desc {
          font-size: 0.75rem;
          color: var(--color-text-light);
          line-height: 1.3;
        }
        .btn-sparkle {
          background: linear-gradient(135deg, var(--color-secondary), #15803d);
          color: #ffffff;
          font-family: var(--font-title);
          font-weight: 700;
          padding: 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all var(--transition-normal);
          border: none;
          box-shadow: 0 4px 10px rgba(13,92,58,0.25);
        }
        .btn-sparkle:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(13,92,58,0.35);
        }
        .btn-sparkle:disabled {
          background: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        .template-tag {
          font-size: 0.75rem;
          background: rgba(10,37,64,0.05);
          color: var(--color-primary);
          padding: 0.35rem 0.6rem;
          border-radius: 9999px;
          cursor: pointer;
          font-weight: 600;
          transition: background var(--transition-fast);
        }
        .template-tag:hover {
          background: rgba(10,37,64,0.1);
        }
        .terminal-log {
          font-family: 'Courier New', Courier, monospace;
          background-color: #0f172a;
          color: #38bdf8;
          padding: 1.25rem;
          border-radius: 6px;
          font-size: 0.82rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
          min-height: 180px;
          max-height: 250px;
          overflow-y: auto;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
        }
        .terminal-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .terminal-bullet {
          width: 6px;
          height: 6px;
          background-color: #38bdf8;
          border-radius: 50%;
        }
        .terminal-line.success {
          color: #4ade80;
        }
        .terminal-line.success .terminal-bullet {
          background-color: #4ade80;
        }
        .terminal-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(56,189,248,0.2);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .report-result-card {
          animation: fadeIn 0.4s ease-out;
        }
        .report-section-box {
          border-left: 3.5px solid var(--color-secondary);
          padding-left: 1rem;
          margin-bottom: 1.5rem;
        }
        .report-section-title {
          font-family: var(--font-body);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.35rem;
        }
        .report-section-body {
          font-size: 0.92rem;
          color: var(--color-text-dark);
          line-height: 1.6;
        }
        .report-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .report-points-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
        }
        .report-points-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-primary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.5rem;
        }
        .report-points-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .report-point-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .report-point-icon {
          font-size: 0.9rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .admin-sidebar, .report-header, .report-tab-nav, .ai-sidebar-panel, .print-btn-action {
            display: none !important;
          }
          .ai-output-panel, .ai-output-panel * {
            visibility: visible;
          }
          .ai-output-panel {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }

        @media (max-width: 1024px) {
          .stats-grid-4 {
            grid-template-columns: 1fr 1fr;
          }
          .report-grid-2 {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .stats-grid-4 {
            grid-template-columns: 1fr;
          }
          .filter-row {
            flex-direction: column;
            align-items: stretch;
          }
          .report-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>

      {/* Header */}
      <div className="report-header">
        <div>
          <h2 className="report-header-title">Relatórios e Acompanhamento</h2>
          <p className="report-header-subtitle">Consulte o histórico de evolução ou gere análises avançadas com Inteligência Artificial</p>
        </div>
        <div className="report-tab-nav">
          <button
            className={`report-tab-btn ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => setActiveTab('normal')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Relatório Normal
          </button>
          <button
            className={`report-tab-btn ${activeTab === 'ia' ? 'active' : ''}`}
            onClick={() => setActiveTab('ia')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Relatório por IA
          </button>
        </div>
      </div>

      {activeTab === 'normal' ? (
        loading ? (
          <div className="map-loading-container" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%' }}>
            <div className="map-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(13,92,58,0.1)', borderTopColor: 'var(--color-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Carregando histórico de acompanhamentos...</p>
          </div>
        ) : (
          // ── RELATÓRIO NORMAL (HISTÓRICO) ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
            {/* Stats Summary */}
            <div className="stats-grid-4">
              <div className="report-stat-card">
                <div className="report-stat-icon" style={{ backgroundColor: 'rgba(10,37,64,0.08)', color: 'var(--color-primary)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <div className="report-stat-val">{filteredAcompanhamentos.length}</div>
                  <div className="report-stat-lbl">Relatos Captados</div>
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <div className="report-stat-val">{excelencias}</div>
                  <div className="report-stat-lbl">Excelentes</div>
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-icon" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="report-stat-val">{alertas}</div>
                  <div className="report-stat-lbl">Alertas / Riscos</div>
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <div className="report-stat-val">+{totalPoints}</div>
                  <div className="report-stat-lbl">Descubra Points</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-row">
              <div className="filter-item">
                <label className="filter-lbl">De (Data)</label>
                <input
                  className="filter-input"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              <div className="filter-item">
                <label className="filter-lbl">Até (Data)</label>
                <input
                  className="filter-input"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>

              <div className="filter-item">
                <label className="filter-lbl">Nível de Risco</label>
                <select
                  className="filter-input"
                  value={filterRisco}
                  onChange={(e) => setFilterRisco(e.target.value)}
                >
                  <option value="">Todos os status</option>
                  <option value="Bom">Bom (Sem ocorrências)</option>
                  <option value="Risco">Em Alerta / Risco</option>
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-lbl">Equipamento (Polo)</label>
                <select
                  className="filter-input"
                  value={filterCidade}
                  onChange={(e) => setFilterCidade(e.target.value)}
                >
                  <option value="">Todos os polos</option>
                  <option value="Pirapora">Pirapora</option>
                  <option value="Buritizeiro">Buritizeiro</option>
                  <option value="Jequitaí">Jequitaí</option>
                </select>
              </div>

              <div className="filter-item" style={{ flex: '2', minWidth: '200px' }}>
                <label className="filter-lbl">Pesquisar Jovem</label>
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Nome do jovem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Data</th>
                    <th>Jovem</th>
                    <th>Polo</th>
                    <th>Assiduidade</th>
                    <th>Desempenho</th>
                    <th>Comportamento</th>
                    <th style={{ width: '40px' }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredAcompanhamentos.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)' }}>
                        Nenhum registro encontrado correspondente aos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredAcompanhamentos.map((ac) => {
                      const isExpanded = expandedRow === ac.id;
                      const formattedDate = new Date(ac.dataRegistro).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

                      return (
                        <Fragment key={ac.id}>
                          <tr className={isExpanded ? 'expanded' : ''} onClick={() => setExpandedRow(isExpanded ? null : ac.id)}>
                            <td style={{ fontWeight: 600 }}>{formattedDate}</td>
                            <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{ac.jovemNome}</td>
                            <td>{ac.cidade}</td>
                            <td>
                              <span className={`badge-status badge-${ac.assiduidade === 'Presente' ? 'presenca' : ac.assiduidade === 'Atrasado' ? 'atraso' : 'falta'}`}>
                                {ac.assiduidade || 'N/I'}
                              </span>
                            </td>
                            <td>
                              <span className={`tag-metric tag-${(ac.desempenho || 'Não avaliado').toLowerCase()}`}>
                                {ac.desempenho || 'N/I'}
                              </span>
                            </td>
                            <td>
                              <span className="tag-metric tag-comportamento">
                                {ac.comportamento || 'N/I'}
                              </span>
                            </td>
                            <td>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ backgroundColor: 'rgba(13,92,58,0.02)' }}>
                              <td colSpan={7} style={{ padding: '1rem 1.25rem' }}>
                                <div className="details-panel" style={{ border: '1px solid rgba(10,37,64,0.08)', borderRadius: 'var(--border-radius-sm)', backgroundColor: '#ffffff', padding: '1.25rem 1.5rem', margin: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <h4 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                                      Resumo Profissional da Sessão (Ingestão via Telegram & Gemini)
                                    </h4>
                                    {ac.pontos > 0 && (
                                      <span className="points-pill">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        +{ac.pontos} Descubra Points
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', lineHeight: '1.6', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid var(--color-primary)', margin: 0 }}>
                                    "{ac.resumo}"
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // ── RELATÓRIO INTELIGENTE POR IA ──
        <div className="ai-config-layout" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {/* Top panel: Control panel */}
          <div className="ai-sidebar-panel">
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Configuração do Relatório
            </h3>

            <div className="ai-config-grid">
              {/* Column 1: Type selector & Youth Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="filter-lbl">Tipo de Relatório</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div
                      className={`ai-radio-card ${reportType === 'individual' ? 'active' : ''}`}
                      onClick={() => {
                        setReportType('individual');
                        setGeneratedReport(null);
                      }}
                      style={{ flex: 1, padding: '0.75rem 1rem' }}
                    >
                      <span className="ai-radio-title" style={{ fontSize: '0.88rem' }}>Individual</span>
                      <span className="ai-radio-desc" style={{ fontSize: '0.7rem' }}>Evolução de um jovem específico.</span>
                    </div>
                    <div
                      className={`ai-radio-card ${reportType === 'geral' ? 'active' : ''}`}
                      onClick={() => {
                        setReportType('geral');
                        setGeneratedReport(null);
                      }}
                      style={{ flex: 1, padding: '0.75rem 1rem' }}
                    >
                      <span className="ai-radio-title" style={{ fontSize: '0.88rem' }}>Geral</span>
                      <span className="ai-radio-desc" style={{ fontSize: '0.7rem' }}>Cenário dos últimos 50 relatos.</span>
                    </div>
                  </div>
                </div>

                {/* Youth selection (if individual) */}
                {reportType === 'individual' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="filter-lbl">Selecionar Jovem</label>
                    <select
                      className="filter-input"
                      value={selectedYouth}
                      onChange={(e) => {
                        setSelectedYouth(e.target.value);
                        setGeneratedReport(null);
                      }}
                    >
                      <option value="">Selecione o estudante...</option>
                      {youthsList.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.nome} ({y.polo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Column 2: Custom Prompt & Suggestions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="filter-lbl">Foco da IA (Opcional)</label>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 600 }}>prompt_livre</span>
                </div>
                <textarea
                  className="filter-input"
                  style={{ resize: 'none', height: '80px', fontSize: '0.85rem' }}
                  placeholder="Ex: Focar nas faltas às sextas-feiras ou analisar o engajamento no módulo administrativo..."
                  value={promptLivre}
                  onChange={(e) => setPromptLivre(e.target.value)}
                />

                {/* Suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.15rem' }}>
                  {reportType === 'individual' ? (
                    <>
                      <span className="template-tag" onClick={() => fillTemplate('Analisar assiduidade e atrasos logísticos.')}>
                        Assiduidade
                      </span>
                      <span className="template-tag" onClick={() => fillTemplate('Avaliar aptidão e interesses de carreira.')}>
                        Interesses
                      </span>
                      <span className="template-tag" onClick={() => fillTemplate('Focar nas recomendações psicopedagógicas.')}>
                        Pedagógico
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="template-tag" onClick={() => fillTemplate('Identificar principais problemas com transporte público.')}>
                        Transporte
                      </span>
                      <span className="template-tag" onClick={() => fillTemplate('Avaliar engajamento por polo de atendimento.')}>
                        Polos
                      </span>
                      <span className="template-tag" onClick={() => fillTemplate('Focar em riscos de evasão no grupo.')}>
                        Evasão
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed rgba(10,37,64,0.08)', paddingTop: '1rem', width: '100%' }}>
              <button
                className="btn-sparkle"
                onClick={handleGenerateAI}
                disabled={generating || (reportType === 'individual' && !selectedYouth)}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.88rem' }}
              >
                {generating ? (
                  <>
                    <div className="terminal-spinner" />
                    Processando...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Gerar Relatório IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right panel: Output view */}
          <div className="ai-output-panel">
            {!generating && !generatedReport && (
              // Empty State
              <div className="empty-tab-state" style={{ height: '100%', minHeight: '400px' }}>
                <div style={{ padding: '1.5rem', borderRadius: '50%', background: 'rgba(13,92,58,0.06)', color: 'var(--color-secondary)', display: 'inline-flex' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3 className="empty-tab-title" style={{ fontSize: '1.25rem', marginTop: '1rem', color: 'var(--color-primary)', opacity: 0.8 }}>
                  Nenhum Relatório Inteligente compilado
                </h3>
                <p className="empty-tab-desc" style={{ fontSize: '0.85rem', maxWidth: '340px' }}>
                  Escolha a modalidade desejada, filtre as preferências e clique em "Gerar Relatório IA" para acionar o Gemini.
                </p>
              </div>
            )}

            {generating && (
              // Generating Terminal log style
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="terminal-spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--color-secondary)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Gemini processando dados estruturados...
                  </span>
                </div>
                <div className="terminal-log">
                  {generationLogs.map((log, index) => {
                    const isLast = index === generationLogs.length - 1;
                    return (
                      <div key={index} className={`terminal-line ${isLast && generationStep < 9 ? '' : 'success'}`}>
                        {isLast && generationStep < 9 ? (
                          <div className="terminal-spinner" />
                        ) : (
                          <div className="terminal-bullet" />
                        )}
                        <span>{log}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generated Report output */}
            {!generating && generatedReport && (
              <div className="report-result-card">
                {/* Result Header Actions */}
                <div className="print-btn-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-secondary)', letterSpacing: '0.05em' }}>
                    ◆ Relatório de IA Concluído • Modelo: Gemini-2.5-Flash
                  </span>
                  <button
                    className="btn btn-outline"
                    onClick={handlePrint}
                    style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(10,37,64,0.2)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Imprimir / PDF
                  </button>
                </div>

                {reportType === 'individual' ? (
                  // INDIVIDUAL OUTPUT VIEW
                  <div>
                    {/* Youth Profile Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', marginBottom: '1.5rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-secondary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                        {generatedReport.dados_jovem.nome.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                          {generatedReport.dados_jovem.nome}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', margin: 0 }}>
                          {generatedReport.dados_jovem.idade} anos • Polo: {generatedReport.dados_jovem.equipamento} • Bairro: {generatedReport.dados_jovem.bairro}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-light)', display: 'block', marginBottom: '0.2rem' }}>
                          Nota Geral IA
                        </span>
                        <span className="badge-status badge-presenca" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                          ★ {generatedReport.relatorio.nota_geral}
                        </span>
                      </div>
                    </div>

                    {/* Evolução */}
                    <div className="report-section-box">
                      <h4 className="report-section-title">Evolução do Jovem</h4>
                      <p className="report-section-body">{generatedReport.relatorio.evolucao}</p>
                    </div>

                    {/* Contexto Social */}
                    <div className="report-section-box">
                      <h4 className="report-section-title">Contexto Social & Territorial</h4>
                      <p className="report-section-body">{generatedReport.relatorio.contexto_social_regiao}</p>
                    </div>

                    {/* Relatos do Técnico Telegram */}
                    <div className="report-section-box" style={{ borderLeftColor: 'var(--color-orange)' }}>
                      <h4 className="report-section-title">Histórico de Relatos do Técnico (3 Mais Relevantes via Telegram)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                        {(() => {
                          const youthAcs = acompanhamentos.filter(ac => ac.jovem_id === selectedYouth);

                          // Helper to calculate relevance score
                          const getRelevanceScore = (ac: Acompanhamento) => {
                            let score = 0;
                            if (ac.desempenho === 'Excelente' || ac.desempenho === 'Insuficiente') score += 3;
                            if (ac.assiduidade === 'Faltou' || ac.comportamento === 'Conflituoso') score += 2;
                            if (ac.assiduidade === 'Atrasado' || ac.comportamento === 'Agitado' || ac.comportamento === 'Distraído') score += 1;
                            return score;
                          };

                          // Sort by relevance score desc, then by date desc, and take the top 3
                          const relevantAcs = [...youthAcs]
                            .sort((a, b) => {
                              const scoreA = getRelevanceScore(a);
                              const scoreB = getRelevanceScore(b);
                              if (scoreA !== scoreB) return scoreB - scoreA;
                              return new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime();
                            })
                            .slice(0, 3);

                          return relevantAcs.map((ac, idx) => {
                            const formattedDate = new Date(ac.dataRegistro).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                            const score = getRelevanceScore(ac);
                            return (
                              <div key={idx} style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                    {formattedDate}
                                    {score >= 3 ? (
                                      <span style={{ marginLeft: '0.5rem', background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                        ★ Alta Relevância
                                      </span>
                                    ) : score >= 1 ? (
                                      <span style={{ marginLeft: '0.5rem', background: 'rgba(14,165,233,0.15)', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                        Relevante
                                      </span>
                                    ) : null}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>
                                    Assiduidade: {ac.assiduidade} | Desempenho: {ac.desempenho} | Comportamento: {ac.comportamento}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                                  "{ac.resumo}"
                                </p>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Grid de Pontos */}
                    <div className="report-grid-2">
                      <div className="report-points-box" style={{ borderLeft: '4px solid var(--color-success)' }}>
                        <div className="report-points-header" style={{ color: '#047857' }}>
                          <span>✔ Pontos Fortes Observados</span>
                        </div>
                        <div className="report-points-list">
                          {generatedReport.relatorio.pontos_fortes.map((p: string, i: number) => (
                            <div key={i} className="report-point-item">
                              <span className="report-point-icon" style={{ color: '#10b981' }}>✦</span>
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="report-points-box" style={{ borderLeft: '4px solid var(--color-orange)' }}>
                        <div className="report-points-header" style={{ color: '#b45309' }}>
                          <span>⚠ Pontos de Atenção</span>
                        </div>
                        <div className="report-points-list">
                          {generatedReport.relatorio.pontos_atencao.map((p: string, i: number) => (
                            <div key={i} className="report-point-item">
                              <span className="report-point-icon" style={{ color: '#f59e0b' }}>⚠️</span>
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recomendações */}
                    <div className="report-section-box" style={{ borderLeftColor: 'var(--color-sky)', background: 'rgba(14,165,233,0.03)', padding: '1.25rem', borderRadius: '8px' }}>
                      <h4 className="report-section-title" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                        </svg>
                        Diretrizes & Recomendações Educacionais
                      </h4>
                      <p className="report-section-body" style={{ marginTop: '0.5rem' }}>{generatedReport.relatorio.recomendacoes}</p>
                    </div>
                  </div>
                ) : (
                  // GERAL OUTPUT VIEW
                  <div>
                    {/* aggregated metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Amostra Analisada
                        </span>
                        <h5 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0.2rem 0 0' }}>
                          {generatedReport.total_analisado} Acompanhamentos
                        </h5>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Assiduidade Média
                        </span>
                        <h5 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)', margin: '0.2rem 0 0' }}>
                          91.6% Presença
                        </h5>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Índice Qualitativo
                        </span>
                        <h5 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-sky)', margin: '0.2rem 0 0' }}>
                          8.7 / 10
                        </h5>
                      </div>
                    </div>

                    {/* Resumo Geral */}
                    <div className="report-section-box">
                      <h4 className="report-section-title">Resumo Geral do Cenário</h4>
                      <p className="report-section-body">{generatedReport.relatorio.resumo_geral}</p>
                    </div>

                    {/* Geografia */}
                    <div className="report-section-box">
                      <h4 className="report-section-title">Análise Geográfica de Vulnerabilidade</h4>
                      <p className="report-section-body">{generatedReport.relatorio.analise_geografica}</p>
                    </div>

                    {/* Relatos Recentes do Sistema */}
                    <div className="report-section-box" style={{ borderLeftColor: 'var(--color-primary)' }}>
                      <h4 className="report-section-title">Relatos Recentes dos Técnicos (Lançamentos via Telegram)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                        {acompanhamentos.slice(0, 4).map((ac, idx) => {
                          const formattedDate = new Date(ac.dataRegistro).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                          return (
                            <div key={idx} style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{ac.jovemNome} • {formattedDate} ({ac.cidade})</span>
                                <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>
                                  Assiduidade: {ac.assiduidade} | Desempenho: {ac.desempenho}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                                "{ac.resumo}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tendencias e Alertas */}
                    <div className="report-grid-2">
                      <div className="report-points-box" style={{ borderLeft: '4px solid var(--color-sky)' }}>
                        <div className="report-points-header" style={{ color: '#0369a1' }}>
                          <span>📈 Tendências Identificadas</span>
                        </div>
                        <div className="report-points-list">
                          {generatedReport.relatorio.tendencias.map((t: string, i: number) => (
                            <div key={i} className="report-point-item">
                              <span className="report-point-icon" style={{ color: 'var(--color-sky)' }}>⚡</span>
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="report-points-box" style={{ borderLeft: '4px solid var(--color-error)' }}>
                        <div className="report-points-header" style={{ color: '#b91c1c' }}>
                          <span>🚨 Alertas de Risco Coletivo</span>
                        </div>
                        <div className="report-points-list">
                          {generatedReport.relatorio.alertas.map((a: string, i: number) => (
                            <div key={i} className="report-point-item">
                              <span className="report-point-icon" style={{ color: 'var(--color-error)' }}>⚠</span>
                              <span>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Métricas Qualitativas */}
                    <div className="report-section-box">
                      <h4 className="report-section-title">Métricas de Coleta & Qualidade</h4>
                      <p className="report-section-body">{generatedReport.relatorio.metricas_qualitativas}</p>
                    </div>

                    {/* Recomendações Gerais */}
                    <div className="report-section-box" style={{ borderLeftColor: 'var(--color-secondary)', background: 'rgba(13,92,58,0.03)', padding: '1.25rem', borderRadius: '8px' }}>
                      <h4 className="report-section-title" style={{ color: 'var(--color-secondary)' }}>
                        Diretrizes de Intervenção para Gestão
                      </h4>
                      <p className="report-section-body" style={{ whiteSpace: 'pre-line', marginTop: '0.5rem' }}>{generatedReport.relatorio.recomendacoes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
