'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/utils/supabase/client';

// Coordenadas geográficas centrais para zoom reativo nos bairros de Pirapora
const coordenadasBairros: Record<string, [number, number]> = {
  "Nova Pirapora": [-17.3299, -44.9164],
  "Loteamento Primavera": [-17.3365, -44.9044],
  "São Geraldo": [-17.3129, -44.9049],
  "Nossa Senhora Do Rosário": [-17.3189, -44.9097],
  "Centro": [-17.3529, -44.9481],
  "Cícero Passos": [-17.3281, -44.9252],
  "Cidade Jardim": [-17.3543, -44.9202],
  "Cidade Jardim Mansões": [-17.3648, -44.9143],
  "Cinquentenário": [-17.3333, -44.9324],
  "Distrito Industrial": [-17.3081, -44.9217],
  "Industrial": [-17.3257, -44.9349],
  "São João Batista": [-17.3474, -44.9178],
  "Santos Dumont": [-17.3427, -44.9325],
  "Santo Antônio": [-17.3414, -44.9428],
  "Nossa Senhora De Fátima": [-17.3359, -44.9397],
  "Nossa Senhora Aparecida": [-17.3391, -44.9491],
  "São Francisco": [-17.3267, -44.9415],
  "Bom Jesus": [-17.3599, -44.9438],
  "Sagrada Família": [-17.3724, -44.9343]
};

const bairrosPirapora = Object.keys(coordenadasBairros).sort();

const coresRisco = {
  alto: '#EF4444',       // Vermelho
  medio: '#F97316',      // Laranja
  baixo: '#10B981',      // Verde
  desconhecido: '#94A3B8' // Cinza translúcido
};

const normalizarNomeBairro = (nome: string): string => {
  if (!nome) return '';
  const n = nome.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, ' ') // remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();

  // Mapeamentos específicos de sinônimos conhecidos
  if (n.includes('jardim primavera') || n.includes('loteamento primavera') || n.includes('primavera')) {
    return 'Loteamento Primavera';
  }
  if (n.includes('sao geraldo')) {
    return 'São Geraldo';
  }
  if (n.includes('rosario') || n.includes('nossa senhora do rosario')) {
    return 'Nossa Senhora Do Rosário';
  }
  if (n.includes('centro')) {
    return 'Centro';
  }
  if (n.includes('cicero passos') || n.includes('passos')) {
    return 'Cícero Passos';
  }
  if (n.includes('cidade jardim mansoes')) {
    return 'Cidade Jardim Mansões';
  }
  if (n.includes('cidade jardim')) {
    return 'Cidade Jardim';
  }
  if (n.includes('cinquentenario')) {
    return 'Cinquentenário';
  }
  if (n.includes('distrito industrial')) {
    return 'Distrito Industrial';
  }
  if (n.includes('industrial')) {
    return 'Industrial';
  }
  if (n.includes('sao joao batista') || n.includes('joao batista')) {
    return 'São João Batista';
  }
  if (n.includes('santos dumont') || n.includes('dumont')) {
    return 'Santos Dumont';
  }
  if (n.includes('santo antonio')) {
    return 'Santo Antônio';
  }
  if (n.includes('fatima') || n.includes('nossa senhora de fatima')) {
    return 'Nossa Senhora De Fátima';
  }
  if (n.includes('aparecida') || n.includes('nossa senhora aparecida')) {
    return 'Nossa Senhora Aparecida';
  }
  if (n.includes('sao francisco') || n.includes('francisco')) {
    return 'São Francisco';
  }
  if (n.includes('bom jesus')) {
    return 'Bom Jesus';
  }
  if (n.includes('sagrada familia') || n.includes('familia')) {
    return 'Sagrada Família';
  }
  if (n.includes('nova pirapora')) {
    return 'Nova Pirapora';
  }

  const chaves = [
    'Nova Pirapora', 'Loteamento Primavera', 'São Geraldo', 'Nossa Senhora Do Rosário',
    'Centro', 'Cícero Passos', 'Cidade Jardim', 'Cidade Jardim Mansões', 'Cinquentenário',
    'Distrito Industrial', 'Industrial', 'São João Batista', 'Santos Dumont', 'Santo Antônio',
    'Nossa Senhora De Fátima', 'Nossa Senhora Aparecida', 'São Francisco', 'Bom Jesus', 'Sagrada Família'
  ];
  
  const encontrada = chaves.find(c => {
    const cNorm = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return n.includes(cNorm) || cNorm.includes(n);
  });

  return encontrada || 'Centro';
};

const obterNomeBairro = (label: string): string => {
  if (!label) return '';
  const name = label.split(' - ')[0].trim();
  return normalizarNomeBairro(name);
};

const obterBairroOriginal = (bairroDb: string) => {
  if (!bairroDb) return 'Centro';
  let temp = bairroDb;
  if (temp.includes(' - ')) {
    temp = temp.split(' - ')[1] || temp;
  }
  if (temp.includes(' (CEP:')) {
    temp = temp.split(' (CEP:')[0] || temp;
  }
  return normalizarNomeBairro(temp.trim());
};

const obterCidadeOriginal = (j: any) => {
  const cityName = j.equipamentos?.cidades?.nome;
  if (cityName) return cityName;
  const bairroDb = j.bairro || '';
  if (bairroDb.includes(' - ')) {
    return bairroDb.split(' - ')[0].trim();
  }
  return 'Pirapora'; // Default
};

// Algoritmo do Motor de Vulnerabilidade para cálculo em tempo real
const calcularScoreJovem = (j: any) => {
  let score = 0;
  if (j.turno_escolar === 'Não estuda') {
    score += 30;
  } else if (j.turno_escolar === 'Noite') {
    score += 10;
  }
  if (j.escolaridade === 'Fundamental Incompleto') {
    score += 15;
  } else if (j.escolaridade === 'Médio Incompleto') {
    score += 8;
  }
  const fezPre = j.fez_pre_aprendizagem || j.passou_pre_aprendizagem;
  if (!fezPre) {
    score += 10;
  }
  const bairroNorm = (j.bairro || '').toLowerCase();
  if (
    bairroNorm.includes('vila maria') ||
    bairroNorm.includes('dom bosco') ||
    bairroNorm.includes('aparecida') ||
    bairroNorm.includes('sagrada familia')
  ) {
    score += 15;
  }
  if (j.recebe_bolsa_familia) score += 10;
  if (j.possui_cadunico) score += 10;
  if (j.esteve_medida_socioeducativa) score += 20;
  if (j.possui_deficiencia) score += 10;
  return score;
};

const obterRiscoPorScore = (score: number): 'baixo' | 'medio' | 'alto' => {
  if (score >= 60) return 'alto';
  if (score >= 30) return 'medio';
  return 'baixo';
};

// Componente para criar um pane customizado para as bolinhas (CircleMarkers)
// Isso garante que fiquem acima do SVG padrão dos bairros (Z-Index 600 vs 400)
function PainelCustomizado({ nome, zIndex }: { nome: string; zIndex: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && !map.getPane(nome)) {
      const pane = map.createPane(nome);
      pane.style.zIndex = zIndex.toString();
    }
  }, [map, nome, zIndex]);
  return null;
}

// Componente de sincronização de visualização
function ControladorMapa({ centro, zoom }: { centro: [number, number]; zoom: number }) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Evita chamar setView no primeiro render para não quebrar a inicialização dos painéis do Leaflet
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (map && map.getContainer()) {
      try {
        map.setView(centro, zoom, { animate: true, duration: 1 });
      } catch (err) {
        console.error("Erro ao reposicionar o mapa:", err);
      }
    }
  }, [centro, zoom, map]);

  return null;
}

export default function MapaInteligente() {
  const [supabase] = useState(() => createClient());
  const [malhaBairros, setMalhaBairros] = useState<any>(null);
  const [jovens, setJovens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos filtros
  const [filtroCidade, setFiltroCidade] = useState<string>('todos');
  const [filtroBairro, setFiltroBairro] = useState<string>('todos');
  const [filtroRisco, setFiltroRisco] = useState<string>('todos');
  const [filtroSexo, setFiltroSexo] = useState<string>('todos');

  // Coordenadas reativas do mapa
  const [mapCenter, setMapCenter] = useState<[number, number]>([-17.346, -44.922]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/bairros_norte_minas.json').then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar o arquivo GeoJSON');
        return res.json();
      }),
      supabase
        .from('jovens')
        .select('*, equipamentos(id, nome, cidade_id, cidades(id, nome))')
        .then((res) => {
          if (res.error) throw res.error;
          return res.data || [];
        })
    ])
      .then(([geojson, dbJovens]) => {
        if (active) {
          setMalhaBairros(geojson);
          setJovens(dbJovens);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error(err);
          setError('Não foi possível carregar os dados geográficos e do banco.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Mapeamento dinâmico calculado a partir dos jovens do Supabase
  const dynamicDadosRiscoPorBairro: Record<string, 'baixo' | 'medio' | 'alto'> = {};
  const dynamicDadosBairroSexo: Record<string, { masculino: boolean; feminino: boolean }> = {};

  // Agrupar jovens de Pirapora por bairro para calcular risco médio e sexo
  const jovensPorBairro: Record<string, any[]> = {};
  
  jovens.forEach(j => {
    const cidade = obterCidadeOriginal(j);
    if (cidade === 'Pirapora') {
      const bairro = obterBairroOriginal(j.bairro);
      if (!jovensPorBairro[bairro]) {
        jovensPorBairro[bairro] = [];
      }
      jovensPorBairro[bairro].push(j);
    }
  });

  // Calcular estatísticas para cada bairro de Pirapora
  Object.entries(jovensPorBairro).forEach(([bairro, lista]) => {
    const totalScore = lista.reduce((acc, j) => acc + calcularScoreJovem(j), 0);
    const avgScore = totalScore / lista.length;
    dynamicDadosRiscoPorBairro[bairro] = obterRiscoPorScore(avgScore);

    const temMasculino = lista.some(j => (j.sexo || '').toLowerCase() === 'masculino');
    const temFeminino = lista.some(j => (j.sexo || '').toLowerCase() === 'feminino');
    dynamicDadosBairroSexo[bairro] = { masculino: temMasculino, feminino: temFeminino };
  });

  // Construir pontos de vulnerabilidade dinâmicos para TODOS os jovens
  const dynamicPontosVulnerabilidade: any[] = [];
  
  jovens.forEach(j => {
    const cidade = obterCidadeOriginal(j);
    const score = calcularScoreJovem(j);
    const risco = obterRiscoPorScore(score);
    const sexo = (j.sexo || 'Não informado').toLowerCase();
    
    let baseLat = -17.346;
    let baseLng = -44.922;

    if (cidade === 'Buritizeiro') {
      baseLat = -17.3522;
      baseLng = -44.9654;
    } else if (cidade === 'Jequitaí') {
      baseLat = -17.2255;
      baseLng = -44.4352;
    } else if (cidade === 'Pirapora') {
      const bairro = obterBairroOriginal(j.bairro);
      const coordBairro = coordenadasBairros[bairro];
      if (coordBairro) {
        baseLat = coordBairro[0];
        baseLng = coordBairro[1];
      }
    }
    
    // Jitter determinístico baseado em hash do ID
    let hash = 0;
    const idStr = j.id || '';
    for (let idx = 0; idx < idStr.length; idx++) {
      hash = idStr.charCodeAt(idx) + ((hash << 5) - hash);
    }
    const offsetScale = cidade === 'Pirapora' ? 0.005 : 0.012;
    const latOffset = ((hash & 0xFF) / 255 - 0.5) * offsetScale;
    const lngOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * offsetScale;

    dynamicPontosVulnerabilidade.push({
      id: j.id,
      cidade,
      bairro: cidade === 'Pirapora' ? obterBairroOriginal(j.bairro) : '',
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
      risco,
      sexo,
      nome: j.nome_social || j.nome_completo,
      descricao: `Idade: ${j.idade || calcAge(j.data_nascimento)} anos • Risco: ${risco === 'alto' ? 'Crítico' : risco === 'medio' ? 'Médio' : 'Baixo'}`
    });
  });

  // Helper local para calcular idade caso falte
  function calcAge(dobStr: string): number {
    if (!dobStr) return 0;
    const birth = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Handler para alteração da cidade
  const handleCityChange = (cidade: string) => {
    setFiltroCidade(cidade);
    setFiltroBairro('todos'); // Reseta bairro ao trocar de cidade

    if (cidade === 'Pirapora') {
      setMapCenter([-17.346, -44.922]);
      setMapZoom(13);
    } else if (cidade === 'Buritizeiro') {
      setMapCenter([-17.3522, -44.9654]);
      setMapZoom(13);
    } else if (cidade === 'Jequitaí') {
      setMapCenter([-17.2255, -44.4352]);
      setMapZoom(14);
    } else {
      // Exibição geral regional
      setMapCenter([-17.320, -44.750]);
      setMapZoom(10);
    }
  };

  // Handler para alteração do bairro
  const handleBairroChange = (bairro: string) => {
    setFiltroBairro(bairro);
    if (bairro !== 'todos') {
      setFiltroCidade('Pirapora'); // Selecionar bairro foca automaticamente em Pirapora
      const coordenadas = coordenadasBairros[bairro];
      if (coordenadas) {
        setMapCenter(coordenadas);
        setMapZoom(15);
      }
    }
  };

  const styleFeature = (feature: any) => {
    const label = feature?.properties?.label || '';
    const nomeBairro = obterNomeBairro(label);
    const nivelRisco = dynamicDadosRiscoPorBairro[nomeBairro];
    const fillColor = nivelRisco ? coresRisco[nivelRisco] : coresRisco.desconhecido;

    return {
      fillColor,
      fillOpacity: 0.45,
      weight: 2,
      color: '#ffffff',
      dashArray: '3',
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const label = feature?.properties?.label || '';
    const nomeBairro = obterNomeBairro(label);
    const nivelRisco = dynamicDadosRiscoPorBairro[nomeBairro] || 'Não Mapeado';
    const totalJovensBairro = jovensPorBairro[nomeBairro]?.length || 0;

    const riskLabels: Record<string, string> = {
      alto: 'Alto Risco',
      medio: 'Médio Risco',
      baixo: 'Baixo Risco',
      'Não Mapeado': 'Sem Cadastro'
    };

    const riskClasses: Record<string, string> = {
      alto: 'popup-risk-alto',
      medio: 'popup-risk-medio',
      baixo: 'popup-risk-baixo',
      'Não Mapeado': 'popup-risk-none'
    };

    const riskLabel = riskLabels[nivelRisco];
    const riskClass = riskClasses[nivelRisco];

    const popupContent = `
      <div class="custom-map-popup">
        <h3 class="popup-title">${nomeBairro}</h3>
        <div class="popup-divider"></div>
        <div class="popup-risk-badge ${riskClass}">
          <span class="popup-dot"></span>
          ${riskLabel}
        </div>
        <p class="popup-subtext" style="margin-top: 8px;">Jovens cadastrados: <strong>${totalJovensBairro}</strong></p>
        <p class="popup-subtext">Pirapora - MG</p>
      </div>
    `;

    layer.bindPopup(popupContent, {
      className: 'custom-leaflet-popup',
      closeButton: false,
    });

    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          fillOpacity: 0.75,
          weight: 4,
          color: '#ffffff',
          dashArray: '',
        });
        
        // Removido bringToFront() para evitar que o polígono cubra as bolinhas dos jovens no hover
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle(styleFeature(feature));
      },
    });
  };

  // Filtragem dos polígonos de bairros de Pirapora
  const obterBairrosFiltrados = () => {
    if (!malhaBairros) return [];
    if (filtroCidade !== 'todos' && filtroCidade !== 'Pirapora') return [];

    return malhaBairros.features.filter((feature: any) => {
      const label = feature?.properties?.label || '';
      const nomeBairro = obterNomeBairro(label);
      const risco = dynamicDadosRiscoPorBairro[nomeBairro] || 'desconhecido';

      // 1. Filtro por bairro específico
      if (filtroBairro !== 'todos' && nomeBairro !== filtroBairro) return false;

      // 2. Filtro por nível de risco
      if (filtroRisco !== 'todos' && risco !== filtroRisco) return false;

      // 3. Filtro por sexo
      if (filtroSexo !== 'todos') {
        const sexoBairro = dynamicDadosBairroSexo[nomeBairro];
        if (filtroSexo === 'masculino' && !sexoBairro?.masculino) return false;
        if (filtroSexo === 'feminino' && !sexoBairro?.feminino) return false;
      }

      return true;
    });
  };

  // Filtragem dos pontos de todos os jovens de todas as cidades
  const obterPontosFiltrados = () => {
    return dynamicPontosVulnerabilidade.filter((p) => {
      // 1. Filtro por cidade
      if (filtroCidade !== 'todos' && p.cidade !== filtroCidade) return false;

      // 2. Filtro por bairro (se for Pirapora)
      if (p.cidade === 'Pirapora') {
        if (filtroBairro !== 'todos' && p.bairro !== filtroBairro) return false;
      } else {
        // Se for outra cidade e estiver filtrando algum bairro de Pirapora, oculta
        if (filtroBairro !== 'todos') return false;
      }

      // 3. Filtro por risco
      if (filtroRisco !== 'todos' && p.risco !== filtroRisco) return false;

      // 4. Filtro por sexo
      if (filtroSexo !== 'todos' && p.sexo !== filtroSexo) return false;

      return true;
    });
  };

  const bairrosFiltrados = obterBairrosFiltrados();
  const pontosFiltrados = obterPontosFiltrados();

  // Calcular estatísticas agregadas reativamente com base nos jovens individuais reais
  const obterStatsFiltradas = () => {
    let alto = 0;
    let medio = 0;
    let baixo = 0;
    let totalCount = 0;
    
    jovens.forEach(j => {
      const cidade = obterCidadeOriginal(j);
      
      // Filtragem por cidade
      if (filtroCidade !== 'todos' && cidade !== filtroCidade) return;
      
      // Filtragem por bairro
      const bairro = obterBairroOriginal(j.bairro);
      if (cidade === 'Pirapora') {
        if (filtroBairro !== 'todos' && bairro !== filtroBairro) return;
      } else {
        if (filtroBairro !== 'todos') return;
      }
      
      // Filtragem por sexo
      const sexo = (j.sexo || '').toLowerCase();
      if (filtroSexo !== 'todos' && sexo !== filtroSexo) return;

      const score = calcularScoreJovem(j);
      const risco = obterRiscoPorScore(score);
      
      // Filtragem por risco
      if (filtroRisco !== 'todos' && risco !== filtroRisco) return;

      if (risco === 'alto') alto++;
      else if (risco === 'medio') medio++;
      else if (risco === 'baixo') baixo++;
      
      totalCount++;
    });

    return {
      alto,
      medio,
      baixo,
      total: totalCount
    };
  };

  const statsFiltradas = obterStatsFiltradas();

  if (loading) {
    return (
      <div className="map-loading-container">
        <div className="map-spinner"></div>
        <p>Carregando mapa inteligente e dados de vulnerabilidade...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error-container">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Erro de Carregamento</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="map-dashboard-layout">
      {/* Painel superior de cabeçalho, filtros em formato select e legenda */}
      <div className="map-top-panel">
        <div className="map-header-row">
          <div className="map-panel-info">
            <h4>Vulnerabilidade Territorial</h4>
            <p className="map-panel-desc">
              Painel georreferenciado e demográfico do Programa Descubra! no Norte de Minas.
            </p>
          </div>

          <div className="map-legend-horizontal">
            <span className="legend-title">Legenda:</span>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: coresRisco.alto }}></span>
                <span>Alto Risco</span>
              </div>
              <div className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: coresRisco.medio }}></span>
                <span>Médio Risco</span>
              </div>
              <div className="legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: coresRisco.baixo }}></span>
                <span>Baixo Risco</span>
              </div>
            </div>
          </div>
        </div>

        <div className="map-controls-row">
          {/* Select: Cidade */}
          <div className="map-filter-group-select">
            <label htmlFor="select-cidade" className="filter-label-select">Cidade</label>
            <select
              id="select-cidade"
              className="filter-select"
              value={filtroCidade}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="todos">Todas as Cidades</option>
              <option value="Pirapora">Pirapora</option>
              <option value="Buritizeiro">Buritizeiro</option>
              <option value="Jequitaí">Jequitaí</option>
            </select>
          </div>

          {/* Select: Bairro */}
          <div className="map-filter-group-select">
            <label htmlFor="select-bairro" className="filter-label-select">Bairro (Pirapora)</label>
            <select
              id="select-bairro"
              className="filter-select"
              value={filtroBairro}
              onChange={(e) => handleBairroChange(e.target.value)}
              disabled={filtroCidade !== 'todos' && filtroCidade !== 'Pirapora'}
            >
              <option value="todos">Todos os Bairros</option>
              {bairrosPirapora.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Select: Nível de Risco */}
          <div className="map-filter-group-select">
            <label htmlFor="select-risco" className="filter-label-select">Nível de Risco</label>
            <select
              id="select-risco"
              className="filter-select"
              value={filtroRisco}
              onChange={(e) => setFiltroRisco(e.target.value)}
            >
              <option value="todos">Todos os Riscos</option>
              <option value="alto">Alto Risco (Crítico)</option>
              <option value="medio">Médio Risco</option>
              <option value="baixo">Baixo Risco</option>
            </select>
          </div>

          {/* Select: Sexo */}
          <div className="map-filter-group-select">
            <label htmlFor="select-sexo" className="filter-label-select">Sexo</label>
            <select
              id="select-sexo"
              className="filter-select"
              value={filtroSexo}
              onChange={(e) => setFiltroSexo(e.target.value)}
            >
              <option value="todos">Ambos os Sexos</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>

          {/* Cards Estatísticos Responsivos */}
          <div className="map-stats-row">
            <div className="map-stat-card total">
              <span className="map-stat-num">{statsFiltradas.total}</span>
              <span className="map-stat-lbl">Jovens</span>
            </div>
            <div className="map-stat-card alto">
              <span className="map-stat-num">{statsFiltradas.alto}</span>
              <span className="map-stat-lbl">Alto Risco</span>
            </div>
            <div className="map-stat-card medio">
              <span className="map-stat-num">{statsFiltradas.medio}</span>
              <span className="map-stat-lbl">Médio</span>
            </div>
            <div className="map-stat-card baixo">
              <span className="map-stat-num">{statsFiltradas.baixo}</span>
              <span className="map-stat-lbl">Baixo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="map-container-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', outline: 'none' }}
        >
          {/* Controlador de Centro/Zoom Dinâmico */}
          <ControladorMapa centro={mapCenter} zoom={mapZoom} />

          {/* Criação do painel customizado com z-index elevado */}
          <PainelCustomizado nome="bolinhasPane" zIndex={600} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Polígonos de Pirapora */}
          {bairrosFiltrados.length > 0 && (
            <GeoJSON
              key={`${filtroRisco}-${filtroSexo}-${filtroBairro}-${jovens.length}`}
              data={{ type: 'FeatureCollection', features: bairrosFiltrados } as any}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Pontos de todos os jovens cadastrados */}
          {pontosFiltrados.map((ponto) => (
            <CircleMarker
              key={`ponto-${ponto.id}`}
              center={[ponto.lat, ponto.lng]}
              radius={8}
              pane="bolinhasPane"
              pathOptions={{
                fillColor: coresRisco[ponto.risco as keyof typeof coresRisco],
                fillOpacity: 0.85,
                color: '#ffffff',
                weight: 1.5,
              }}
            >
              <Tooltip className="custom-leaflet-tooltip" direction="top" offset={[0, -5]} opacity={1}>
                <div className="custom-map-popup">
                  <h3 className="popup-title">{ponto.nome}</h3>
                  <div className="popup-divider"></div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dark)', margin: '0 0 0.4rem 0', lineHeight: 1.4 }}>
                    Cidade: <strong>{ponto.cidade}</strong>
                    {ponto.bairro && (
                      <>
                        <br />
                        Bairro: <strong>{ponto.bairro}</strong>
                      </>
                    )}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dark)', margin: '0 0 0.4rem 0', lineHeight: 1.4 }}>
                    {ponto.descricao}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', margin: '0 0 0.5rem 0', textTransform: 'capitalize' }}>
                    Sexo: <strong>{ponto.sexo}</strong>
                  </p>
                  <div className={`popup-risk-badge popup-risk-${ponto.risco}`}>
                    <span className="popup-dot"></span>
                    {ponto.risco === 'alto' ? 'Alto Risco (Crítico)' : ponto.risco === 'medio' ? 'Médio Risco' : 'Baixo Risco'}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
