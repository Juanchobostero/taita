import { Resend } from 'resend'

const apiKey = import.meta.env.RESEND_API_KEY
const from    = import.meta.env.RESEND_FROM_EMAIL || 'Taita Soluciones <onboarding@resend.dev>'

const resend = apiKey ? new Resend(apiKey) : null

interface EnviarEmailParams {
  to:      string
  subject: string
  html:    string
}

// Si no hay API key configurada (dev/preview sin Resend), no rompe: solo loguea y no envía.
export async function enviarEmail({ to, subject, html }: EnviarEmailParams): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY no configurada — se omite envío a ${to}: "${subject}"`)
    return
  }
  try {
    await resend.emails.send({ from, to, subject, html })
  } catch (err) {
    console.error(`[email] Error enviando a ${to}:`, err)
  }
}
