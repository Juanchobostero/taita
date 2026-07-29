import { Resend } from 'resend'

const apiKey   = import.meta.env.RESEND_API_KEY
const from     = import.meta.env.RESEND_FROM_EMAIL || 'Taita Soluciones <onboarding@resend.dev>'
// El logo va siempre al dominio real (no a PUBLIC_SITE_URL) porque es un asset estático público —
// si se probara en local, PUBLIC_SITE_URL apunta a localhost, que ningún cliente de correo externo
// (Gmail, etc.) puede alcanzar para mostrar la imagen.
const LOGO_URL = 'https://taitasoluciones.com.ar/images/taita-avatar.webp'

const resend = apiKey ? new Resend(apiKey) : null

interface EnviarEmailParams {
  to:      string
  subject: string
  html:    string
}

// Envuelve el contenido de cada email (que sigue siendo simple: <p>, <ul>, <a>, definido en cada
// llamada a enviarEmail) con la identidad visual de Taita — logo, colores, tipografía. Se aplica
// acá, en un solo lugar, para que ningún llamado a enviarEmail tenga que armar su propio HTML de
// header/footer. Tablas en vez de flex/grid porque son lo único que renderiza bien en todos los
// clientes de correo (Outlook en particular no soporta flexbox).
function plantillaEmail(contenido: string): string {
  return `
    <div style="background-color:#F5EFE6;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E8E0D5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1B4D2E;">
          <tr>
            <td style="padding:18px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${LOGO_URL}" alt="Taita Soluciones" width="40" height="40" style="display:block;border-radius:50%;background-color:#ffffff;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:12px;">
                    <span style="color:#ffffff;font-size:18px;font-weight:bold;font-family:Georgia,'Times New Roman',serif;">Taita Soluciones</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="padding:28px 24px;color:#333333;font-size:14px;line-height:1.6;">
          ${contenido}
        </div>
        <div style="background-color:#F5EFE6;padding:16px 24px;text-align:center;border-top:1px solid #E8E0D5;">
          <p style="margin:0;color:#9C8F7A;font-size:11px;">Taita Soluciones — conectamos técnicos con quienes los necesitan.</p>
        </div>
      </div>
    </div>
  `
}

// Si no hay API key configurada (dev/preview sin Resend), no rompe: solo loguea y no envía.
export async function enviarEmail({ to, subject, html }: EnviarEmailParams): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY no configurada — se omite envío a ${to}: "${subject}"`)
    return
  }
  try {
    await resend.emails.send({ from, to, subject, html: plantillaEmail(html) })
  } catch (err) {
    console.error(`[email] Error enviando a ${to}:`, err)
  }
}
