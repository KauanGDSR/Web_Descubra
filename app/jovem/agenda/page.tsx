'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Building,
  GraduationCap,
  Briefcase,
  UserCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Bell,
  Sparkles,
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/frontend/components/ui/Modal';
import { useDialog } from '@/frontend/components/ui/CustomDialog';

export type EventCategory = 'Entrevista' | 'Curso' | 'Atendimento' | 'Lembrete';

export interface AgendaEvent {
  id: string;
  titulo: string;
  data: string; // Formato YYYY-MM-DD
  horario?: string;
  categoria: EventCategory;
  local?: string;
  instituicao?: string;
  descricao?: string;
  origem: 'sistema_entrevista' | 'sistema_curso' | 'sistema_atendimento' | 'aluno';
  link?: string;
}

const EMPTY_EVENT_FORM = {
  titulo: '',
  data: '',
  horario: '',
  categoria: 'Lembrete' as EventCategory,
  local: '',
  descricao: ''
};

const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; bg: string; dot: string; icon: any }> = {
  Entrevista: {
    label: 'Entrevista de Emprego',
    color: '#d97706',
    bg: '#fef3c7',
    dot: '#f59e0b',
    icon: Briefcase
  },
  Curso: {
    label: 'Curso & Capacitação',
    color: '#4f46e5',
    bg: '#eef2ff',
    dot: '#6366f1',
    icon: GraduationCap
  },
  Atendimento: {
    label: 'Atendimento Técnico',
    color: '#059669',
    bg: '#ecfdf5',
    dot: '#10b981',
    icon: UserCheck
  },
  Lembrete: {
    label: 'Lembrete Pessoal',
    color: '#0284c7',
    bg: '#f0f9ff',
    dot: '#0ea5e9',
    icon: Bell
  }
};

export default function AgendaPage() {
  const dialog = useDialog();

  const [loading, setLoading] = useState(true);
  const [jovemId, setJovemId] = useState<string | null>(null);
  const [jovemNome, setJovemNome] = useState('Aluno Descubra');

  // Eventos
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('Todos');

  // Controle de Navegação do Calendário
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modal de Criação de Evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formEvent, setFormEvent] = useState(EMPTY_EVENT_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Carregar Dados Reais do Banco e do LocalStorage
  useEffect(() => {
    const fetchAgendaData = async () => {
      setLoading(true);
      const supabase = createClient();

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          window.location.href = '/login';
          return;
        }

        const targetId = session.user.id;
        const { data: studentData, error: sErr } = await supabase
          .from('jovens')
          .select('id, nome_completo, nome_social, curso_encaminhado, entidade_formadora, curso_pre_aprendizagem, equipamentos(nome, endereco)')
          .eq('id', targetId)
          .maybeSingle();

        if (sErr || !studentData) {
          window.location.href = '/login';
          return;
        }

        setJovemId(studentData.id);
        setJovemNome(studentData.nome_social || studentData.nome_completo);

        const loadedEvents: AgendaEvent[] = [];

        // 1. Buscar Entrevistas de Emprego Agendadas (tabela encaminhamentos_vagas)
        if (targetId) {
          const { data: referrals } = await supabase
            .from('encaminhamentos_vagas')
            .select('id, status, feedback_empresa, feedback_tecnico, created_at, updated_at, vagas_disponiveis(id, titulo, horario, cargo, empresas_parceiras(razao_social, nome_fantasia, endereco, cidades(nome)))')
            .eq('jovem_id', targetId);

          if (referrals && referrals.length > 0) {
            referrals.forEach((ref: any) => {
              const vaga = ref.vagas_disponiveis;
              const empresa = vaga?.empresas_parceiras;
              const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || 'Empresa Parceira';
              const localEmpresa = empresa?.endereco ? `${empresa.endereco} - ${empresa?.cidades?.nome || ''}` : 'Sede da empresa parceira';

              if (ref.status === 'Entrevista Agendada') {
                // Tenta extrair data mencionada na mensagem da empresa (ex: 10/06/2025 ou 15-06-2026)
                let eventDate = '';
                let eventTime = vaga?.horario || 'Horário comercial';

                if (ref.feedback_empresa) {
                  const dateMatch = ref.feedback_empresa.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                  if (dateMatch) {
                    const d = dateMatch[1].padStart(2, '0');
                    const m = dateMatch[2].padStart(2, '0');
                    let y = dateMatch[3];
                    if (y.length === 2) y = '20' + y;
                    eventDate = `${y}-${m}-${d}`;
                  }

                  const timeMatch = ref.feedback_empresa.match(/(?:às|as|ás|\sat\s)\s*(\d{1,2}(?::\d{2}|h\d{0,2})?)/i);
                  if (timeMatch) {
                    eventTime = timeMatch[1].includes(':') ? timeMatch[1] : `${timeMatch[1].replace('h', '')}:00`;
                  }
                }

                // Fallback de data para a data de atualização do status caso não haja no texto
                if (!eventDate) {
                  const refDate = new Date(ref.updated_at || ref.created_at);
                  const y = refDate.getFullYear();
                  const m = String(refDate.getMonth() + 1).padStart(2, '0');
                  const d = String(refDate.getDate()).padStart(2, '0');
                  eventDate = `${y}-${m}-${d}`;
                }

                loadedEvents.push({
                  id: `ref_${ref.id}`,
                  titulo: `Entrevista de Emprego: ${vaga?.titulo || 'Processo Seletivo'}`,
                  data: eventDate,
                  horario: eventTime,
                  categoria: 'Entrevista',
                  local: localEmpresa,
                  instituicao: empresaNome,
                  descricao: ref.feedback_empresa || ref.feedback_tecnico || 'Entrevista agendada com a empresa parceira. Não esqueça seus documentos!',
                  origem: 'sistema_entrevista'
                });
              }
            });
          }
        }

        // 2. Buscar Acompanhamentos Socioassistenciais (tabela acompanhamentos)
        if (targetId) {
          const { data: acomp } = await supabase
            .from('acompanhamentos')
            .select('id, resumo, assiduidade, desempenho, comportamento, data_registro')
            .eq('jovem_id', targetId)
            .order('data_registro', { ascending: false });

          if (acomp && acomp.length > 0) {
            acomp.forEach((item: any) => {
              if (item.data_registro) {
                const regDate = new Date(item.data_registro);
                const y = regDate.getFullYear();
                const m = String(regDate.getMonth() + 1).padStart(2, '0');
                const d = String(regDate.getDate()).padStart(2, '0');
                const isoDate = `${y}-${m}-${d}`;
                const hours = `${String(regDate.getHours()).padStart(2, '0')}:${String(regDate.getMinutes()).padStart(2, '0')}`;

                loadedEvents.push({
                  id: `acomp_${item.id}`,
                  titulo: `Acompanhamento Socioassistencial`,
                  data: isoDate,
                  horario: hours !== '00:00' ? hours : 'Turno de Atendimento',
                  categoria: 'Atendimento',
                  local: (Array.isArray(studentData?.equipamentos) ? (studentData.equipamentos[0] as any)?.nome : (studentData?.equipamentos as any)?.nome) || 'Unidade de Referência (CRAS/CREAS)',
                  instituicao: 'Programa Descubra',
                  descricao: item.resumo || 'Encontro de acompanhamento individual e avaliação de frequência com a equipe técnica.',
                  origem: 'sistema_atendimento'
                });
              }
            });
          }
        }

        // 3. Buscar Cursos Reais Ofertados (tabela cursos_capacitacoes)
        try {
          const { data: cursosList } = await supabase
            .from('cursos_capacitacoes')
            .select('id, titulo, parceiro_nome, carga_horaria, modalidade, status, link_inscricao, created_at')
            .eq('ativo', true);

          if (cursosList && cursosList.length > 0) {
            cursosList.forEach((curso: any) => {
              if (curso.created_at) {
                const cDate = new Date(curso.created_at);
                const y = cDate.getFullYear();
                const m = String(cDate.getMonth() + 1).padStart(2, '0');
                const d = String(cDate.getDate()).padStart(2, '0');
                const isoDate = `${y}-${m}-${d}`;

                loadedEvents.push({
                  id: `curso_${curso.id}`,
                  titulo: `Inscrições Abertas: ${curso.titulo}`,
                  data: isoDate,
                  horario: curso.carga_horaria || 'Carga flexível',
                  categoria: 'Curso',
                  local: `Modalidade: ${curso.modalidade || 'Presencial'}`,
                  instituicao: curso.parceiro_nome,
                  descricao: `Capacitação disponível pelo Programa Descubra. ${curso.link_inscricao ? 'Inscrições abertas online.' : 'Consulte seu técnico de referência.'}`,
                  origem: 'sistema_curso',
                  link: curso.link_inscricao || undefined
                });
              }
            });
          }
        } catch {
          // Tabela pode ainda estar sendo criada
        }

        // 4. Carregar Compromissos Pessoais Salvos no LocalStorage
        const storageKey = `descubra_agenda_events_${targetId || 'anon'}`;
        const localData = localStorage.getItem(storageKey);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed)) {
              loadedEvents.push(...parsed);
            }
          } catch (e) {
            console.error('Erro ao ler compromissos locais:', e);
          }
        }

        setEvents(loadedEvents);
      } catch (err) {
        console.error('Erro ao carregar dados da agenda:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgendaData();
  }, []);

  // Salvar Novo Compromisso Pessoal no LocalStorage
  const handleSavePersonalEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEvent.titulo.trim() || !formEvent.data) {
      dialog.alert('Campos Obrigatórios', 'Preencha o título e a data do compromisso.', 'warning');
      return;
    }

    setFormSubmitting(true);
    const newId = `custom_${Date.now()}`;
    const newEvent: AgendaEvent = {
      id: newId,
      titulo: formEvent.titulo.trim(),
      data: formEvent.data,
      horario: formEvent.horario.trim() || 'Dia todo',
      categoria: formEvent.categoria,
      local: formEvent.local.trim() || undefined,
      instituicao: jovemNome,
      descricao: formEvent.descricao.trim() || undefined,
      origem: 'aluno'
    };

    const updated = [...events, newEvent];
    setEvents(updated);

    // Salvar no storage
    const storageKey = `descubra_agenda_events_${jovemId || 'anon'}`;
    const customOnly = updated.filter((ev) => ev.origem === 'aluno');
    localStorage.setItem(storageKey, JSON.stringify(customOnly));

    setIsModalOpen(false);
    setFormEvent(EMPTY_EVENT_FORM);
    setSelectedDate(newEvent.data);
    setFormSubmitting(false);

    dialog.alert('Sucesso', 'Compromisso agendado com sucesso no seu calendário!', 'success');
  };

  // Excluir Compromisso Pessoal
  const handleDeletePersonalEvent = async (evId: string) => {
    const confirmed = await dialog.confirm(
      'Remover Compromisso',
      'Deseja realmente remover este lembrete pessoal da sua agenda?',
      'danger'
    );
    if (!confirmed) return;

    const updated = events.filter((ev) => ev.id !== evId);
    setEvents(updated);

    const storageKey = `descubra_agenda_events_${jovemId || 'anon'}`;
    const customOnly = updated.filter((ev) => ev.origem === 'aluno');
    localStorage.setItem(storageKey, JSON.stringify(customOnly));

    dialog.alert('Removido', 'Compromisso excluído da sua agenda.', 'success');
  };

  // Abrir Modal de Criação para a data selecionada
  const handleOpenAddModal = (dateStr?: string) => {
    setFormEvent({
      ...EMPTY_EVENT_FORM,
      data: dateStr || selectedDate || todayStr
    });
    setIsModalOpen(true);
  };

  // ==========================================
  // Lógica do Calendário Mensal
  // ==========================================
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Navegar meses
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    setViewDate(new Date());
    setSelectedDate(todayStr);
  };

  // Matriz de Dias do Calendário
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg...
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const yStr = prevDate.getFullYear();
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dayNumber: d,
        dateStr: `${yStr}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dayNumber: d,
        dateStr: `${year}-${mStr}-${dStr}`,
        isCurrentMonth: true
      });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const yStr = nextDate.getFullYear();
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dayNumber: d,
        dateStr: `${yStr}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  // Agrupamento de Eventos por Data (filtrados por categoria se selecionado)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    events.forEach((ev) => {
      if (filterCategory !== 'Todos' && ev.categoria !== filterCategory) return;
      const list = map.get(ev.data) || [];
      list.push(ev);
      map.set(ev.data, list);
    });
    return map;
  }, [events, filterCategory]);

  // Eventos do Dia Selecionado
  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  // Formatação do Dia Selecionado por Extenso
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const fullDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, ${fullDate}`;
  }, [selectedDate]);

  // Próximos Compromissos (a partir de hoje ou mais recentes)
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((ev) => filterCategory === 'Todos' || ev.categoria === filterCategory)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5);
  }, [events, filterCategory]);

  // Contadores por categoria
  const counts = useMemo(() => {
    const total = events.length;
    const entrevistas = events.filter((e) => e.categoria === 'Entrevista').length;
    const cursos = events.filter((e) => e.categoria === 'Curso').length;
    const atendimentos = events.filter((e) => e.categoria === 'Atendimento').length;
    const lembretes = events.filter((e) => e.categoria === 'Lembrete').length;
    return { total, entrevistas, cursos, atendimentos, lembretes };
  }, [events]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem' }}>Carregando seu calendário de compromissos...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Cabeçalho da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <CalendarIcon size={26} /> Minha Agenda de Compromissos
          </h2>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Acompanhe suas entrevistas de emprego, datas de cursos, atendimentos e lembretes em um calendário interativo.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal(selectedDate)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} />
          Novo Compromisso
        </button>
      </div>

      {/* Pílulas de Filtro de Categoria */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
        {[
          { key: 'Todos', label: 'Todos os Compromissos', count: counts.total, color: 'var(--color-primary)', bg: '#f1f5f9' },
          { key: 'Entrevista', label: 'Entrevistas de Emprego', count: counts.entrevistas, color: '#d97706', bg: '#fef3c7' },
          { key: 'Curso', label: 'Cursos & Capacitações', count: counts.cursos, color: '#4f46e5', bg: '#eef2ff' },
          { key: 'Atendimento', label: 'Atendimentos Socioassistenciais', count: counts.atendimentos, color: '#059669', bg: '#ecfdf5' },
          { key: 'Lembrete', label: 'Lembretes Pessoais', count: counts.lembretes, color: '#0284c7', bg: '#f0f9ff' }
        ].map((cat) => {
          const isSelected = filterCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '2rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: isSelected ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                background: isSelected ? cat.bg : '#fff',
                color: isSelected ? cat.color : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{cat.label}</span>
              <span
                style={{
                  background: isSelected ? cat.color : '#e2e8f0',
                  color: isSelected ? '#fff' : '#475569',
                  borderRadius: '1rem',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.72rem'
                }}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid Principal: Calendário + Painel do Dia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Bloco 1: O Calendário Interativo */}
        <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          {/* Navegação do Mês */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
              {capitalizedMonthName}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                onClick={handleJumpToToday}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                  color: 'var(--color-primary)'
                }}
              >
                Hoje
              </button>

              <button
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                style={{
                  padding: '0.4rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#475569'
                }}
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                style={{
                  padding: '0.4rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#475569'
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Dias da Semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>
            <div>DOM</div>
            <div>SEG</div>
            <div>TER</div>
            <div>QUA</div>
            <div>QUI</div>
            <div>SEX</div>
            <div>SÁB</div>
          </div>

          {/* Células dos Dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarDays.map((cell, idx) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
              const isSelected = selectedDate === cell.dateStr;
              const isToday = todayStr === cell.dateStr;
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    minHeight: '44px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected
                      ? 'var(--color-primary)'
                      : isToday
                      ? '#f0fdf4'
                      : cell.isCurrentMonth
                      ? '#fff'
                      : '#f8fafc',
                    color: isSelected
                      ? '#fff'
                      : isToday
                      ? '#16a34a'
                      : cell.isCurrentMonth
                      ? 'var(--color-text)'
                      : '#cbd5e1',
                    borderRadius: '0.5rem',
                    border: isSelected
                      ? '2px solid var(--color-primary)'
                      : isToday
                      ? '2px solid #22c55e'
                      : '1px solid #f1f5f9',
                    cursor: 'pointer',
                    fontWeight: isToday || isSelected ? 700 : 500,
                    fontSize: '0.85rem',
                    transition: 'all 0.1s ease',
                    padding: '2px'
                  }}
                >
                  <span>{cell.dayNumber}</span>

                  {/* Indicadores de Eventos */}
                  {hasEvents && (
                    <div style={{ display: 'flex', gap: '2px', marginTop: '2px', justifyContent: 'center' }}>
                      {dayEvents.slice(0, 3).map((ev, dotIdx) => (
                        <span
                          key={dotIdx}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: isSelected ? '#fff' : CATEGORY_CONFIG[ev.categoria]?.dot || '#f59e0b'
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: '0.6rem', lineHeight: 1, color: isSelected ? '#fff' : '#64748b' }}>+</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda de Categorias */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '0.85rem', fontSize: '0.75rem', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              Entrevista
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
              Curso / Oficina
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              Atendimento
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9' }} />
              Lembrete
            </div>
          </div>
        </div>

        {/* Bloco 2: Painel do Dia Selecionado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Compromissos do Dia
                </span>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', margin: '0.15rem 0 0', fontWeight: 700 }}>
                  {formattedSelectedDate}
                </h3>
              </div>

              <button
                onClick={() => handleOpenAddModal(selectedDate)}
                style={{
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--color-primary)'
                }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {/* Lista de Eventos no Dia */}
            {selectedDayEvents.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                <CalendarIcon size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
                  Nenhum compromisso marcado para este dia.
                </p>
                <button
                  onClick={() => handleOpenAddModal(selectedDate)}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.45rem 0.9rem',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.4rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    cursor: 'pointer'
                  }}
                >
                  + Agendar compromisso nesta data
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedDayEvents.map((ev) => {
                  const cfg = CATEGORY_CONFIG[ev.categoria] || CATEGORY_CONFIG.Lembrete;
                  const Icon = cfg.icon;

                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: '#fff',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${cfg.color}`,
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <span
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '1rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginBottom: '0.35rem'
                            }}
                          >
                            <Icon size={12} /> {cfg.label}
                          </span>
                          <h4 style={{ fontSize: '0.98rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700, lineHeight: 1.3 }}>
                            {ev.titulo}
                          </h4>
                        </div>

                        {ev.origem === 'aluno' && (
                          <button
                            onClick={() => handleDeletePersonalEvent(ev.id)}
                            title="Excluir lembrete"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.2rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', fontSize: '0.8rem', color: '#64748b' }}>
                        {ev.horario && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={14} color={cfg.color} /> {ev.horario}
                          </span>
                        )}
                        {ev.instituicao && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Building size={14} color={cfg.color} /> {ev.instituicao}
                          </span>
                        )}
                        {ev.local && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={14} color={cfg.color} /> {ev.local}
                          </span>
                        )}
                      </div>

                      {ev.descricao && (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text)', lineHeight: 1.5, background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '0.5rem' }}>
                          {ev.descricao}
                        </p>
                      )}

                      {ev.link && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <a
                            href={ev.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: cfg.color,
                              textDecoration: 'underline'
                            }}
                          >
                            Acessar informações do curso &rarr;
                          </a>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção Próximos Compromissos em Ordem Cronológica */}
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-primary)', margin: '0 0 0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} /> Próximos Compromissos Agendados
            </h4>

            {upcomingEvents.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                Nenhum compromisso futuro cadastrado no momento.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {upcomingEvents.map((ev) => {
                  const cfg = CATEGORY_CONFIG[ev.categoria] || CATEGORY_CONFIG.Lembrete;
                  const [y, m, d] = ev.data.split('-');
                  const isCurrentSelected = selectedDate === ev.data;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedDate(ev.data);
                        const [evY, evM] = ev.data.split('-').map(Number);
                        setViewDate(new Date(evY, evM - 1, 1));
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        background: isCurrentSelected ? '#f8fafc' : '#fff',
                        border: isCurrentSelected ? `1px solid ${cfg.color}` : '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '0.5rem',
                            background: cfg.bg,
                            color: cfg.color,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            lineHeight: 1
                          }}
                        >
                          <span>{d}</span>
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                            {new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                          </span>
                        </div>

                        <div>
                          <h5 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                            {ev.titulo}
                          </h5>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {ev.horario || 'Horário livre'} &bull; {cfg.label}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color }}>
                        Ver no mapa &rarr;
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para Adicionar Novo Compromisso */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)' }}>
            Novo Compromisso / Lembrete
          </h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSavePersonalEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Título do Compromisso *</label>
            <input
              type="text"
              required
              placeholder="Ex: Entrevista com RH, Aula Inaugural, Levar documentos..."
              value={formEvent.titulo}
              onChange={(e) => setFormEvent({ ...formEvent, titulo: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Data do Evento *</label>
              <input
                type="date"
                required
                value={formEvent.data}
                onChange={(e) => setFormEvent({ ...formEvent, data: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Horário</label>
              <input
                type="text"
                placeholder="Ex: 14:00 ou 08h às 12h"
                value={formEvent.horario}
                onChange={(e) => setFormEvent({ ...formEvent, horario: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select
                value={formEvent.categoria}
                onChange={(e) => setFormEvent({ ...formEvent, categoria: e.target.value as EventCategory })}
                style={inputStyle}
              >
                <option value="Entrevista">Entrevista de Emprego</option>
                <option value="Curso">Curso & Capacitação</option>
                <option value="Atendimento">Atendimento Técnico</option>
                <option value="Lembrete">Lembrete Pessoal</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Local / Endereço</label>
              <input
                type="text"
                placeholder="Ex: Sede da Empresa, SENAI, Online..."
                value={formEvent.local}
                onChange={(e) => setFormEvent({ ...formEvent, local: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Anotações / Recomendações</label>
            <textarea
              rows={3}
              placeholder="Ex: Levar documento com foto, currículo impresso e caneta preta..."
              value={formEvent.descricao}
              onChange={(e) => setFormEvent({ ...formEvent, descricao: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: '0.65rem 1.25rem',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={formSubmitting}
              style={{
                padding: '0.65rem 1.5rem',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                opacity: formSubmitting ? 0.7 : 1
              }}
            >
              {formSubmitting ? 'Salvando...' : 'Salvar Compromisso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: '0.35rem'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  outline: 'none'
};
