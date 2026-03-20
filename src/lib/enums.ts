export const ROLES = ["ORGANIZADOR", "COORDENADOR", "PROFISSIONAL"] as const;
export type Role = (typeof ROLES)[number];

export const PROFISSOES = [
  "MEDICO",
  "ENFERMEIRO",
  "TEC_ENFERMAGEM",
  "CONDUTOR",
  "TARM",
  "RADIO_OPERADOR",
  "ADMINISTRATIVO",
  "FISIOTERAPEUTA",
  "ASSISTENTE_SOCIAL",
  "OUTRO",
] as const;
export type Profissao = (typeof PROFISSOES)[number];

export const PROFISSAO_LABELS: Record<Profissao, string> = {
  MEDICO: "Médico(a)",
  ENFERMEIRO: "Enfermeiro(a)",
  TEC_ENFERMAGEM: "Téc. Enfermagem",
  CONDUTOR: "Condutor(a)",
  TARM: "TARM",
  RADIO_OPERADOR: "Rádio Operador",
  ADMINISTRATIVO: "Administrativo",
  FISIOTERAPEUTA: "Fisioterapeuta",
  ASSISTENTE_SOCIAL: "Assist. Social",
  OUTRO: "Outro",
};

export const TURMA_STATUS = [
  "RASCUNHO",
  "PUBLICADA",
  "INSCRICOES_ABERTAS",
  "LOTADA",
  "INSCRICOES_ENCERRADAS",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "CANCELADA",
] as const;
export type TurmaStatus = (typeof TURMA_STATUS)[number];

export const TURMA_STATUS_LABELS: Record<TurmaStatus, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADA: "Publicada",
  INSCRICOES_ABERTAS: "Inscrições Abertas",
  LOTADA: "Lotada",
  INSCRICOES_ENCERRADAS: "Inscrições Encerradas",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const ENROLLMENT_STATUS = [
  "INSCRITO",
  "FILA_ESPERA",
  "PROMOVIDO",
  "CONFIRMADO",
  "CANCELADO",
  "CANCELADO_NAO_CONFIRMOU",
  "PRESENTE",
  "AUSENTE",
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[number];

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  INSCRITO: "Inscrito",
  FILA_ESPERA: "Fila de Espera",
  PROMOVIDO: "Promovido",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  CANCELADO_NAO_CONFIRMOU: "Não Confirmou",
  PRESENTE: "Presente",
  AUSENTE: "Ausente",
};

export const VINCULO_STATUS = [
  "ATIVO",
  "INATIVO",
  "PENDENTE_VALIDACAO",
] as const;
export type VinculoStatus = (typeof VINCULO_STATUS)[number];

export const COTA_MODO = ["LIVRE", "POR_UNIDADE", "POR_MUNICIPIO"] as const;
export type CotaModo = (typeof COTA_MODO)[number];

export const ESCOPO_ELEGIBILIDADE = [
  "REGIONAL_INTEIRA",
  "MUNICIPIOS_ESPECIFICOS",
  "UNIDADES_ESPECIFICAS",
] as const;
export type EscopoElegibilidade = (typeof ESCOPO_ELEGIBILIDADE)[number];

export const MODALIDADE = ["PRESENCIAL", "ONLINE", "HIBRIDO"] as const;
export type Modalidade = (typeof MODALIDADE)[number];

export const NOTIFICACAO_TIPO = [
  "CONVITE_CADASTRO",
  "TURMA_ABERTA",
  "INSCRICAO_REALIZADA",
  "FILA_ESPERA",
  "PROMOVIDO_FILA",
  "PEDIR_CONFIRMACAO",
  "LEMBRETE_CURSO",
  "CANCELADO_NAO_CONFIRMOU",
  "TURMA_CANCELADA",
  "VAGA_LIBERADA_REDISTRIBUICAO",
] as const;
export type NotificacaoTipo = (typeof NOTIFICACAO_TIPO)[number];

export const NOTIFICACAO_CANAL = [
  "EMAIL",
  "SISTEMA",
  "WHATSAPP",
  "SMS",
  "TELEGRAM",
] as const;
export type NotificacaoCanal = (typeof NOTIFICACAO_CANAL)[number];

export const NOTIFICACAO_STATUS = [
  "PENDENTE",
  "ENVIADA",
  "FALHOU",
  "LIDA",
] as const;
export type NotificacaoStatus = (typeof NOTIFICACAO_STATUS)[number];

export const CHECKIN_METODO = ["MANUAL", "QR_CODE"] as const;
export type CheckinMetodo = (typeof CHECKIN_METODO)[number];

export const UNIDADE_TIPO = ["SAMU", "UPA", "HOSPITAL", "OUTRO"] as const;
export type UnidadeTipo = (typeof UNIDADE_TIPO)[number];
