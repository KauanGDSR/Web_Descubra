'use client';

import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  MessageSquare, 
  FileQuestion, 
  ChevronDown, 
  Loader2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface EquipamentoInfo {
  nome: string;
  tipo: string;
}

export default function AjudaPage() {
  const [equipamento, setEquipamento] = useState<EquipamentoInfo | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupportData = async () => {
      const supabase = createClient();
      try {
        const { data: equip } = await supabase
          .from('equipamentos')
          .select('nome, tipo')
          .limit(1)
          .maybeSingle();

        if (equip) {
          setEquipamento(equip);
        }
      } catch (err) {
        console.error('Erro ao buscar informações de suporte:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupportData();
  }, []);

  const faqs = [
    {
      q: 'Como funciona a candidatura às vagas do Mural de Vagas?',
      a: 'As vagas disponíveis são cadastradas diretamente pelas empresas parceiras do Programa Descubra. Como aluno vinculado ao programa, seu técnico de referência avalia sua pontuação de vulnerabilidade e encaminha seu perfil oficial para a empresa.'
    },
    {
      q: 'Quais os direitos e remuneração do Jovem Aprendiz?',
      a: 'Pela Lei da Aprendizagem (Lei nº 10.097/2000), o jovem contratado tem direito a carteira de trabalho assinada (CTPS), bolsa auxílio proporcional à jornada (média informada no mural), FGTS de 2%, vale-transporte, 13º salário e férias coincidentes com as férias escolares.'
    },
    {
      q: 'O que acontece se eu faltar ao curso ou ao trabalho?',
      a: 'A assiduidade é monitorada semanalmente pelo técnico de referência. Em caso de ausência por motivo de saúde ou força maior, apresente o atestado médico ou declaração comprobatória em até 48 horas para que a falta seja justificada sem prejuízo na bolsa.'
    },
    {
      q: 'O que é a pontuação do Programa Descubra?',
      a: 'É um índice calculado com base em critérios de vulnerabilidade social previstos nas diretrizes do Descubra (renda familiar, medidas socioeducativas, frequência escolar e inscrição no CadÚnico). Jovens com maior prioridade têm preferência nos primeiros encaminhamentos.'
    },
    {
      q: 'Como falar com meu técnico de referência?',
      a: 'Você pode comparecer presencialmente na sua Unidade de Referência (CREAS / CRAS cadastrado) ou solicitar contato pelo telefone da coordenação do Programa Descubra.'
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando informações de suporte...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Ajuda & Suporte ao Aluno</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Tire suas dúvidas sobre o Programa Descubra e encontre os contatos da sua unidade de atendimento.
        </p>
      </header>

      {/* Cards de Contato & Unidade de Referência */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.65rem', borderRadius: '0.75rem' }}>
              <Building size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                Sua Unidade de Atendimento
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Equipamento de Referência Socioassistencial</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--color-title)' }}>
              {equipamento?.nome || 'CREAS NOSSA SENHORA APARECIDA'}
            </strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
              <MapPin size={15} /> Pirapora - Minas Gerais
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
              <Clock size={15} /> Atendimento de Segunda a Sexta, 08h às 17h
            </span>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #1a3b5c)', borderRadius: '1rem', padding: '1.5rem', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.65rem', borderRadius: '0.75rem' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                Coordenação DescubraHub
              </h3>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Programa Interinstitucional de Aprendizagem</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', opacity: 0.95 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={15} /> contato@descubrahub.com.br
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={15} /> (38) 3740-6000 &bull; Plantão Técnico
            </span>
          </div>
        </div>
      </div>

      {/* Dúvidas Frequentes (FAQ) */}
      <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileQuestion size={20} /> Perguntas Frequentes dos Jovens Aprendizes
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div 
                key={i} 
                style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '0.75rem', 
                  overflow: 'hidden',
                  background: isOpen ? '#f8fafc' : '#fff' 
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    gap: '0.5rem'
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                      transition: 'transform 0.2s', 
                      flexShrink: 0,
                      color: '#64748b' 
                    }} 
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
