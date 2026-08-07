import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserTipo } from '@/lib/types'

interface Notif {
  id:           string
  solicitud_id: string | null
  titulo:       string
  mensaje:      string | null
  leida:        boolean
  creado_en:    string
}

interface Props {
  userId: string
  tipo:   UserTipo
  // El navbar mobile tiene fondo verde Taita — ahí el ícono necesita ser blanco para tener
  // contraste. En el navbar de escritorio (fondo blanco) sigue siendo verde como siempre.
  iconClassName?: string
}

const BASE_SOLICITUD: Record<UserTipo, string> = {
  cliente: '/dashboard/cliente/solicitud',
  tecnico: '/dashboard/tecnico/solicitud',
  admin:   '/dashboard/admin/solicitud',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
}

export default function NotificacionesBell({ userId, tipo, iconClassName = 'text-primary' }: Props) {
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [unread, setUnread]   = useState(0)
  const [open, setOpen]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // El Navbar monta esta campanita dos veces a la vez (una versión desktop, una mobile — Tailwind
  // solo oculta la que no corresponde con CSS, no la desmonta), así que el nombre del canal tiene
  // que ser único por instancia o la segunda choca contra el `.subscribe()` de la primera.
  const instanceId = useId()

  useEffect(() => {
    let cancelado = false

    const cargarInicial = async () => {
      const [{ data: recientes }, { count }] = await Promise.all([
        supabase.from('notificaciones').select('*').eq('usuario_id', userId).order('creado_en', { ascending: false }).limit(20),
        supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('usuario_id', userId).eq('leida', false),
      ])
      if (cancelado) return
      setNotifs(recientes ?? [])
      setUnread(count ?? 0)
    }
    cargarInicial()

    // Tiempo real: apenas se inserta una notificación nueva para este usuario, aparece sin
    // recargar la página. Solo escucha inserts — el "marcar como leída" es optimista local,
    // no se sincroniza entre pestañas (no hace falta para este caso de uso).
    const channel = supabase
      .channel(`notificaciones-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` },
        (payload) => {
          setNotifs(prev => [payload.new as Notif, ...prev].slice(0, 20))
          setUnread(prev => prev + 1)
        },
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [userId, instanceId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const marcarLeida = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setUnread(prev => {
      const n = notifs.find(x => x.id === id)
      return n && !n.leida ? Math.max(0, prev - 1) : prev
    })
    await fetch('/api/notificaciones/marcar-leida', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
  }

  const marcarTodasLeidas = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
    setUnread(0)
    await fetch('/api/notificaciones/marcar-leida', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ todas: true }),
    })
  }

  const onClickNotif = (n: Notif) => {
    if (!n.leida) marcarLeida(n.id)
    if (n.solicitud_id) window.location.href = `${BASE_SOLICITUD[tipo]}/${n.solicitud_id}`
    else setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notificaciones"
        className={`relative p-2 rounded-full hover:opacity-60 transition-opacity ${iconClassName}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" strokeWidth={2} />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-lg border border-cream-dark z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-cream">
            <p className="text-sm font-semibold text-gray-800">Notificaciones</p>
            {unread > 0 && (
              <button onClick={marcarTodasLeidas} className="text-xs text-primary hover:underline font-medium">
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-cream">
            {notifs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No tenés notificaciones todavía.</p>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => onClickNotif(n)}
                  className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-cream/60 transition-colors ${!n.leida ? 'bg-primary-soft/40' : ''}`}
                >
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.leida ? 'bg-primary' : 'bg-transparent'}`} />
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-gray-800 leading-snug">{n.titulo}</span>
                    {n.mensaje && <span className="text-xs text-gray-500 leading-snug">{n.mensaje}</span>}
                    <span className="text-[11px] text-gray-400">{fmt(n.creado_en)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
