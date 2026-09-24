'use client';

import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Building, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Users,
  Briefcase
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface JovemAgendaData {
  nome_completo: string;
  equipamentos?: any;
  turno_escolar: string | null;
  entidade_formadora: string | null;
}

export default function AgendaPage() {
  const [jovem, setJovem] = useState<JovemAgendaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgenda = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let jData: JovemAgendaData | null = null;

        if (session?.user?.id) {
          const { data } = await supabase
            .from('jovens')
            .select('nome_completo, equipamentos(nome, tipo), turno_escolar, entidade_formadora')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) jData = data as unknown as JovemAgendaData;
        }

        if (!jData) {
          const { data } = await supabase
            .from('jovens')
            .select('nome_completo, equipamentos(nome, tipo), turno_escolar, entidade_formadora')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) jData = data as unknown as JovemAgendaData;
        }

        setJovem(jData);
      } catch (err) {
        console.error('Erro ao buscar dados da agenda:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando sua agenda...</p>
      </div>
    );
  }

  const eventos = [
    {
      titulo: 'Atendimento de Acompanhamento Socioassistencial',
      local: jovem?.equipamentos?.nome || 'CREAS Nossa Senhora Aparecida',
      data: 'Toda Terça-feira',
      horario: '14:00 às 15:30',
      tipo: 'Presencial',
      categoria: 'Acompanhamento',
      descricao: 'Encontro com o técnico de referência para avaliação de assiduidade, desenvolvimento pessoal e atualização do cadastro.'
    },
    {
      titulo: 'Oficina de Orientação Profissional & Elaboração de Currículo',
      local: 'Auditório Programa Descubra / Sala de Capacitação',
      data: 'Quinta-feira',
      horario: '09:00 às 11:30',
      tipo: 'Presencial',
      categoria: 'Capacitação',
      descricao: 'Treinamento de postura em entrevistas com empresas parceiras, dinâmica de grupo e comunicação assertiva.'
    },
    {
      titulo: 'Prazo Limite para Entrega do Comprovante de Frequência Escolar',
      local: 'Secretaria do Programa Descubra',
      data: 'Último dia útil do mês',
      horario: 'Até as 17:00',
      tipo: 'Documento',
      categoria: 'Obrigatório',
      descricao: 'Apresentação da declaração de frequência emitida pela escola para manutenção da elegibilidade às vagas.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Agenda de Compromissos</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Datas importantes, atendimentos socioassistenciais e oficinas de formação no Programa Descubra.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {eventos.map((ev, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.01 }}
            style={{
              background: '#fff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{
                  background: ev.categoria === 'Acompanhamento' ? '#eff6ff' : ev.categoria === 'Capacitação' ? '#f0fdf4' : '#fff7ed',
                  color: ev.categoria === 'Acompanhamento' ? '#2563eb' : ev.categoria === 'Capacitação' ? '#16a34a' : '#c2410c',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '2rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'inline-block',
                  marginBottom: '0.4rem'
                }}>
                  {ev.categoria} &bull; {ev.tipo}
                </span>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                  {ev.titulo}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CalendarIcon size={15} color="var(--color-primary)" /> {ev.data}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={15} color="var(--color-primary)" /> {ev.horario}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building size={15} color="var(--color-primary)" /> {ev.local}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5, marginTop: '0.25rem' }}>
              {ev.descricao}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
