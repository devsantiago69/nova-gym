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

function resetCodeEmailHtml(code: string, maskedAddress: string) {
  const year = new Date().getFullYear();
  // Rompe el patrón "texto@dominio" con un espacio de ancho cero para que
  // Gmail/Apple Mail no lo conviertan automáticamente en un enlace azul
  // (eso pisaba los colores de marca del correo).
  const [maskedLocal, maskedDomain] = maskedAddress.split("@");
  const safeMaskedAddress =
    maskedLocal && maskedDomain ? `${maskedLocal}&zwnj;@${maskedDomain}` : maskedAddress;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<meta name="x-apple-disable-message-reformatting" />
<title>Nova Gym — Código de recuperación</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  a { color: inherit !important; text-decoration: none !important; }
  u + .body a { color: inherit !important; }
  /* Bloquea el repintado de modo oscuro de Gmail sobre los acentos de marca */
  [data-ogsc] .badge-cell, [data-ogsb] .badge-cell { background-color: #a3e635 !important; }
  [data-ogsc] .badge-text, [data-ogsb] .badge-text { color: #052e16 !important; }
  [data-ogsc] .topbar, [data-ogsb] .topbar { background-color: #a3e635 !important; }
  [data-ogsc] .code-box, [data-ogsb] .code-box { background-color: #f7fee7 !important; }
  [data-ogsc] .code-text, [data-ogsb] .code-text { color: #4d7c0f !important; }
  [data-ogsc] .card, [data-ogsb] .card { background-color: #ffffff !important; }
  @media (prefers-color-scheme: dark) {
    .badge-cell { background-color: #a3e635 !important; }
    .badge-text { color: #052e16 !important; }
    .topbar { background-color: #a3e635 !important; }
    .card { background-color: #ffffff !important; }
    .code-box { background-color: #f7fee7 !important; }
    .code-text { color: #4d7c0f !important; }
  }
</style>
</head>
<body class="body" style="margin:0;padding:0;background-color:#05080d;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    Usa este código para restablecer tu contraseña en Nova Gym. Expira en 15 minutos.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#05080d;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="badge-cell" bgcolor="#a3e635" style="background-color:#a3e635;border-radius:12px;padding:10px 20px;">
                    <span class="badge-text" style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:900;font-size:14px;letter-spacing:1px;color:#052e16;">NOVA GYM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="card" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="topbar" height="5" bgcolor="#a3e635" style="background-color:#a3e635;line-height:5px;font-size:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:36px 32px 8px;" align="center">
                    <h1 style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:900;font-size:26px;line-height:1.3;color:#0f172a;">
                      Recupera tu contraseña
                    </h1>
                    <p style="margin:14px 0 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
                      Recibimos una solicitud de recuperación para <strong style="color:#0f172a;">${safeMaskedAddress}</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="code-box" bgcolor="#f7fee7" style="background-color:#f7fee7;border:1px solid #d9f99d;border-radius:16px;">
                      <tr>
                        <td align="center" style="padding:26px 20px;">
                          <p style="margin:0 0 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0e7490;">
                            Tu código de verificación
                          </p>
                          <p class="code-text" style="margin:0;font-family:'Courier New',Courier,monospace;font-weight:900;font-size:42px;letter-spacing:10px;color:#4d7c0f;">
                            ${code}
                          </p>
                          <p style="margin:14px 0 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#65a30d;">
                            Válido por 15 minutos
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 36px;" align="center">
                    <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
                      Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña actual seguirá funcionando.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#64748b;">
                © ${year} Nova Gym · Todos los derechos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    html: resetCodeEmailHtml(code, maskedAddress),
  });
}
