import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Nova Gym <noreply@novagym.co>";

function getClient() {
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(resendKey);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(0, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

export async function sendResetCodeEmail(
  to: string,
  code: string,
  maskedAddress: string,
) {
  const resend = getClient();
  await resend.emails.send({
    from: fromEmail,
    to,
    subject: "Nova Gym — Código de recuperación",
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="margin:0;background:#05080d;font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;text-align:center;">
    <div style="background:#16a34a;color:#052e16;display:inline-block;padding:10px 20px;border-radius:12px;font-weight:900;font-size:14px;letter-spacing:1px;">NOVA GYM</div>
    <h1 style="color:#f8fafc;font-size:28px;margin:30px 0 10px;">Recupera tu contraseña</h1>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;">
      Recibimos una solicitud de recuperación para <strong>${maskedAddress}</strong>.
    </p>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:30px;margin:30px 0;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Tu código de verificación</p>
      <p style="color:#a3e635;font-size:48px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace;">${code}</p>
      <p style="color:#64748b;font-size:12px;margin:15px 0 0;">Válido por 15 minutos</p>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;">
      Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
    </p>
    <hr style="border:none;border-top:1px solid #1e293b;margin:30px 0;"/>
    <p style="color:#475569;font-size:11px;">© ${new Date().getFullYear()} Nova Gym · Todos los derechos reservados</p>
  </div>
</body>
</html>`,
  });
}
