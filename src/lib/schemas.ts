import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const cursoSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  categoriaId: z.string().uuid().optional(),
  cargaHoraria: z.number().int().positive().optional(),
  publicoAlvoDescritivo: z.string().optional(),
});

export const turmaSchema = z.object({
  cursoId: z.string().uuid("Selecione um curso"),
  titulo: z.string().min(3, "Título obrigatório"),
  descricao: z.string().optional(),
  dataInicio: z.string().min(1, "Data de início obrigatória"),
  dataFim: z.string().optional(),
  horaInicio: z.string().min(1, "Hora de início obrigatória"),
  horaFim: z.string().optional(),
  local: z.string().optional(),
  modalidade: z.enum(["PRESENCIAL", "ONLINE", "HIBRIDO"]),
  vagasTotais: z.number().int().positive("Vagas totais deve ser positivo"),
  modoCota: z.enum(["LIVRE", "POR_UNIDADE", "POR_MUNICIPIO"]),
  redistribuirOciosas: z.boolean().default(false),
  dataRedistribuicao: z.string().optional(),
  filaEsperaHabilitada: z.boolean().default(true),
  profissoesElegiveis: z.array(z.string()).min(1, "Selecione ao menos uma profissão"),
  escopoElegibilidade: z.enum(["REGIONAL_INTEIRA", "MUNICIPIOS_ESPECIFICOS", "UNIDADES_ESPECIFICAS"]),
  inscricaoInicio: z.string().min(1, "Data de abertura obrigatória"),
  inscricaoFim: z.string().min(1, "Data de encerramento obrigatória"),
  prazoConfirmacaoDias: z.number().int().positive().default(3),
});

export const profissionalSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.email("Email inválido"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  telefone: z.string().optional(),
  profissao: z.enum(["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM", "RADIO_OPERADOR", "ADMINISTRATIVO", "FISIOTERAPEUTA", "ASSISTENTE_SOCIAL", "OUTRO"]),
});

export const unidadeSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  tipo: z.enum(["SAMU", "UPA", "HOSPITAL", "OUTRO"]),
  municipioId: z.string().uuid("Selecione um município"),
  endereco: z.string().optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

export type LoginInput = z.infer<typeof loginSchema>;
export type CursoInput = z.infer<typeof cursoSchema>;
export type TurmaInput = z.infer<typeof turmaSchema>;
export type ProfissionalInput = z.infer<typeof profissionalSchema>;
export type UnidadeInput = z.infer<typeof unidadeSchema>;
