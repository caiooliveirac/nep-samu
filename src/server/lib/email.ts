import nodemailer from "nodemailer";

/**
 * Envio transacional por SMTP do Gmail (App Password, nunca a senha da conta) —
 * mesmo transporte do plantoes.mnrs.com.br. Envs: GMAIL_SMTP_USER e
 * GMAIL_SMTP_APP_PASSWORD; EMAIL_FROM opcional muda só o nome de exibição.
 * Sem as envs, isEmailConfigured() é false e quem depende de email diz isso na
 * cara — nunca fingimos que enviamos.
 */
function getSmtpConfig() {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  return { user, pass };
}

export function isEmailConfigured() {
  return getSmtpConfig() !== null;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("GMAIL_SMTP_USER/GMAIL_SMTP_APP_PASSWORD não configurados.");
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: config,
    });
  }
  return cachedTransporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}) {
  const config = getSmtpConfig();
  const from = process.env.EMAIL_FROM?.trim() || `NEP SAMU <${config?.user}>`;
  await getTransporter().sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });
}
