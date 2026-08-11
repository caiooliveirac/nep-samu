// Mesma política do plantoes.mnrs.com.br, para não haver duas ideias de "senha
// forte" entre sistemas do SAMU.
const MIN_PASSWORD_LENGTH = 10;

export function getPasswordPolicyError(
  password: string,
  currentPassword?: string | null,
) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  const grupos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((padrao) =>
    padrao.test(password),
  ).length;
  if (grupos < 3) {
    return "A nova senha precisa combinar pelo menos três grupos: letra minúscula, letra maiúscula, número e símbolo.";
  }

  if (currentPassword && password === currentPassword) {
    return "A nova senha precisa ser diferente da senha atual.";
  }

  return null;
}
