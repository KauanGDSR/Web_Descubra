-- ==============================================================================
-- CRIAÇÃO DA TABELA DE CERTIFICADOS E CONQUISTAS DOS JOVENS
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.certificados_cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  titulo_curso TEXT NOT NULL,
  instituicao TEXT NOT NULL,
  carga_horaria TEXT,
  data_conclusao DATE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Rejeitado')),
  pontos_atribuidos INTEGER DEFAULT 0,
  tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  parecer_tecnico TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativação do Row Level Security
ALTER TABLE public.certificados_cursos ENABLE ROW LEVEL SECURITY;

-- Política 1: Jovens podem consultar seus próprios certificados
CREATE POLICY "Jovem consulta proprios certificados"
ON public.certificados_cursos FOR SELECT
USING (auth.uid() = jovem_id);

-- Política 2: Jovens autenticados podem inserir seus certificados
CREATE POLICY "Jovem insere certificado"
ON public.certificados_cursos FOR INSERT
WITH CHECK (auth.uid() = jovem_id);

-- Política 3: Técnicos e Admins gerenciam todos os certificados
CREATE POLICY "Tecnicos e Admins gerenciam certificados"
ON public.certificados_cursos FOR ALL
USING (auth.role() = 'authenticated');

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_certificados_jovem_id ON public.certificados_cursos(jovem_id);
CREATE INDEX IF NOT EXISTS idx_certificados_status ON public.certificados_cursos(status);
