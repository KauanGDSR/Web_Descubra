'use client';

import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Upload, 
  FileCheck, 
  Loader2,
  Download,
  Info
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface JovemDocInfo {
  nome_completo: string;
  cpf: string | null;
  endereco: string | null;
  bairro: string | null;
  escolaridade: string | null;
  nome_responsavel: string | null;
  idade: number | null;
}

export default function DocumentosPage() {
  const [jovem, setJovem] = useState<JovemDocInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocInfo = async () => {
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let jData: JovemDocInfo | null = null;

        if (session?.user?.id) {
          const { data } = await supabase
            .from('jovens')
            .select('nome_completo, cpf, endereco, bairro, escolaridade, nome_responsavel, idade')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) jData = data as JovemDocInfo;
        }

        if (!jData) {
          const { data } = await supabase
            .from('jovens')
            .select('nome_completo, cpf, endereco, bairro, escolaridade, nome_responsavel, idade')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) jData = data as JovemDocInfo;
        }

        setJovem(jData);
      } catch (err) {
        console.error('Erro ao carregar dados de documentos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocInfo();
  }, []);

  const docs = [
    {
      nome: 'Documento de Identidade (RG ou CNH)',
      descricao: 'Cópia frente e verso legível com foto atual',
      status: 'Concluído',
      detalhe: 'Validado pelo técnico responsável'
    },
    {
      nome: 'Cadastro de Pessoa Física (CPF)',
      descricao: jovem?.cpf ? `CPF nº ${jovem.cpf.slice(0, 3)}.***.***-${jovem.cpf.slice(-2)} registrado no sistema` : 'Comprovante de inscrição no CPF',
      status: 'Concluído',
      detalhe: 'Sincronizado na base de dados'
    },
    {
      nome: 'Comprovante de Residência Atualizado',
      descricao: jovem?.endereco ? `Endereço: ${jovem.endereco} - ${jovem.bairro}` : 'Conta de luz, água ou declaração com validade de até 90 dias',
      status: 'Concluído',
      detalhe: 'Endereço residencial confirmado'
    },
    {
      nome: 'Declaração de Matrícula & Frequência Escolar',
      descricao: `Escolaridade declarada: ${jovem?.escolaridade || 'Ensino Médio'}`,
      status: 'Atualizado',
      detalhe: 'Exigência da Lei de Aprendizagem (frequência mínima 75%)'
    },
    {
      nome: 'Carteira de Trabalho Digital (CTPS)',
      descricao: 'Número de inscrição no PIS / Carteira Digital baixada no celular',
      status: 'Aguardando Contratação',
      detalhe: 'Necessário para assinatura do contrato de aprendizagem'
    },
    {
      nome: 'Documento do Responsável Legal',
      descricao: jovem?.nome_responsavel ? `Responsável: ${jovem.nome_responsavel}` : 'Necessário para menores de 18 anos',
      status: 'Concluído',
      detalhe: 'Autorização dos pais ou responsáveis anexada'
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-light)' }}>Carregando dados dos documentos...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <header>
        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: 'var(--color-primary)' }}>Documentos do Jovem Aprendiz</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Checklist e controle dos documentos admissionais exigidos para admissão e contratação no Programa Descubra.
        </p>
      </header>

      {/* Alerta de Regularidade */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem'
      }}>
        <div style={{ color: '#16a34a', flexShrink: 0, marginTop: '0.1rem' }}>
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h4 style={{ color: '#166534', fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            Documentação Básica Regularizada
          </h4>
          <p style={{ color: '#15803d', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Os dados essenciais para encaminhamento às vagas estão validados na sua Unidade de Referência. Quando for selecionado para uma vaga, a empresa solicitará apenas os dados bancários para o depósito da bolsa.
          </p>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {docs.map((doc, idx) => (
          <div
            key={idx}
            style={{
              background: '#fff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
              <div style={{
                background: doc.status === 'Concluído' ? '#f0fdf4' : '#eff6ff',
                color: doc.status === 'Concluído' ? '#16a34a' : '#2563eb',
                padding: '0.65rem',
                borderRadius: '0.75rem',
                flexShrink: 0
              }}>
                <FileText size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>
                  {doc.nome}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  {doc.descricao}
                </p>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {doc.detalhe}
                </span>
              </div>
            </div>

            <div>
              <span style={{
                background: doc.status === 'Concluído' ? '#dcfce7' : doc.status === 'Atualizado' ? '#e0f2fe' : '#fef9c3',
                color: doc.status === 'Concluído' ? '#15803d' : doc.status === 'Atualizado' ? '#0369a1' : '#854d0e',
                padding: '0.35rem 0.85rem',
                borderRadius: '2rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <CheckCircle2 size={14} /> {doc.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
