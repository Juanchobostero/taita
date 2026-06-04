import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const resend = async () => {
    setState('sending')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setState(error ? 'error' : 'sent')
    if (!error) setTimeout(() => setState('idle'), 4000)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-gray-500">
        ¿No recibiste el correo? Podés{' '}
        <button
          onClick={resend}
          disabled={state === 'sending' || state === 'sent'}
          className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
        >
          reenviarlo
        </button>
        .
      </p>

      {state === 'sent' && (
        <p className="text-xs text-green-600 font-medium">✓ Correo reenviado. Revisá tu bandeja.</p>
      )}
      {state === 'error' && (
        <p className="text-xs text-red-500">No se pudo reenviar. Intentá de nuevo.</p>
      )}
    </div>
  )
}
