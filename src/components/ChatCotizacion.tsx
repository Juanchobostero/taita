import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'

interface MensajeRow {
  id:         string
  usuario_id: string
  mensaje:    string
  imagenes:   string[] | null
  creado_en:  string
  usuarios:   { nombre_completo: string; tipo: string } | null
}

interface Props {
  solicitudId:   string
  usuarioId:     string
  esAdmin:       boolean
}

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

const storageKey = (solicitudId: string, usuarioId: string) => `cotizacion-chat-visto-${solicitudId}-${usuarioId}`

// Widget de chat cliente↔admin para el canal de "Solicitar cotización" (Fase 7b) — mismo
// componente para las dos puntas, solo cambia qué mensajes se alinean a la derecha (los propios).
// Arranca colapsado (botón "Abrir chat" + badge de no leídos) — ahorra espacio en la pantalla de
// detalle y de paso evita el auto-scroll de la página entera hacia el chat que pasaba antes al
// entrar o al llegar un mensaje nuevo (Jota, feedback post-prueba: el chat quedaba siempre
// visible y arrastraba el scroll). El contador de "no leídos" se guarda en localStorage (por
// solicitud + usuario) — es solo una comodidad de UI, no hace falta una tabla de "visto" en la
// base para esto.
export default function ChatCotizacion({ solicitudId, usuarioId, esAdmin }: Props) {
  const [mensajes, setMensajes] = useState<MensajeRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [abierto,  setAbierto]  = useState(false)
  const [noLeidos, setNoLeidos] = useState(0)
  const [texto,    setTexto]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error,    setError]    = useState('')
  const listaRef = useRef<HTMLDivElement>(null)
  const instanceId = useId()

  const cargar = async () => {
    const res = await fetch(`/api/cotizacion/mensajes?solicitudId=${solicitudId}`)
    if (res.ok) {
      const { mensajes } = await res.json()
      setMensajes(mensajes ?? [])
    }
  }

  useEffect(() => {
    cargar().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId])

  // Recalcula "no leídos" cada vez que cambian los mensajes, salvo mientras el chat está abierto
  // (ahí se considera todo visto al instante — ver el otro useEffect de abajo).
  useEffect(() => {
    if (abierto) return
    const visto = localStorage.getItem(storageKey(solicitudId, usuarioId))
    const nuevos = mensajes.filter(m => m.usuario_id !== usuarioId && (!visto || m.creado_en > visto)).length
    setNoLeidos(nuevos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensajes, abierto])

  // Al abrir el chat (o al llegar un mensaje nuevo mientras ya está abierto), se marca todo como
  // visto y se hace scroll al final — pero SOLO dentro del contenedor del chat (`scrollTop`, no
  // `scrollIntoView`), que era justo lo que antes arrastraba el scroll de toda la página.
  useEffect(() => {
    if (!abierto) return
    localStorage.setItem(storageKey(solicitudId, usuarioId), new Date().toISOString())
    setNoLeidos(0)
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
  }, [abierto, mensajes, solicitudId, usuarioId])

  // Mismo patrón que el resto de la app (MisSolicitudes, SolicitudesTecnico, etc.): no se escucha
  // Realtime directo sobre `cotizacion_mensajes` (su policy de SELECT tiene un JOIN/EXISTS, que
  // rompe Realtime silenciosamente) — se escucha `notificaciones` (policy simple) como disparador
  // de refresco, ya que cada mensaje nuevo genera una notificación para el otro participante.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-cotizacion-${solicitudId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usuarioId}` },
        () => { cargar() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId, usuarioId, instanceId])

  const enviar = async () => {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    setError('')
    const res = await fetch('/api/cotizacion/mensaje', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId, mensaje: texto.trim() }),
    })
    if (res.ok) {
      setTexto('')
      await cargar()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'No se pudo enviar el mensaje')
    }
    setEnviando(false)
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full flex items-center justify-center gap-2 bg-cream hover:bg-primary-soft border border-cream-dark hover:border-primary-pale text-gray-700 hover:text-primary font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
      >
        💬 Abrir chat
        {noLeidos > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {noLeidos} nuevo{noLeidos > 1 ? 's' : ''}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chat</span>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium"
        >
          ▲ Cerrar
        </button>
      </div>

      <div ref={listaRef} className="flex flex-col gap-3 max-h-96 overflow-y-auto px-1">
        {loading && <p className="text-xs text-gray-400 text-center py-4">Cargando conversación…</p>}
        {!loading && mensajes.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Todavía no hay mensajes.</p>
        )}
        {mensajes.map(m => {
          const propio = m.usuario_id === usuarioId
          const nombre = m.usuarios?.tipo === 'admin' ? 'Taita' : (m.usuarios?.nombre_completo ?? '—')
          return (
            <div key={m.id} className={`flex flex-col gap-1 ${propio ? 'items-end' : 'items-start'}`}>
              <span className="text-[11px] text-gray-400">{nombre} · {fmtHora(m.creado_en)}</span>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                propio ? 'bg-primary text-white rounded-br-sm' : 'bg-cream text-gray-800 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
                {m.imagenes && m.imagenes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.imagenes.map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-end gap-2 pt-2 border-t border-cream">
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
          }}
          rows={1}
          placeholder={esAdmin ? 'Responderle al cliente...' : 'Escribile al equipo de Taita...'}
          className="flex-1 resize-none border border-cream-dark rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 shrink-0"
        >
          {enviando ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
