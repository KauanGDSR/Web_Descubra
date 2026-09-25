import { z } from 'zod';

export const uuidSchema = z.string().uuid('Identificador inválido (esperado UUID)');

export const criarEmpresaSchema = z.object({
  razao_social: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres').max(200),
  nome_fantasia: z.string().max(200).optional().nullable(),
  email: z.string().email('E-mail corporativo inválido'),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos numéricos'),
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres (requisito de segurança OWASP)'),
  responsavel_nome: z.string().min(3, 'Nome do responsável deve ter no mínimo 3 caracteres').max(150),
  telefone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos numéricos').optional().nullable(),
  cep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos numéricos').optional().nullable(),
  endereco: z.string().max(300).optional().nullable(),
  cidade_id: z.string().uuid('Cidade inválida').optional().nullable(),
  selo: z.enum(['Ouro', 'Prata', 'Bronze', 'Nenhum']).optional().default('Nenhum'),
});

export const matchingVagasSchema = z.object({
  vaga_id: uuidSchema,
});

export const relatorioIaSchema = z.object({
  jovem_id: uuidSchema,
  prompt_livre: z.string().max(500, 'Instrução adicional deve ter no máximo 500 caracteres').optional(),
});

export const atualizarStatusCandidatoSchema = z.object({
  referral_id: uuidSchema,
  status: z.enum(['Pendente', 'Entrevista Agendada', 'Aprovado', 'Reprovado']),
  feedback_empresa: z.string().max(1000).optional().nullable(),
  feedback_tecnico: z.string().max(1000).optional().nullable(),
});

export const vagaSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  descricao: z.string().min(5, 'Descrição deve ter no mínimo 5 caracteres').max(3000),
  tipo: z.string().default('Aprendizagem'),
  quantidade_vagas: z.number().int().min(1, 'Quantidade de vagas mínima é 1'),
  cargo: z.string().optional().nullable(),
  horario: z.string().optional().nullable(),
  bolsa_auxilio: z.number().min(0, 'Valor da bolsa não pode ser negativo').default(0),
  idade_minima: z.number().int().min(14, 'Idade mínima legal é 14 anos').max(24).default(14),
  escolaridade_exigida: z.string().optional().nullable(),
  competencias_desejadas: z.union([z.string(), z.array(z.string())]).optional().nullable(),
});
