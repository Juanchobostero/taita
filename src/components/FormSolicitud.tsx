import { useState, useMemo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { FRANJA_LABEL, type FranjaHoraria } from '@/lib/disponibilidad'
import MapaUbicacion from '@/components/MapaUbicacion'
import { StepperSidebar, StepperMobileBar } from '@/components/WizardStepper'

interface CategoriaOpt {
  id: string
  nombre: string
  icono: string | null
  imagen_url: string | null
  porcentaje_tasa: number
  precio_base: number | null
}

interface SubitemOpt {
  id:              string
  categoria_id:    string
  nombre:          string
  descripcion:     string | null
  precio:          number | null
  porcentaje_tasa: number
}

interface Props {
  tecnicoId:           string | null
  tecnicoNombre:       string | null
  categorias:          CategoriaOpt[]
  subitems?:           SubitemOpt[]
  defaultCategoriaId?: string | null
  emailVerificado?:    boolean
}

interface Candidato {
  id:                    string
  nombre_display:        string
  foto_url:              string | null
  calificacion_promedio: number
  total_servicios:       number
  zona:                  string
}

const schema = z.object({
  categoria_id:     z.string().min(1, 'Seleccioná una categoría'),
  titulo:           z.string().min(5, 'Mínimo 5 caracteres'),
  descripcion:      z.string().optional(),
  fecha_solicitada: z.string().min(1, 'Ingresá una fecha'),
  hora_solicitada:  z.string().min(1, 'Elegí una franja horaria'),
  direccion:        z.string().min(5, 'Ingresá la dirección del trabajo'),
})

type FormData = z.infer<typeof schema>
type FieldName = keyof FormData

interface Conflicto {
  disponible: boolean
  sugerido?: { fecha: string; hora: string }
}

interface SugerenciaDireccion {
  lat:   number
  lng:   number
  label: string
}

const DEBOUNCE_DIRECCION_MS = 900
// El cliente ya no elige un horario puntual (Fase 8.4) — solo la franja amplia. Internamente se
// sigue guardando una `hora_solicitada` representativa de esa franja (mismo campo que ya usan
// `chequearDisponibilidad`/`franjaDeHora` para el flujo de técnico fijo y para sugerirle al admin
// una franja por default al asignar) — el horario puntual real lo termina coordinando el admin.
const HORA_REPRESENTATIVA_FRANJA: Record<FranjaHoraria, string> = {
  manana: '09:00',
  tarde:  '14:00',
  noche:  '19:00',
}

const PASOS: { n: number; label: string; sub: string; campos: FieldName[] }[] = [
  { n: 1, label: 'Servicio',  sub: 'Qué necesitás',      campos: ['categoria_id'] },
  { n: 2, label: 'Técnicos Sugeridos', sub: 'Quién puede tocarte', campos: [] },
  { n: 3, label: 'Detalles',  sub: 'El trabajo',          campos: ['titulo'] },
  { n: 4, label: 'Cuándo',    sub: 'Fecha y horario',     campos: ['fecha_solicitada', 'hora_solicitada'] },
  { n: 5, label: 'Dónde',     sub: 'Dirección',           campos: ['direccion'] },
  { n: 6, label: 'Confirmar', sub: 'Revisá y enviá',      campos: [] },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

export default function FormSolicitud({ tecnicoId, tecnicoNombre, categorias, subitems = [], defaultCategoriaId, emailVerificado = true }: Props) {
  const [reenviando, setReenviando] = useState(false)
  const [reenviado,  setReenviado]  = useState(false)

  const reenviarEmail = async () => {
    setReenviando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) await supabase.auth.resend({ type: 'signup', email: user.email })
    setReenviando(false)
    setReenviado(true)
  }
  const [serverError, setServerError] = useState('')
  const [success, setSuccess]         = useState(false)
  const [paso, setPaso]               = useState(1)

  const { register, handleSubmit, watch, setValue, trigger, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoria_id: (defaultCategoriaId && categorias.find(c => c.id === defaultCategoriaId))
        ? defaultCategoriaId
        : categorias[0]?.id ?? '',
    },
  })

  const categoriaId = watch('categoria_id')
  const [subitemId, setSubitemId] = useState<string | null>(null)
  const [franjaSolicitada, setFranjaSolicitada] = useState<FranjaHoraria | null>(null)
  const subitemsCategoria = useMemo(
    () => subitems.filter(s => s.categoria_id === categoriaId),
    [subitems, categoriaId],
  )
  // Al cambiar de categoría, el sub-ítem elegido de la categoría anterior ya no aplica.
  useEffect(() => { setSubitemId(null) }, [categoriaId])

  // ── Canal de "Solicitar cotización" (Fase 7b) ──────────────────────────────
  // Independiente de si la categoría tiene sub-ítems o no — es la opción para cuando el cliente
  // no encuentra lo que necesita entre ellos. Se excluye mutuamente con elegir un sub-ítem: uno
  // implica precio fijo conocido, el otro implica "no sé el precio, necesito que me cotice el
  // admin" — no tiene sentido tener los dos a la vez.
  const [esCotizacion, setEsCotizacion] = useState(false)
  const [imagenesCotizacion, setImagenesCotizacion] = useState<string[]>([])
  const [subiendoImagenCot, setSubiendoImagenCot] = useState(false)
  const [errorImagenCot, setErrorImagenCot] = useState('')
  const sesionIdRef = useRef(Math.random().toString(36).slice(2))
  const imagenCotInputRef = useRef<HTMLInputElement>(null)

  const toggleCotizacion = () => {
    setEsCotizacion(v => {
      const next = !v
      if (next) setSubitemId(null)
      return next
    })
  }

  const elegirSubitem = (id: string) => {
    setSubitemId(prev => prev === id ? null : id)
    setEsCotizacion(false)
  }

  const handleFilesCotizacion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (imagenesCotizacion.length + files.length > 5) {
      setErrorImagenCot('Máximo 5 fotos.')
      return
    }
    setSubiendoImagenCot(true)
    setErrorImagenCot('')
    const urls: string[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrorImagenCot(`"${file.name}" no es una imagen válida.`)
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorImagenCot(`"${file.name}" pesa más de 5MB — subí una versión más liviana.`)
        continue
      }
      const ext  = file.name.split('.').pop()
      const path = `${sesionIdRef.current}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('cotizaciones').upload(path, file, { upsert: false })
      if (upErr) {
        setErrorImagenCot(`No se pudo subir "${file.name}": ${upErr.message}`)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('cotizaciones').getPublicUrl(path)
      urls.push(publicUrl)
    }
    setImagenesCotizacion(prev => [...prev, ...urls])
    setSubiendoImagenCot(false)
    if (imagenCotInputRef.current) imagenCotInputRef.current.value = ''
  }

  const quitarImagenCotizacion = (idx: number) => {
    setImagenesCotizacion(prev => prev.filter((_, i) => i !== idx))
  }
  const tituloVal    = watch('titulo')
  const fechaVal     = watch('fecha_solicitada')
  const direccionVal = watch('direccion')

  const [candidatos, setCandidatos]         = useState<Candidato[]>([])
  const [loadingCands, setLoadingCands]     = useState(false)
  const [verTodos, setVerTodos]             = useState(false)
  const [conflicto, setConflicto]           = useState<Conflicto | null>(null)
  const [chequeando, setChequeando]         = useState(false)
  const [ubicacion, setUbicacion]           = useState<{ lat: number; lng: number } | null>(null)
  const [sugerencias, setSugerencias]       = useState<SugerenciaDireccion[]>([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [buscandoDireccion, setBuscandoDireccion]   = useState(false)
  const ignorarProximaBusqueda = useRef(false)

  const direccion = watch('direccion')

  // Autocompletado de dirección — con debounce, y saltea la búsqueda que dispararía el propio
  // `setValue` de cuando el usuario elige una sugerencia (si no, reabriría el dropdown solo).
  useEffect(() => {
    if (ignorarProximaBusqueda.current) {
      ignorarProximaBusqueda.current = false
      return
    }
    if (!direccion || direccion.trim().length < 5) {
      setSugerencias([])
      return
    }
    const timeout = setTimeout(async () => {
      setBuscandoDireccion(true)
      try {
        const res  = await fetch(`/api/geocodificar?direccion=${encodeURIComponent(direccion)}`)
        const json = await res.json()
        setSugerencias(json.resultados ?? [])
        setMostrarSugerencias(true)
      } catch {
        setSugerencias([])
      } finally {
        setBuscandoDireccion(false)
      }
    }, DEBOUNCE_DIRECCION_MS)
    return () => clearTimeout(timeout)
  }, [direccion])

  const elegirSugerencia = (s: SugerenciaDireccion) => {
    ignorarProximaBusqueda.current = true
    setValue('direccion', s.label, { shouldValidate: true })
    setUbicacion({ lat: s.lat, lng: s.lng })
    setSugerencias([])
    setMostrarSugerencias(false)
  }

  useEffect(() => {
    if (tecnicoId || !categoriaId) { setCandidatos([]); return }
    setLoadingCands(true)
    setVerTodos(false)
    fetch(`/api/tecnicos-por-categoria?categoria_id=${categoriaId}`)
      .then(r => r.json())
      .then(({ tecnicos }) => setCandidatos(tecnicos ?? []))
      .catch(() => setCandidatos([]))
      .finally(() => setLoadingCands(false))
  }, [categoriaId, tecnicoId])

  const { tasa, precioBase, total } = useMemo(() => {
    // Pedir cotización siempre gana — no hay precio para mostrar hasta que el admin lo defina.
    if (esCotizacion) return { tasa: 0, precioBase: null, total: null }
    const sub = subitemId ? subitemsCategoria.find(s => s.id === subitemId) : null
    const cat = categorias.find(c => c.id === categoriaId)
    // El sub-ítem elegido pisa el precio/tasa de la categoría "madre" — es más específico.
    const tasa        = sub ? sub.porcentaje_tasa : cat?.porcentaje_tasa ?? 0
    const precioBase   = sub ? sub.precio : cat?.precio_base ?? null
    const total        = precioBase != null ? Math.round(precioBase * (1 + tasa / 100)) : null
    return { tasa, precioBase, total }
  }, [categoriaId, categorias, subitemId, subitemsCategoria, esCotizacion])

  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId)

  const siguiente = async () => {
    const campos = PASOS[paso - 1].campos
    if (campos.length > 0) {
      const ok = await trigger(campos)
      if (!ok) return
    }
    // En el canal de cotización la descripción es el primer mensaje del chat con el admin — no
    // puede quedar vacía. `descripcion` es opcional en el schema base (se usa igual en el flujo
    // normal), así que se valida acá aparte en vez de en el schema.
    if (paso === 3 && esCotizacion && !watch('descripcion')?.trim()) {
      setError('descripcion', { message: 'Describí el problema para pedir la cotización' })
      return
    }
    setPaso(p => Math.min(p + 1, PASOS.length))
  }

  const atras = () => setPaso(p => Math.max(p - 1, 1))

  const onSubmit = async (data: FormData) => {
    setServerError('')
    setConflicto(null)

    if (tecnicoId) {
      setChequeando(true)
      try {
        const r = await fetch(
          `/api/disponibilidad-tecnico?tecnicoId=${tecnicoId}&fecha=${data.fecha_solicitada}` +
          `&hora=${data.hora_solicitada}`
        )
        const disp: Conflicto = await r.json()
        if (!disp.disponible) {
          setConflicto(disp)
          setPaso(4)
          return
        }
      } finally {
        setChequeando(false)
      }
    }

    const res = await fetch('/api/crear-solicitud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tecnicoId,
        categoriaId:         data.categoria_id,
        categoriaSubitemId: subitemId,
        titulo:          data.titulo,
        descripcion:     data.descripcion || null,
        precioBase,
        tasaAplicada:    tasa,
        totalEstimado:   total,
        fechaSolicitada: data.fecha_solicitada,
        horaSolicitada:  data.hora_solicitada,
        direccion:       data.direccion,
        latitud:         ubicacion?.lat ?? null,
        longitud:        ubicacion?.lng ?? null,
        esCotizacion,
        imagenesCotizacion: esCotizacion ? imagenesCotizacion : undefined,
        franjaSolicitada,
      }),
    })
    if (!res.ok) {
      const { error, sugerido } = await res.json()
      setServerError(error ?? 'Error al enviar la solicitud')
      if (sugerido) { setConflicto({ disponible: false, sugerido }); setPaso(4) }
      return
    }
    setSuccess(true)
  }

  const usarSugerido = () => {
    if (!conflicto?.sugerido) return
    setValue('fecha_solicitada', conflicto.sugerido.fecha)
    setValue('hora_solicitada', conflicto.sugerido.hora)
    setConflicto(null)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-8 text-center flex flex-col gap-3">
        <p className="text-2xl">✅</p>
        <p className="font-bold text-lg">{esCotizacion ? '¡Pedido de cotización enviado!' : '¡Solicitud enviada!'}</p>
        <p className="text-sm">
          {esCotizacion
            ? 'El equipo de Taita va a revisar tu pedido y te va a escribir para coordinar el precio.'
            : tecnicoNombre ? `Le avisamos a ${tecnicoNombre}.` : 'Te asignaremos el técnico ideal.'
          } Podés ver el estado en tu panel.
        </p>
        <a href="/dashboard/cliente" className="mt-2 text-primary hover:text-primary-hover font-medium text-sm">
          Ir a mi panel →
        </a>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const info  = PASOS[paso - 1]

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      <StepperSidebar pasos={PASOS} actual={paso} titulo="Tu solicitud" />

      {/* Card principal — OJO: es un <form> pero ningún botón es type="submit" y su onSubmit
          siempre hace preventDefault. El envío real se dispara a mano, solo con el click
          explícito en "Enviar solicitud" (ver más abajo), nunca por el mecanismo nativo del
          navegador — así no hay ninguna forma de que Enter, autocompletado, o timing de
          hidratación disparen un envío que el cliente no haya clickeado. */}
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
          e.preventDefault()
          if (paso < PASOS.length) siguiente()
        }}
        className="flex-1 bg-white rounded-2xl border border-cream-dark shadow-sm flex flex-col min-w-0"
      >

        <StepperMobileBar total={PASOS.length} actual={paso} label={info.label} />

        <div className="flex-1 p-5 sm:p-8 flex flex-col gap-5">
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Paso {paso} de {PASOS.length}</p>
          </div>

          {/* ── Paso 1: Servicio ─────────────────────────────────────────── */}
          {paso === 1 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">¿Qué necesitás resolver?</h2>
                <p className="text-gray-500 text-sm mt-1">Elegí el tipo de servicio y armamos el resto en un minuto.</p>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${errors.categoria_id ? 'ring-1 ring-destructive rounded-xl p-1' : ''}`}>
                {categorias.map(c => (
                  <label
                    key={c.id}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      categoriaId === c.id
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-cream-dark hover:border-primary-pale bg-white text-gray-600'
                    }`}
                  >
                    <input type="radio" value={c.id} {...register('categoria_id')} className="hidden" />
                    <div className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${categoriaId === c.id ? 'bg-white' : 'bg-cream'}`}>
                      {c.imagen_url
                        ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                        : <span className="text-xl">{c.icono || '🛠️'}</span>
                      }
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide leading-tight">{c.nombre}</span>
                  </label>
                ))}
              </div>
              <FieldError msg={errors.categoria_id?.message} />

              {/* Sub-ítems con precio (Fase 7a) — solo si la categoría elegida tiene alguno
                  activo. Elegir uno fija el precio/tasa de ESE sub-ítem en vez del de la
                  categoría; no elegir ninguno deja el comportamiento de antes (precio de la
                  categoría, o "a convenir" si tampoco tiene). */}
              {subitemsCategoria.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-cream">
                  <p className="text-sm font-semibold text-gray-700">¿Cuál de estos es tu caso?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {subitemsCategoria.map(s => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => elegirSubitem(s.id)}
                        className={`flex flex-col gap-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          subitemId === s.id
                            ? 'border-primary bg-primary-soft text-primary'
                            : 'border-cream-dark hover:border-primary-pale bg-white text-gray-600'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{s.nombre}</span>
                          <span className="text-sm font-semibold shrink-0">
                            {s.precio != null ? `$${s.precio.toLocaleString('es-AR')}` : 'A convenir'}
                          </span>
                        </span>
                        {s.descripcion && (
                          <span className={`text-xs leading-snug ${subitemId === s.id ? 'text-primary/70' : 'text-gray-400'}`}>
                            {s.descripcion}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    {subitemId ? 'Tocá de nuevo para deseleccionar.' : 'Ninguno seleccionado — seguís con el precio general de la categoría.'}
                  </p>
                </div>
              )}

              {/* Canal de "Solicitar cotización" — independiente de si hay sub-ítems o no. */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                esCotizacion ? 'border-primary bg-primary-soft' : 'border-cream-dark hover:border-primary-pale bg-white'
              }`}>
                <input type="checkbox" checked={esCotizacion} onChange={toggleCotizacion} className="mt-0.5 accent-primary w-4 h-4 shrink-0" />
                <div>
                  <p className={`text-sm font-semibold ${esCotizacion ? 'text-primary' : 'text-gray-700'}`}>
                    ¿No encontrás lo que buscás? Pedí una cotización
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Contanos el problema con detalle y fotos, y el equipo de Taita te va a escribir
                    para coordinar el precio antes de asignar un técnico.
                  </p>
                </div>
              </label>
            </>
          )}

          {/* ── Paso 2: Técnico (informativo) ───────────────────────────── */}
          {paso === 2 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">¿Quién puede tocarte?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {tecnicoId
                    ? 'Le estás pidiendo el servicio directamente a este técnico.'
                    : 'Solo a modo de referencia — nuestro equipo asigna al técnico disponible más adecuado según zona y horario.'}
                </p>
              </div>

              {tecnicoId ? (
                <div className="rounded-xl border-2 border-primary bg-primary-soft p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary font-bold text-base shrink-0">
                    {tecnicoNombre?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{tecnicoNombre}</p>
                    <p className="text-xs text-primary">Técnico elegido desde su perfil</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">Que Taita asigne</p>
                      <p className="text-xs text-primary/70">Recomendado — el más rápido disponible en tu zona</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-1 rounded-full shrink-0">Sugerido</span>
                  </div>

                  {loadingCands && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="rounded-xl border border-cream-dark bg-white p-3 flex flex-col items-center gap-2 animate-pulse">
                          <div className="w-12 h-12 rounded-full bg-gray-100" />
                          <div className="w-20 h-3 bg-gray-100 rounded" />
                          <div className="w-14 h-3 bg-gray-100 rounded" />
                        </div>
                      ))}
                    </div>
                  )}

                  {!loadingCands && candidatos.length === 0 && categoriaId && (
                    <p className="text-xs text-gray-400 text-center py-3">No hay técnicos activos para esta categoría todavía.</p>
                  )}

                  {!loadingCands && candidatos.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(verTodos ? candidatos : candidatos.slice(0, 6)).map(c => (
                          <div key={c.id} className="card-metallic group p-3 flex flex-col items-center gap-2 text-center">
                            <div className="card-metallic-shine" />
                            {c.foto_url
                              ? <img src={c.foto_url} alt={c.nombre_display} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20" />
                              : (
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary font-bold text-base">
                                  {c.nombre_display.charAt(0).toUpperCase()}
                                </div>
                              )
                            }
                            <p className="text-xs font-semibold text-white leading-tight line-clamp-1">{c.nombre_display}</p>
                            <div className="flex items-center gap-0.5">
                              <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                              <span className="text-xs text-white/80">{c.calificacion_promedio > 0 ? c.calificacion_promedio.toFixed(1) : '—'}</span>
                              {c.total_servicios > 0 && <span className="text-xs text-white/50">({c.total_servicios})</span>}
                            </div>
                            {c.zona && <p className="text-xs text-white/50 leading-tight line-clamp-1">{c.zona}</p>}
                            <a
                              href={`/tecnicos/${c.id}`}
                              className="relative inline-flex items-center gap-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full transition-colors mt-0.5"
                            >
                              Ver perfil
                            </a>
                          </div>
                        ))}
                      </div>
                      {candidatos.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setVerTodos(v => !v)}
                          className="text-xs text-primary hover:underline font-medium w-fit mx-auto"
                        >
                          {verTodos ? 'Ver menos' : `Ver más técnicos (${candidatos.length - 6} más)`}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Paso 3: Detalles ─────────────────────────────────────────── */}
          {paso === 3 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">Contanos del trabajo</h2>
                <p className="text-gray-500 text-sm mt-1">Cuanto más claro el detalle, más precisa la asignación.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Título del trabajo</label>
                <Input
                  placeholder="Ej: Instalación de luces LED en living"
                  {...register('titulo')}
                  className={errors.titulo ? 'border-destructive' : ''}
                />
                <FieldError msg={errors.titulo?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Descripción {esCotizacion ? '' : '(opcional)'}
                </label>
                <Textarea
                  rows={4}
                  placeholder={esCotizacion
                    ? 'Contanos qué necesitás con el mayor detalle posible — esto es lo primero que va a leer el equipo de Taita.'
                    : 'Contá más detalles sobre el trabajo que necesitás...'}
                  {...register('descripcion')}
                  className={errors.descripcion ? 'border-destructive' : ''}
                />
                <FieldError msg={errors.descripcion?.message} />
              </div>

              {esCotizacion && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Fotos del problema (opcional, hasta 5)</label>
                  <div className="flex flex-wrap gap-2">
                    {imagenesCotizacion.map((url, i) => (
                      <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-cream-dark group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => quitarImagenCotizacion(i)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    {imagenesCotizacion.length < 5 && (
                      <button
                        type="button"
                        onClick={() => imagenCotInputRef.current?.click()}
                        disabled={subiendoImagenCot}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-cream-dark hover:border-primary-pale flex items-center justify-center text-gray-400 hover:text-primary transition-colors text-2xl"
                      >
                        {subiendoImagenCot ? '…' : '+'}
                      </button>
                    )}
                    <input
                      ref={imagenCotInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleFilesCotizacion}
                    />
                  </div>
                  {errorImagenCot && <p className="text-xs text-destructive">{errorImagenCot}</p>}
                </div>
              )}
            </>
          )}

          {/* ── Paso 4: Cuándo ───────────────────────────────────────────── */}
          {paso === 4 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">¿Cuándo te viene bien?</h2>
                <p className="text-gray-500 text-sm mt-1">Elegí fecha y franja horaria de preferencia.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Fecha preferida</label>
                <Input
                  type="date"
                  min={today}
                  {...register('fecha_solicitada')}
                  className={`sm:max-w-55 ${errors.fecha_solicitada ? 'border-destructive' : ''}`}
                />
                <FieldError msg={errors.fecha_solicitada?.message} />
              </div>

              {/* Franja amplia (Fase 8.4) — el cliente ya no elige un horario puntual, solo el
                  rango. El admin coordina el horario exacto con el técnico y te va a proponer un
                  horario final que vas a poder aceptar o rechazar antes de que quede confirmado. */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Franja horaria preferida</label>
                <div className={`grid grid-cols-3 gap-2 ${errors.hora_solicitada ? 'ring-1 ring-destructive rounded-xl p-1' : ''}`}>
                  {(Object.keys(FRANJA_LABEL) as FranjaHoraria[]).map(f => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => {
                        setFranjaSolicitada(f)
                        setValue('hora_solicitada', HORA_REPRESENTATIVA_FRANJA[f], { shouldValidate: true })
                      }}
                      className={`text-center text-xs font-semibold py-2.5 rounded-full border transition-colors ${
                        franjaSolicitada === f
                          ? 'bg-primary border-primary text-white'
                          : 'border-cream-dark text-gray-600 hover:border-primary-pale bg-white'
                      }`}
                    >
                      {FRANJA_LABEL[f]}
                    </button>
                  ))}
                </div>
                <FieldError msg={errors.hora_solicitada?.message} />
                <p className="text-xs text-gray-400">
                  La franja es preferencial — el horario exacto se coordina con el técnico y te lo
                  vamos a confirmar antes de agendar el trabajo.
                </p>
              </div>

              {conflicto && !conflicto.disponible && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 flex flex-col gap-2">
                  <p>
                    {tecnicoNombre} ya tiene otro trabajo agendado en ese horario.
                    {conflicto.sugerido
                      ? ` El horario libre más cercano es el ${new Date(`${conflicto.sugerido.fecha}T00:00:00`).toLocaleDateString('es-AR')} a las ${conflicto.sugerido.hora}.`
                      : ' No encontramos un horario libre cercano — probá con otra fecha.'}
                  </p>
                  <div className="flex gap-3">
                    {conflicto.sugerido && (
                      <button type="button" onClick={usarSugerido} className="text-xs font-semibold text-amber-900 underline w-fit">
                        Usar ese horario
                      </button>
                    )}
                    <button type="button" onClick={() => setConflicto(null)} className="text-xs font-medium text-amber-700 w-fit">
                      Elegir otra fecha/hora
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Paso 5: Dónde ────────────────────────────────────────────── */}
          {paso === 5 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">¿Dónde es el trabajo?</h2>
                <p className="text-gray-500 text-sm mt-1">Ubicá la dirección para calcular zona y disponibilidad.</p>
              </div>
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-sm font-medium text-gray-700">Dirección del trabajo</label>
                <Input
                  placeholder="Ej: San Martín 850, Centro"
                  {...register('direccion')}
                  className={errors.direccion ? 'border-destructive' : ''}
                  autoComplete="off"
                  onFocus={() => { if (sugerencias.length > 0) setMostrarSugerencias(true) }}
                  onBlur={() => { setTimeout(() => setMostrarSugerencias(false), 150) }}
                />
                <FieldError msg={errors.direccion?.message} />
                {buscandoDireccion && (
                  <p className="text-xs text-gray-400">🔍 Buscando direcciones...</p>
                )}
                {mostrarSugerencias && sugerencias.length > 0 && (
                  <ul className="absolute z-30 top-full mt-1 w-full bg-white border border-cream-dark rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                    {sugerencias.map((s, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => elegirSugerencia(s)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-primary-soft hover:text-primary transition-colors"
                        >
                          📍 {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ubicación en el mapa (opcional)</label>
                <MapaUbicacion
                  lat={ubicacion?.lat ?? null}
                  lng={ubicacion?.lng ?? null}
                  onChange={(lat, lng, direccionSugerida) => {
                    setUbicacion({ lat, lng })
                    if (direccionSugerida) {
                      ignorarProximaBusqueda.current = true
                      setValue('direccion', direccionSugerida, { shouldValidate: true })
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* ── Paso 6: Confirmar ────────────────────────────────────────── */}
          {paso === 6 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">Revisá y confirmá</h2>
                <p className="text-gray-500 text-sm mt-1">Así queda armada tu solicitud antes de enviarla.</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-5">
                <dl className="flex-1 flex flex-col divide-y divide-cream text-sm">
                  {[
                    ['Servicio',    categoriaSeleccionada?.nombre ?? '—'],
                    ...(subitemId ? [['Detalle', subitemsCategoria.find(s => s.id === subitemId)?.nombre ?? '—']] : []),
                    ['Técnico',     tecnicoNombre ?? 'A asignar por Taita'],
                    ['Título',      tituloVal || '—'],
                    ['Fecha',       fechaVal || '—'],
                    ['Franja horaria', franjaSolicitada ? FRANJA_LABEL[franjaSolicitada] : '—'],
                    ['Dirección',   direccionVal || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2.5 gap-4">
                      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">{label}</dt>
                      <dd className="text-gray-800 font-medium text-right truncate">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className={`w-full lg:w-64 shrink-0 p-5 flex flex-col gap-3 ${
                  precioBase != null
                    ? 'card-metallic group'
                    : 'rounded-2xl bg-gray-50 border border-gray-100 text-gray-500'
                }`}>
                  {/* Brillo metálico que barre la tarjeta al pasar el mouse — referencia visual
                      que pasó Jota (estilo tarjeta "glass/metal" de su portfolio). Puro CSS, sin
                      librerías nuevas: clase compartida en global.css (`.card-metallic-shine`). */}
                  {precioBase != null && <div className="card-metallic-shine" />}
                  {precioBase != null ? (
                    <>
                      <p className="text-sm font-semibold">Estimación de costo</p>
                      <div className="flex flex-col gap-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/70">Precio base</span>
                          <span className="font-medium">${precioBase.toLocaleString('es-AR')}</span>
                        </div>
                        {tasa > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Tasa de plataforma ({tasa}%)</span>
                            <span className="font-medium">${Math.round(precioBase * tasa / 100).toLocaleString('es-AR')}</span>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-white/20 pt-3 flex items-center justify-between">
                        <span className="font-bold">Total estimado</span>
                        <span className="text-2xl font-bold text-amber-400">${total!.toLocaleString('es-AR')}</span>
                      </div>
                      <p className="text-xs text-white/60">El total final puede variar según materiales y complejidad del trabajo. Se confirma con el técnico antes de comenzar.</p>
                    </>
                  ) : esCotizacion ? (
                    <p className="text-sm text-center">
                      💬 Tu pedido va a revisión del equipo de Taita. Te vamos a escribir para
                      coordinar el precio antes de asignar un técnico.
                    </p>
                  ) : (
                    <p className="text-sm text-center">La tarifa se acordará directamente con el técnico.</p>
                  )}
                </div>
              </div>

              {!emailVerificado && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="flex-1">📩 Confirmá tu email para poder enviar la solicitud — te mandamos un link al registrarte.</span>
                  <button
                    type="button"
                    onClick={reenviarEmail}
                    disabled={reenviando || reenviado}
                    className="text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 shrink-0 whitespace-nowrap"
                  >
                    {reenviado ? '✓ Reenviado' : reenviando ? 'Enviando…' : 'Reenviar email'}
                  </button>
                </div>
              )}

              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
                  {serverError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Barra inferior de navegación */}
        <div className="border-t border-cream px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <span className="hidden sm:inline text-xs text-gray-400">Paso {paso} de {PASOS.length}</span>
          <div className="flex items-center gap-3 ml-auto">
            {paso > 1 && (
              <button
                type="button"
                onClick={atras}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-5 py-2.5 rounded-full border border-cream-dark transition-colors"
              >
                Atrás
              </button>
            )}
            {paso < PASOS.length ? (
              <button
                type="button"
                onClick={siguiente}
                className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full transition-colors"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || chequeando || !emailVerificado}
                title={!emailVerificado ? 'Confirmá tu email para poder enviar la solicitud' : undefined}
                className="text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full transition-colors disabled:opacity-50"
              >
                {chequeando ? 'Verificando horario...' : isSubmitting ? 'Enviando...' : esCotizacion ? 'Pedir cotización' : 'Enviar solicitud'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
