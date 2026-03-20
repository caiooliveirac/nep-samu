import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  pgEnum,
  uuid,
  jsonb,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════

export const roleEnum = pgEnum("role", [
  "ORGANIZADOR",
  "COORDENADOR",
  "PROFISSIONAL",
]);

export const profissaoEnum = pgEnum("profissao", [
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
]);

export const turmaStatusEnum = pgEnum("turma_status", [
  "RASCUNHO",
  "PUBLICADA",
  "INSCRICOES_ABERTAS",
  "LOTADA",
  "INSCRICOES_ENCERRADAS",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "CANCELADA",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "INSCRITO",
  "FILA_ESPERA",
  "PROMOVIDO",
  "CONFIRMADO",
  "CANCELADO",
  "CANCELADO_NAO_CONFIRMOU",
  "PRESENTE",
  "AUSENTE",
]);

export const vinculoStatusEnum = pgEnum("vinculo_status", [
  "ATIVO",
  "INATIVO",
  "PENDENTE_VALIDACAO",
]);

export const cotaModoEnum = pgEnum("cota_modo", [
  "LIVRE",
  "POR_UNIDADE",
  "POR_MUNICIPIO",
]);

export const escopoElegibilidadeEnum = pgEnum("escopo_elegibilidade", [
  "REGIONAL_INTEIRA",
  "MUNICIPIOS_ESPECIFICOS",
  "UNIDADES_ESPECIFICAS",
]);

export const modalidadeEnum = pgEnum("modalidade", [
  "PRESENCIAL",
  "ONLINE",
  "HIBRIDO",
]);

export const notificacaoTipoEnum = pgEnum("notificacao_tipo", [
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
]);

export const notificacaoCanalEnum = pgEnum("notificacao_canal", [
  "EMAIL",
  "SISTEMA",
  "WHATSAPP",
  "SMS",
  "TELEGRAM",
]);

export const notificacaoStatusEnum = pgEnum("notificacao_status", [
  "PENDENTE",
  "ENVIADA",
  "FALHOU",
  "LIDA",
]);

export const checkinMetodoEnum = pgEnum("checkin_metodo", [
  "MANUAL",
  "QR_CODE",
]);

// ═══════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    cpf: varchar("cpf", { length: 11 }).unique(),
    telefone: varchar("telefone", { length: 15 }),
    role: roleEnum("role").notNull().default("PROFISSIONAL"),
    profissao: profissaoEnum("profissao"),
    passwordHash: text("password_hash"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_cpf").on(table.cpf),
    index("idx_users_role").on(table.role),
  ],
);

export const municipios = pgTable("municipios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  codigoIbge: varchar("codigo_ibge", { length: 7 }).unique(),
  ativo: boolean("ativo").notNull().default(true),
});

export const unidades = pgTable(
  "unidades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    tipo: text("tipo").notNull(), // SAMU | UPA | HOSPITAL | OUTRO
    municipioId: uuid("municipio_id")
      .notNull()
      .references(() => municipios.id),
    endereco: text("endereco"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_unidades_municipio").on(table.municipioId)],
);

export const vinculos = pgTable(
  "vinculos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    unidadeId: uuid("unidade_id")
      .notNull()
      .references(() => unidades.id),
    status: vinculoStatusEnum("status").notNull().default("PENDENTE_VALIDACAO"),
    isCoordenador: boolean("is_coordenador").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_vinculos_user_unidade").on(table.userId, table.unidadeId),
    index("idx_vinculos_unidade").on(table.unidadeId),
    index("idx_vinculos_status").on(table.status),
  ],
);

export const categorias = pgTable("categorias", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  descricao: text("descricao"),
  ordem: integer("ordem").notNull().default(0),
});

export const cursos = pgTable(
  "cursos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    categoriaId: uuid("categoria_id").references(() => categorias.id),
    cargaHoraria: integer("carga_horaria"),
    publicoAlvoDescritivo: text("publico_alvo_descritivo"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_cursos_categoria").on(table.categoriaId)],
);

export const turmas = pgTable(
  "turmas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => cursos.id),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),

    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim"),
    horaInicio: time("hora_inicio").notNull(),
    horaFim: time("hora_fim"),
    local: text("local"),
    modalidade: modalidadeEnum("modalidade").notNull().default("PRESENCIAL"),

    vagasTotais: integer("vagas_totais").notNull(),
    modoCota: cotaModoEnum("modo_cota").notNull().default("LIVRE"),
    redistribuirOciosas: boolean("redistribuir_ociosas")
      .notNull()
      .default(false),
    dataRedistribuicao: date("data_redistribuicao"),
    filaEsperaHabilitada: boolean("fila_espera_habilitada")
      .notNull()
      .default(true),

    profissoesElegiveis: jsonb("profissoes_elegiveis")
      .notNull()
      .$type<string[]>(),
    escopoElegibilidade: escopoElegibilidadeEnum("escopo_elegibilidade")
      .notNull()
      .default("REGIONAL_INTEIRA"),

    inscricaoInicio: timestamp("inscricao_inicio", {
      withTimezone: true,
    }).notNull(),
    inscricaoFim: timestamp("inscricao_fim", { withTimezone: true }).notNull(),
    prazoConfirmacaoDias: integer("prazo_confirmacao_dias")
      .notNull()
      .default(3),

    status: turmaStatusEnum("status").notNull().default("RASCUNHO"),

    criadoPor: uuid("criado_por")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_turmas_curso").on(table.cursoId),
    index("idx_turmas_status").on(table.status),
    index("idx_turmas_data").on(table.dataInicio),
    index("idx_turmas_inscricao").on(table.inscricaoInicio, table.inscricaoFim),
  ],
);

export const turmasMunicipios = pgTable(
  "turmas_municipios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => turmas.id, { onDelete: "cascade" }),
    municipioId: uuid("municipio_id")
      .notNull()
      .references(() => municipios.id),
  },
  (table) => [
    uniqueIndex("idx_turma_municipio").on(table.turmaId, table.municipioId),
  ],
);

export const turmasUnidades = pgTable(
  "turmas_unidades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => turmas.id, { onDelete: "cascade" }),
    unidadeId: uuid("unidade_id")
      .notNull()
      .references(() => unidades.id),
  },
  (table) => [
    uniqueIndex("idx_turma_unidade").on(table.turmaId, table.unidadeId),
  ],
);

export const cotas = pgTable(
  "cotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => turmas.id, { onDelete: "cascade" }),
    unidadeId: uuid("unidade_id").references(() => unidades.id),
    municipioId: uuid("municipio_id").references(() => municipios.id),
    limite: integer("limite").notNull(),
  },
  (table) => [
    index("idx_cotas_turma").on(table.turmaId),
    uniqueIndex("idx_cotas_turma_unidade").on(table.turmaId, table.unidadeId),
    uniqueIndex("idx_cotas_turma_municipio").on(
      table.turmaId,
      table.municipioId,
    ),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => turmas.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    unidadeId: uuid("unidade_id")
      .notNull()
      .references(() => unidades.id),

    status: enrollmentStatusEnum("status").notNull().default("INSCRITO"),
    posicaoFila: integer("posicao_fila"),

    inscritoEm: timestamp("inscrito_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
    canceladoEm: timestamp("cancelado_em", { withTimezone: true }),
    promovidoEm: timestamp("promovido_em", { withTimezone: true }),

    presente: boolean("presente"),
    checkinMetodo: checkinMetodoEnum("checkin_metodo"),
    checkinEm: timestamp("checkin_em", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_enrollment_turma_user").on(table.turmaId, table.userId),
    index("idx_enrollment_turma").on(table.turmaId),
    index("idx_enrollment_user").on(table.userId),
    index("idx_enrollment_status").on(table.status),
    index("idx_enrollment_unidade").on(table.unidadeId),
    index("idx_enrollment_fila").on(table.turmaId, table.posicaoFila),
  ],
);

export const convites = pgTable(
  "convites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull().unique(),
    unidadeId: uuid("unidade_id")
      .notNull()
      .references(() => unidades.id),
    profissao: profissaoEnum("profissao"),
    criadoPor: uuid("criado_por")
      .notNull()
      .references(() => users.id),
    usado: boolean("usado").notNull().default(false),
    usadoPor: uuid("usado_por").references(() => users.id),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_convites_token").on(table.token),
    index("idx_convites_unidade").on(table.unidadeId),
  ],
);

export const notificacoes = pgTable(
  "notificacoes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: notificacaoTipoEnum("tipo").notNull(),
    canal: notificacaoCanalEnum("canal").notNull().default("SISTEMA"),
    destinatarioId: uuid("destinatario_id")
      .notNull()
      .references(() => users.id),
    titulo: text("titulo").notNull(),
    corpo: text("corpo").notNull(),
    payload: jsonb("payload"),
    status: notificacaoStatusEnum("status").notNull().default("PENDENTE"),
    tentativas: integer("tentativas").notNull().default(0),
    erro: text("erro"),
    lidaEm: timestamp("lida_em", { withTimezone: true }),
    enviadaEm: timestamp("enviada_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notificacoes_destinatario").on(table.destinatarioId),
    index("idx_notificacoes_status").on(table.status),
    index("idx_notificacoes_tipo").on(table.tipo),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_audit_entity").on(table.entityType, table.entityId),
    index("idx_audit_user").on(table.userId),
    index("idx_audit_action").on(table.action),
    index("idx_audit_created").on(table.createdAt),
  ],
);

// ═══════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════

export const usersRelations = relations(users, ({ many }) => ({
  vinculos: many(vinculos),
  enrollments: many(enrollments),
  notificacoes: many(notificacoes),
}));

export const municipiosRelations = relations(municipios, ({ many }) => ({
  unidades: many(unidades),
}));

export const unidadesRelations = relations(unidades, ({ one, many }) => ({
  municipio: one(municipios, {
    fields: [unidades.municipioId],
    references: [municipios.id],
  }),
  vinculos: many(vinculos),
  cotas: many(cotas),
}));

export const vinculosRelations = relations(vinculos, ({ one }) => ({
  user: one(users, { fields: [vinculos.userId], references: [users.id] }),
  unidade: one(unidades, {
    fields: [vinculos.unidadeId],
    references: [unidades.id],
  }),
}));

export const categoriasRelations = relations(categorias, ({ many }) => ({
  cursos: many(cursos),
}));

export const cursosRelations = relations(cursos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [cursos.categoriaId],
    references: [categorias.id],
  }),
  turmas: many(turmas),
}));

export const turmasRelations = relations(turmas, ({ one, many }) => ({
  curso: one(cursos, { fields: [turmas.cursoId], references: [cursos.id] }),
  criadoPorUser: one(users, {
    fields: [turmas.criadoPor],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  cotas: many(cotas),
  municipiosElegiveis: many(turmasMunicipios),
  unidadesElegiveis: many(turmasUnidades),
}));

export const turmasMunicipiosRelations = relations(
  turmasMunicipios,
  ({ one }) => ({
    turma: one(turmas, {
      fields: [turmasMunicipios.turmaId],
      references: [turmas.id],
    }),
    municipio: one(municipios, {
      fields: [turmasMunicipios.municipioId],
      references: [municipios.id],
    }),
  }),
);

export const turmasUnidadesRelations = relations(
  turmasUnidades,
  ({ one }) => ({
    turma: one(turmas, {
      fields: [turmasUnidades.turmaId],
      references: [turmas.id],
    }),
    unidade: one(unidades, {
      fields: [turmasUnidades.unidadeId],
      references: [unidades.id],
    }),
  }),
);

export const cotasRelations = relations(cotas, ({ one }) => ({
  turma: one(turmas, { fields: [cotas.turmaId], references: [turmas.id] }),
  unidade: one(unidades, {
    fields: [cotas.unidadeId],
    references: [unidades.id],
  }),
  municipio: one(municipios, {
    fields: [cotas.municipioId],
    references: [municipios.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  turma: one(turmas, {
    fields: [enrollments.turmaId],
    references: [turmas.id],
  }),
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  unidade: one(unidades, {
    fields: [enrollments.unidadeId],
    references: [unidades.id],
  }),
}));

export const convitesRelations = relations(convites, ({ one }) => ({
  unidade: one(unidades, {
    fields: [convites.unidadeId],
    references: [unidades.id],
  }),
  criadoPorUser: one(users, {
    fields: [convites.criadoPor],
    references: [users.id],
  }),
  usadoPorUser: one(users, {
    fields: [convites.usadoPor],
    references: [users.id],
  }),
}));

export const notificacoesRelations = relations(notificacoes, ({ one }) => ({
  destinatario: one(users, {
    fields: [notificacoes.destinatarioId],
    references: [users.id],
  }),
}));
