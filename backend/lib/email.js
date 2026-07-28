import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@example.com";

function createTransporter() {
  const isSecure = SMTP_PORT === 465;
  const options = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: isSecure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  if (!isSecure) {
    options.secure = false;
    options.requireTLS = true;
  }

  return nodemailer.createTransport(options);
}

async function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return createTransporter();
}

export async function sendClientWelcomeEmail(toEmail, password, name) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log(`[EMAIL] Would send client welcome email to ${toEmail} with password ${password}`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: "Welcome to the client portal",
      text: `Hello ${name || ""},\n\nYou have been invited to the client portal.\n\nEmail: ${toEmail}\nPassword: ${password}\n\nPlease sign in at: ${process.env.FRONTEND_URL}/login`,
    });
    console.log("[EMAIL] Sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send client welcome email:", {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      to: toEmail,
      from: SMTP_FROM,
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
    });
    return false;
  }
}

export async function testSmtpConnection() {
  const transporter = await getTransporter();
  if (!transporter) {
    return { ok: false, reason: "Missing SMTP env vars" };
  }

  try {
    const result = await transporter.verify();
    console.log("[EMAIL] SMTP connection verified");
    return { ok: true, result };
  } catch (error) {
    console.error("[EMAIL] SMTP connection test failed:", {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
    });
    throw error;
  }
}

export function generatePassword(length = 12) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
