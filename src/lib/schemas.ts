import { z } from "zod/v4";
import { getPasswordPolicyError } from "@/server/lib/password-policy";
import { erroNomeCompleto, erroWhatsapp } from "@/lib/contato";
import { PROFISSOES } from "@/lib/enums";

/**
 * Nome completo e WhatsApp são exigidos em todo caminho de cadastro de pessoa:
 * é o que permite achar quem é na lista e avisar da vaga.
 */
const nomeCompleto = z.string().trim().superRefine((nome, ctx) => {
  const erro = erroNomeCompleto(nome);
  if (erro) ctx.addIssue({ code: "custom", message: erro });
});

const whatsapp = z.string().trim().superRefine((tel, ctx) => {
  const erro = erroWhatsapp(tel);
  if (erro) ctx.addIssue({ code: "custom", message: erro });
});

// O login continua aceitando senhas curtas herdadas; a régua nova vale para
// senhas NOVAS (cadastro e troca). Sem isto o cadastro aceitava "123456" e a
// mesma pessoa era barrada ao tentar trocar de senha depois.
const senhaForte = z.string().superRefine((senha, ctx) => {
  const erro = getPasswordPolicyError(senha);
  if (erro) ctx.addIssue({ code: "custom", message: erro });
});

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const cursoSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  // Em horas.
  cargaHoraria: z.number().int().positive().optional(),
  // As profissões que o curso atende. Ficam gravadas no curso e são o que a
  // turma nova herda — antes viravam só texto e se perdiam.
  publicoAlvoProfissoes: z.array(z.enum(PROFISSOES)).default([]),
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
  profissoesElegiveis: z.array(z.string()),
  publicoExterno: z.string().optional(),
  escopoElegibilidade: z.enum(["REGIONAL_INTEIRA", "MUNICIPIOS_ESPECIFICOS", "UNIDADES_ESPECIFICAS"]),
  inscricaoInicio: z.string().min(1, "Data de abertura obrigatória"),
  inscricaoFim: z.string().min(1, "Data de encerramento obrigatória"),
  prazoConfirmacaoDias: z.number().int().positive().default(3),
})
  // Ou a turma é para profissões do SAMU, ou é para um público de fora — mas
  // não pode ficar sem nenhum dos dois, senão ninguém sabe para quem ela é.
  .refine(
    (t) => t.profissoesElegiveis.length > 0 || !!t.publicoExterno?.trim(),
    {
      message: "Escolha ao menos uma profissão ou descreva o público externo",
      path: ["profissoesElegiveis"],
    },
  );

export const profissionalSchema = z.object({
  nome: nomeCompleto,
  email: z.email("Email inválido"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  telefone: whatsapp,
  profissao: z.enum(["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM", "RADIO_OPERADOR", "ADMINISTRATIVO", "FISIOTERAPEUTA", "ASSISTENTE_SOCIAL", "OUTRO"]),
});

export const unidadeSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  tipo: z.enum(["SAMU", "UPA", "HOSPITAL", "OUTRO"]),
  municipioId: z.string().uuid("Selecione um município"),
  endereco: z.string().optional(),
});

export const conviteCreateSchema = z.object({
  unidadeId: z.string().uuid("Selecione uma unidade"),
});

export const conviteRegistrarSchema = z.object({
  nome: nomeCompleto,
  email: z.email("Email inválido"),
  telefone: whatsapp,
  profissao: z.enum(["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM", "RADIO_OPERADOR", "ADMINISTRATIVO", "FISIOTERAPEUTA", "ASSISTENTE_SOCIAL", "OUTRO"]),
  senha: senhaForte,
});

export const profissionalCreateSchema = z.object({
  nome: nomeCompleto,
  email: z.email("Email inválido"),
  telefone: whatsapp,
  profissao: z.enum(["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM", "RADIO_OPERADOR", "ADMINISTRATIVO", "FISIOTERAPEUTA", "ASSISTENTE_SOCIAL", "OUTRO"]),
  unidadeId: z.string().uuid("Selecione uma unidade"),
  senha: senhaForte,
});

/** O que a própria pessoa pode corrigir nos dados dela. */
export const meusDadosSchema = z.object({
  nome: nomeCompleto,
  telefone: whatsapp,
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
export type ConviteCreateInput = z.infer<typeof conviteCreateSchema>;
export type ConviteRegistrarInput = z.infer<typeof conviteRegistrarSchema>;
export type ProfissionalCreateInput = z.infer<typeof profissionalCreateSchema>;
export type MeusDadosInput = z.infer<typeof meusDadosSchema>;
