import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// El link de confirmación de Supabase (registro de cliente/técnico) vuelve siempre a /login
// (emailRedirectTo, ver RegistroForm.tsx) — nunca inicia sesión solo, así que esta página necesita
// distinguir dos casos posibles al llegar: que la confirmación salió bien, o que el link falló
// (vencido, ya usado, etc). La lectura de la URL (que puede traer un `?code=` de flujo PKCE, o
// `type=signup` + tokens en el `#hash` de flujo implícito, o un error en cualquiera de los dos) la
// hace un <script is:inline> síncrono en login.astro que corre antes de que hidrate este
// componente — acá solo se lee lo que ese script ya dejó en sessionStorage. Ver ese archivo para
// el detalle de por qué se resuelve ahí y no acá.

const MENSAJES_ERROR: Record<string, string> = {
  otp_expired: 'El link de confirmación venció. Los links son válidos por un tiempo limitado — pedí que te mandemos uno nuevo.',
  access_denied: 'El link de confirmación no es válido o ya fue usado. Pedí que te mandemos uno nuevo.',
}

export default function AuthRedirectBanner() {
  const [error, setError]         = useState<{ codigo: string; mensaje: string } | null>(null)
  const [confirmado, setConfirmado] = useState(false)
  const [email, setEmail]         = useState('')
  const [estado, setEstado]       = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  useEffect(() => {
    const errorCode = sessionStorage.getItem('taita_auth_error')
    if (errorCode) {
      sessionStorage.removeItem('taita_auth_error')
      setError({ codigo: errorCode, mensaje: MENSAJES_ERROR[errorCode] || 'Hubo un problema al confirmar tu cuenta. Pedí que te mandemos un link nuevo e intentá otra vez.' })
      return
    }
    if (sessionStorage.getItem('taita_email_confirmado') === '1') {
      sessionStorage.removeItem('taita_email_confirmado')
      setConfirmado(true)
    }
  }, [])

  if (!error && !confirmado) return null

  if (confirmado) {
    return (
      <div className="bg-green-50 border-b border-green-200 text-green-800">
        <div className="max-w-5xl mx-auto px-4 py-3 text-sm text-center">
          ✓ Tu correo fue confirmado. Ya podés iniciar sesión.
        </div>
      </div>
    )
  }

  const reenviar = async () => {
    if (!email.trim()) return
    setEstado('sending')
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setEstado(resendError ? 'error' : 'ok')
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="flex-1 text-sm">⚠️ {error!.mensaje}</span>
        {estado === 'ok' ? (
          <span className="text-xs font-semibold text-green-700 shrink-0">✓ Te mandamos un correo nuevo, revisá tu bandeja.</span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="text-xs bg-white border border-amber-300 rounded-full px-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={reenviar}
              disabled={estado === 'sending' || !email.trim()}
              className="text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {estado === 'sending' ? 'Enviando…' : estado === 'error' ? 'Error, reintentar' : 'Reenviar confirmación'}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setError(null)}
          aria-label="Cerrar aviso"
          className="text-amber-500 hover:text-amber-700 shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
