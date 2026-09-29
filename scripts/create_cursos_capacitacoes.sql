-- ==============================================================================
-- CRIAÇÃO DA TABELA DE CURSOS E CAPACITAÇÕES - PROGRAMA DESCUBRA
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cursos_capacitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  parceiro_nome TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas_parceiras(id) ON DELETE SET NULL,
  carga_horaria TEXT,
  modalidade TEXT DEFAULT 'Presencial',
  status TEXT DEFAULT 'Inscrições Abertas',
  link_inscricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativação do Row Level Security
ALTER TABLE public.cursos_capacitacoes ENABLE ROW LEVEL SECURITY;

-- Política 1: Alunos e visitantes podem consultar cursos ativos
CREATE POLICY "Leitura de cursos ativos"
ON public.cursos_capacitacoes FOR SELECT
USING (ativo = true OR auth.role() = 'authenticated');

-- Política 2: Usuários autenticados (Admin, Técnicos e Empresas) podem gerenciar cursos
CREATE POLICY "Gerenciar cursos autenticados"
ON public.cursos_capacitacoes FOR ALL
USING (auth.role() = 'authenticated');

-- Índices para melhor performance de busca e filtros
CREATE INDEX IF NOT EXISTS idx_cursos_ativo ON public.cursos_capacitacoes(ativo);
CREATE INDEX IF NOT EXISTS idx_cursos_status ON public.cursos_capacitacoes(status);
CREATE INDEX IF NOT EXISTS idx_cursos_empresa_id ON public.cursos_capacitacoes(empresa_id);
