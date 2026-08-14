/**
 * Nome completo e WhatsApp são o que faz a inscrição chegar na pessoa: sem
 * sobrenome ninguém acha quem é na lista de presença, e sem WhatsApp certo o
 * aviso de vaga não chega. Por isso a régua mora num lugar só — cadastro por
 * convite, cadastro feito pelo coordenador e confirmação de inscrição usam
 * exatamente esta.
 */

export function erroNomeCompleto(nome: string): string | null {
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (limpo.length < 5) return "Informe o nome completo (nome e sobrenome).";
  const partes = limpo.split(" ").filter((p) => p.length >= 2);
  if (partes.length < 2) {
    return "Informe o nome completo — só o primeiro nome não serve.";
  }
  return null;
}

/** Só os dígitos: é assim que o número é comparado e validado. */
export function digitosTelefone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

export function erroWhatsapp(telefone: string): string | null {
  const d = digitosTelefone(telefone);
  if (d.length === 0) return "Informe o WhatsApp com DDD.";
  if (d.length < 10 || d.length > 11) {
    return "WhatsApp inválido — use DDD + número, ex.: (71) 99999-9999.";
  }
  // 11 dígitos = celular, e celular no Brasil começa com 9 depois do DDD.
  if (d.length === 11 && d[2] !== "9") {
    return "WhatsApp inválido — confira o DDD e o número.";
  }
  return null;
}

/** "(71) 99999-9999" — o formato que a tela mostra e o banco guarda. */
export function formatarTelefone(telefone: string): string {
  const d = digitosTelefone(telefone).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
