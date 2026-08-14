import { db } from "./index";
import {
  users,
  municipios,
  unidades,
  vinculos,
  categorias,
  cursos,
  turmas,
  enrollments,
  cotas,
  notificacoes,
} from "./schema";
import bcrypt from "bcryptjs";
import { PROFISSOES } from "@/lib/enums";

async function seed() {
  console.log("🌱 Iniciando seed...");

  // ══════ Municipios ══════
  const municipioData = [
    { nome: "Salvador", codigoIbge: "2927408" },
    { nome: "Lauro de Freitas", codigoIbge: "2919207" },
    { nome: "Camaçari", codigoIbge: "2905701" },
    { nome: "Simões Filho", codigoIbge: "2930709" },
    { nome: "Candeias", codigoIbge: "2906501" },
    { nome: "Dias d'Ávila", codigoIbge: "2910057" },
    { nome: "São Francisco do Conde", codigoIbge: "2929206" },
    { nome: "Madre de Deus", codigoIbge: "2920007" },
    { nome: "Itaparica", codigoIbge: "2916104" },
    { nome: "Vera Cruz", codigoIbge: "2933208" },
  ];

  const insertedMunicipios = await db
    .insert(municipios)
    .values(municipioData)
    .returning();
  console.log(`✅ ${insertedMunicipios.length} municípios inseridos`);

  // ══════ Categorias ══════
  const categoriaData = [
    { nome: "Via Aérea", descricao: "Cursos de manejo de via aérea", ordem: 1 },
    { nome: "Suporte Básico", descricao: "SBV e procedimentos básicos", ordem: 2 },
    { nome: "Trauma", descricao: "Atendimento ao trauma", ordem: 3 },
    { nome: "Clínico", descricao: "Emergências clínicas", ordem: 4 },
    { nome: "Humanização", descricao: "Humanização e cuidados", ordem: 5 },
  ];

  const insertedCategorias = await db
    .insert(categorias)
    .values(categoriaData)
    .returning();
  console.log(`✅ ${insertedCategorias.length} categorias inseridas`);

  // ══════ Unidades ══════
  const mSalvador = insertedMunicipios.find((m) => m.nome === "Salvador")!;
  const mLauro = insertedMunicipios.find((m) => m.nome === "Lauro de Freitas")!;
  const mCamacari = insertedMunicipios.find((m) => m.nome === "Camaçari")!;
  const mSimoes = insertedMunicipios.find((m) => m.nome === "Simões Filho")!;
  const mCandeias = insertedMunicipios.find((m) => m.nome === "Candeias")!;

  const unidadeData = [
    { nome: "SAMU 192 Salvador", tipo: "SAMU", municipioId: mSalvador.id, endereco: "Av. ACM, Salvador" },
    { nome: "UPA Brotas", tipo: "UPA", municipioId: mSalvador.id, endereco: "R. Waldemar Falcão, Brotas" },
    { nome: "UPA Itapuã", tipo: "UPA", municipioId: mSalvador.id, endereco: "Av. Dorival Caymmi, Itapuã" },
    { nome: "SAMU 192 Lauro de Freitas", tipo: "SAMU", municipioId: mLauro.id, endereco: "Av. Santos Dumont" },
    { nome: "UPA Lauro de Freitas", tipo: "UPA", municipioId: mLauro.id, endereco: "R. São João" },
    { nome: "SAMU 192 Camaçari", tipo: "SAMU", municipioId: mCamacari.id, endereco: "R. Flamengo, Centro" },
    { nome: "UPA Camaçari", tipo: "UPA", municipioId: mCamacari.id, endereco: "Av. Jorge Amado" },
    { nome: "SAMU 192 Simões Filho", tipo: "SAMU", municipioId: mSimoes.id, endereco: "R. 2 de Julho" },
    { nome: "UPA Simões Filho", tipo: "UPA", municipioId: mSimoes.id, endereco: "Av. Elmo Serejo" },
    { nome: "SAMU 192 Candeias", tipo: "SAMU", municipioId: mCandeias.id, endereco: "R. da Independência" },
    { nome: "UPA Candeias", tipo: "UPA", municipioId: mCandeias.id, endereco: "Av. Antonio Carlos Magalhães" },
    { nome: "SAMU 192 Dias d'Ávila", tipo: "SAMU", municipioId: insertedMunicipios[5].id, endereco: "R. Central" },
    { nome: "SAMU 192 São Francisco do Conde", tipo: "SAMU", municipioId: insertedMunicipios[6].id, endereco: "Praça da Matriz" },
    { nome: "SAMU 192 Madre de Deus", tipo: "SAMU", municipioId: insertedMunicipios[7].id, endereco: "R. do Porto" },
    { nome: "SAMU 192 Itaparica", tipo: "SAMU", municipioId: insertedMunicipios[8].id, endereco: "R. da Praia" },
  ];

  const insertedUnidades = await db
    .insert(unidades)
    .values(unidadeData)
    .returning();
  console.log(`✅ ${insertedUnidades.length} unidades inseridas`);

  // ══════ Organizadores ══════
  const hash = await bcrypt.hash("123456", 10);

  const organizadorData = [
    { nome: "Organizadora Demo", email: "organizador@example.com", role: "ORGANIZADOR" as const, passwordHash: hash },
  ];

  const insertedOrgs = await db
    .insert(users)
    .values(organizadorData)
    .returning();
  console.log(`✅ ${insertedOrgs.length} organizadores inseridos`);

  // ══════ Coordenadores ══════
  const coordenadorData = [
    { nome: "Coordenador Demo", email: "coordenador@example.com", role: "COORDENADOR" as const, passwordHash: hash },
    ...insertedUnidades.slice(1).map((u, i) => ({
      nome: `Coord. ${u.nome.replace("SAMU 192 ", "").replace("UPA ", "")}`,
      email: `coord${i + 2}@nep.samu.ba.gov.br`,
      role: "COORDENADOR" as const,
      passwordHash: hash,
    })),
  ];

  const insertedCoords = await db
    .insert(users)
    .values(coordenadorData)
    .returning();
  console.log(`✅ ${insertedCoords.length} coordenadores inseridos`);

  // Vincular coordenadores às unidades
  const coordVinculos = insertedCoords.map((c, i) => ({
    userId: c.id,
    unidadeId: insertedUnidades[i].id,
    status: "ATIVO" as const,
    isCoordenador: true,
  }));

  await db.insert(vinculos).values(coordVinculos);

  // ══════ Profissionais ══════
  const profissoes = ["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM"] as const;
  const nomes = [
    "Ana", "Bruno", "Carla", "Diego", "Elena", "Fabio", "Gisele", "Hugo", "Iris", "José",
    "Karen", "Lucas", "Marta", "Neto", "Olga", "Paulo", "Raquel", "Sérgio", "Tânia", "Ulisses",
  ];
  const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Reis", "Almeida", "Ferreira"];

  const profissionalData: Array<{
    nome: string;
    email: string;
    cpf?: string;
    role: "PROFISSIONAL";
    profissao: typeof profissoes[number];
    passwordHash: string;
  }> = [
    { nome: "Profissional Demo", email: "profissional@example.com", role: "PROFISSIONAL", profissao: "MEDICO", passwordHash: hash },
  ];
  for (let i = 0; i < 99; i++) {
    const nome = nomes[i % nomes.length];
    const sobrenome = sobrenomes[Math.floor(i / nomes.length) % sobrenomes.length];
    const profissao = profissoes[i % profissoes.length];
    profissionalData.push({
      nome: `${nome} ${sobrenome}`,
      email: `prof${i + 1}@nep.samu.ba.gov.br`,
      cpf: String(10000000000 + i),
      role: "PROFISSIONAL" as const,
      profissao,
      passwordHash: hash,
    });
  }

  const insertedProfs = await db
    .insert(users)
    .values(profissionalData)
    .returning();
  console.log(`✅ ${insertedProfs.length} profissionais inseridos`);

  // Vincular profissionais às unidades (distribuir)
  const profVinculos = insertedProfs.map((p, i) => ({
    userId: p.id,
    unidadeId: insertedUnidades[i % insertedUnidades.length].id,
    status: "ATIVO" as const,
    isCoordenador: false,
  }));

  await db.insert(vinculos).values(profVinculos);
  console.log(`✅ ${profVinculos.length} vínculos criados`);

  // ══════ Cursos ══════
  // cargaHoraria em HORAS.
  const MED_ENF = ["MEDICO", "ENFERMEIRO"];
  const cursoData = [
    { nome: "Via Aérea Avançada", descricao: "Treinamento avançado em manejo de via aérea no APH", categoriaId: insertedCategorias[0].id, cargaHoraria: 8, publicoAlvoProfissoes: MED_ENF, publicoAlvoDescritivo: "Médicos e enfermeiros" },
    { nome: "SBV - Suporte Básico de Vida", descricao: "Protocolos de suporte básico de vida", categoriaId: insertedCategorias[1].id, cargaHoraria: 4, publicoAlvoProfissoes: [...PROFISSOES], publicoAlvoDescritivo: "Todos os profissionais" },
    { nome: "XABCDE no Trauma", descricao: "Abordagem sistematizada do paciente traumatizado", categoriaId: insertedCategorias[2].id, cargaHoraria: 8, publicoAlvoProfissoes: MED_ENF, publicoAlvoDescritivo: "Médicos e enfermeiros" },
    { nome: "Emergências Clínicas", descricao: "Manejo de emergências clínicas no APH", categoriaId: insertedCategorias[3].id, cargaHoraria: 6, publicoAlvoProfissoes: MED_ENF, publicoAlvoDescritivo: "Médicos e enfermeiros" },
    { nome: "Humanização e Segurança do Paciente", descricao: "Práticas de humanização e segurança", categoriaId: insertedCategorias[4].id, cargaHoraria: 2, publicoAlvoProfissoes: [...PROFISSOES], publicoAlvoDescritivo: "Todos os profissionais" },
  ];

  const insertedCursos = await db
    .insert(cursos)
    .values(cursoData)
    .returning();
  console.log(`✅ ${insertedCursos.length} cursos inseridos`);

  // ══════ Turmas ══════
  const admin = insertedOrgs[0];
  const now = new Date();

  const turmaData = [
    {
      cursoId: insertedCursos[0].id,
      titulo: "Via Aérea Avançada - Turma 1/2026",
      dataInicio: "2026-04-15",
      horaInicio: "08:00",
      horaFim: "17:00",
      local: "Centro de Treinamento NEP - Salvador",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 30,
      modoCota: "POR_UNIDADE" as const,
      filaEsperaHabilitada: true,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-03-01"),
      inscricaoFim: new Date("2026-04-10"),
      prazoConfirmacaoDias: 3,
      status: "INSCRICOES_ABERTAS" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[1].id,
      titulo: "SBV - Turma 1/2026",
      dataInicio: "2026-04-20",
      horaInicio: "08:00",
      horaFim: "12:00",
      local: "Centro de Treinamento NEP - Salvador",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 40,
      modoCota: "LIVRE" as const,
      filaEsperaHabilitada: true,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-03-15"),
      inscricaoFim: new Date("2026-04-15"),
      prazoConfirmacaoDias: 3,
      status: "INSCRICOES_ABERTAS" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[2].id,
      titulo: "XABCDE Trauma - Turma 1/2026",
      dataInicio: "2026-05-10",
      horaInicio: "08:00",
      horaFim: "17:00",
      local: "Centro de Treinamento NEP - Salvador",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 25,
      modoCota: "POR_MUNICIPIO" as const,
      filaEsperaHabilitada: true,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO"],
      escopoElegibilidade: "MUNICIPIOS_ESPECIFICOS" as const,
      inscricaoInicio: new Date("2026-04-01"),
      inscricaoFim: new Date("2026-05-05"),
      prazoConfirmacaoDias: 3,
      status: "PUBLICADA" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[3].id,
      titulo: "Emergências Clínicas - Turma 1/2026",
      dataInicio: "2026-03-20",
      horaInicio: "08:00",
      horaFim: "14:00",
      local: "Centro de Treinamento NEP - Salvador",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 20,
      modoCota: "LIVRE" as const,
      filaEsperaHabilitada: false,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-02-15"),
      inscricaoFim: new Date("2026-03-15"),
      prazoConfirmacaoDias: 3,
      status: "INSCRICOES_ENCERRADAS" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[4].id,
      titulo: "Humanização - Turma 1/2026",
      dataInicio: "2026-03-10",
      horaInicio: "14:00",
      horaFim: "18:00",
      local: "Auditório SAMU - Salvador",
      modalidade: "HIBRIDO" as const,
      vagasTotais: 50,
      modoCota: "LIVRE" as const,
      filaEsperaHabilitada: true,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM", "CONDUTOR", "TARM", "OUTRO"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-02-01"),
      inscricaoFim: new Date("2026-03-05"),
      prazoConfirmacaoDias: 2,
      status: "CONCLUIDA" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[0].id,
      titulo: "Via Aérea Avançada - Turma 2/2026 (Rascunho)",
      dataInicio: "2026-06-15",
      horaInicio: "08:00",
      horaFim: "17:00",
      local: "A definir",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 30,
      modoCota: "LIVRE" as const,
      filaEsperaHabilitada: true,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-05-01"),
      inscricaoFim: new Date("2026-06-10"),
      prazoConfirmacaoDias: 3,
      status: "RASCUNHO" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[1].id,
      titulo: "SBV - Turma Cancelada",
      dataInicio: "2026-02-20",
      horaInicio: "08:00",
      horaFim: "12:00",
      local: "Centro de Treinamento NEP",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 30,
      modoCota: "LIVRE" as const,
      filaEsperaHabilitada: false,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO", "TEC_ENFERMAGEM"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-01-15"),
      inscricaoFim: new Date("2026-02-15"),
      prazoConfirmacaoDias: 3,
      status: "CANCELADA" as const,
      criadoPor: admin.id,
    },
    {
      cursoId: insertedCursos[2].id,
      titulo: "XABCDE Trauma - Turma EM ANDAMENTO",
      dataInicio: "2026-03-20",
      horaInicio: "08:00",
      horaFim: "17:00",
      local: "Centro de Treinamento NEP - Salvador",
      modalidade: "PRESENCIAL" as const,
      vagasTotais: 20,
      modoCota: "LIVRE" as const,
      filaEsperaHabilitada: false,
      profissoesElegiveis: ["MEDICO", "ENFERMEIRO"],
      escopoElegibilidade: "REGIONAL_INTEIRA" as const,
      inscricaoInicio: new Date("2026-02-01"),
      inscricaoFim: new Date("2026-03-15"),
      prazoConfirmacaoDias: 3,
      status: "EM_ANDAMENTO" as const,
      criadoPor: admin.id,
    },
  ];

  const insertedTurmas = await db
    .insert(turmas)
    .values(turmaData)
    .returning();
  console.log(`✅ ${insertedTurmas.length} turmas inseridas`);

  // ══════ Cotas para turma com modo POR_UNIDADE ══════
  const turmaViaAerea = insertedTurmas[0];
  const cotaValues = insertedUnidades.slice(0, 10).map((u) => ({
    turmaId: turmaViaAerea.id,
    unidadeId: u.id,
    limite: 3,
  }));

  await db.insert(cotas).values(cotaValues);
  console.log(`✅ ${cotaValues.length} cotas inseridas`);

  // ══════ Enrollments ══════
  // Inscrever profissionais nas turmas abertas
  const turmaAberta1 = insertedTurmas[0]; // Via Aerea - INSCRICOES_ABERTAS
  const turmaAberta2 = insertedTurmas[1]; // SBV - INSCRICOES_ABERTAS

  const enrollmentValues = [];

  // Inscritos na turma de Via Aérea (só médicos e enfermeiros)
  const eligibleForViaAerea = insertedProfs.filter(
    (p) => p.profissao === "MEDICO" || p.profissao === "ENFERMEIRO",
  );

  for (let i = 0; i < Math.min(25, eligibleForViaAerea.length); i++) {
    const prof = eligibleForViaAerea[i];
    const unidadeId = insertedUnidades[i % insertedUnidades.length].id;
    const statuses = ["INSCRITO", "CONFIRMADO", "FILA_ESPERA"] as const;
    const status = i < 20 ? (i < 15 ? statuses[1] : statuses[0]) : statuses[2];

    enrollmentValues.push({
      turmaId: turmaAberta1.id,
      userId: prof.id,
      unidadeId,
      status,
      posicaoFila: status === "FILA_ESPERA" ? i - 19 : null,
      confirmadoEm: status === "CONFIRMADO" ? new Date() : null,
    });
  }

  // Inscritos na turma SBV (todos)
  for (let i = 0; i < Math.min(35, insertedProfs.length); i++) {
    const prof = insertedProfs[i];
    const unidadeId = insertedUnidades[i % insertedUnidades.length].id;
    const status = i < 30 ? "INSCRITO" as const : "FILA_ESPERA" as const;

    enrollmentValues.push({
      turmaId: turmaAberta2.id,
      userId: prof.id,
      unidadeId,
      status,
      posicaoFila: status === "FILA_ESPERA" ? i - 29 : null,
    });
  }

  if (enrollmentValues.length > 0) {
    await db.insert(enrollments).values(enrollmentValues);
    console.log(`✅ ${enrollmentValues.length} inscrições inseridas`);
  }

  // ══════ Notificações ══════
  const notifValues = insertedProfs.slice(0, 5).map((p) => ({
    tipo: "TURMA_ABERTA" as const,
    canal: "SISTEMA" as const,
    destinatarioId: p.id,
    titulo: "Nova turma disponível",
    corpo: "A turma Via Aérea Avançada - Turma 1/2026 está com inscrições abertas.",
    status: "PENDENTE" as const,
  }));

  await db.insert(notificacoes).values(notifValues);
  console.log(`✅ ${notifValues.length} notificações inseridas`);

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📋 Credenciais de acesso (senha: 123456):");
  console.log("  Organizador:  organizador@example.com");
  console.log("  Coordenador:  coordenador@example.com");
  console.log("  Profissional: profissional@example.com");

  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Erro no seed:", e);
  process.exit(1);
});
