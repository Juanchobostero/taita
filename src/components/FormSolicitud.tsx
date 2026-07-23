import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { franjasHorarias } from '@/lib/disponibilidad'

interface CategoriaOpt {
  id: string
  nombre: string
  icono: string | null
  imagen_url: string | null
  porcentaje_tasa: number
  precio_base: number | null
}

interface Props {
  tecnicoId:           string | null
  tecnicoNombre:       string | null
  categorias:          CategoriaOpt[]
  defaultCategoriaId?: string | null
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
  horas_estimadas:  z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0.5, 'Mínimo 0.5 horas').max(100),
  fecha_solicitada: z.string().min(1, 'Ingresá una fecha'),
  hora_solicitada:  z.string().min(1, 'Elegí un horario'),
  direccion:        z.string().min(5, 'Ingresá la dirección del trabajo'),
})

type FormData = z.infer<typeof schema>

interface Conflicto {
  disponible: boolean
  sugerido?: { fecha: string; hora: string }
}

const FRANJAS = franjasHorarias()

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

export default function FormSolicitud({ tecnicoId, tecnicoNombre, categorias, defaultCategoriaId }: Props) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess]         = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoria_id: (defaultCategoriaId && categorias.find(c => c.id === defaultCategoriaId))
        ? defaultCategoriaId
        : categorias[0]?.id ?? '',
    },
  })

  const categoriaId = watch('categoria_id')

  const [candidatos, setCandidatos]         = useState<Candidato[]>([])
  const [loadingCands, setLoadingCands]     = useState(false)
  const [verTodos, setVerTodos]             = useState(false)
  const [conflicto, setConflicto]           = useState<Conflicto | null>(null)
  const [chequeando, setChequeando]         = useState(false)

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
    const cat      = categorias.find(c => c.id === categoriaId)
    const tasa     = cat?.porcentaje_tasa ?? 0
    const precioBase = cat?.precio_base ?? null
    const total    = precioBase != null ? Math.round(precioBase * (1 + tasa / 100)) : null
    return { tasa, precioBase, total }
  }, [categoriaId, categorias])

  const onSubmit = async (data: FormData) => {
    setServerError('')
    setConflicto(null)

    if (tecnicoId) {
      setChequeando(true)
      try {
        const r = await fetch(
          `/api/disponibilidad-tecnico?tecnicoId=${tecnicoId}&fecha=${data.fecha_solicitada}` +
          `&hora=${data.hora_solicitada}&horasEstimadas=${data.horas_estimadas}`
        )
        const disp: Conflicto = await r.json()
        if (!disp.disponible) {
          setConflicto(disp)
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
        categoriaId:     data.categoria_id,
        titulo:          data.titulo,
        descripcion:     data.descripcion || null,
        horasEstimadas:  data.horas_estimadas,
        precioBase,
        tasaAplicada:    tasa,
        totalEstimado:   total,
        fechaSolicitada: data.fecha_solicitada,
        horaSolicitada:  data.hora_solicitada,
        direccion:       data.direccion,
      }),
    })
    if (!res.ok) {
      const { error, sugerido } = await res.json()
      setServerError(error ?? 'Error al enviar la solicitud')
      if (sugerido) setConflicto({ disponible: false, sugerido })
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
        <p className="font-bold text-lg">¡Solicitud enviada!</p>
        <p className="text-sm">{tecnicoNombre ? `Le avisamos a ${tecnicoNombre}.` : 'Te asignaremos el técnico ideal.'} Podés ver el estado en tu panel.</p>
        <a href="/dashboard/cliente" className="mt-2 text-primary hover:text-primary-hover font-medium text-sm">
          Ir a mi panel →
        </a>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* Categoría */}
      <div className="flex flex-col gap-1.5">
        <Label>Tipo de servicio</Label>
        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${errors.categoria_id ? 'ring-1 ring-destructive rounded-xl p-1' : ''}`}>
          {categorias.map(c => (
            <label
              key={c.id}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all text-center ${
                categoriaId === c.id
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-cream-dark hover:border-primary-pale bg-white text-gray-600'
              }`}
            >
              <input type="radio" value={c.id} {...register('categoria_id')} className="hidden" />
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 shrink-0">
                {c.imagen_url
                  ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                  : <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                }
              </div>
              <span className="text-xs font-medium leading-tight">{c.nombre}</span>
            </label>
          ))}
        </div>
        <FieldError msg={errors.categoria_id?.message} />
      </div>

      {/* Técnicos candidatos — solo en flujo libre */}
      {!tecnicoId && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Técnicos disponibles</p>
              <p className="text-xs text-gray-400">Solo informativo — nuestro equipo asignará el más adecuado</p>
            </div>
          </div>

          {loadingCands && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1,2,3,4].map(i => (
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(verTodos ? candidatos : candidatos.slice(0, 4)).map(c => (
                  <div key={c.id} className="rounded-xl border border-cream-dark bg-white p-3 flex flex-col items-center gap-2 text-center">
                    {c.foto_url
                      ? <img src={c.foto_url} alt={c.nombre_display} className="w-12 h-12 rounded-full object-cover" />
                      : (
                        <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-base">
                          {c.nombre_display.charAt(0).toUpperCase()}
                        </div>
                      )
                    }
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-1">{c.nombre_display}</p>
                    <div className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <span className="text-xs text-gray-600">{c.calificacion_promedio > 0 ? c.calificacion_promedio.toFixed(1) : '—'}</span>
                      {c.total_servicios > 0 && <span className="text-xs text-gray-400">({c.total_servicios})</span>}
                    </div>
                    {c.zona && <p className="text-xs text-gray-400 leading-tight line-clamp-1">{c.zona}</p>}
                    <a
                      href={`/tecnicos/${c.id}`}
                      className="text-xs text-primary hover:underline font-medium mt-0.5"
                    >
                      Ver perfil
                    </a>
                  </div>
                ))}
              </div>
              {candidatos.length > 4 && (
                <button
                  type="button"
                  onClick={() => setVerTodos(v => !v)}
                  className="text-xs text-primary hover:underline font-medium w-fit mx-auto"
                >
                  {verTodos ? 'Ver menos' : `Ver más técnicos (${candidatos.length - 4} más)`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Título */}
      <div className="flex flex-col gap-1.5">
        <Label>Título del trabajo</Label>
        <Input
          placeholder="Ej: Instalación de luces LED en living"
          {...register('titulo')}
          className={errors.titulo ? 'border-destructive' : ''}
        />
        <FieldError msg={errors.titulo?.message} />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <Label>Descripción (opcional)</Label>
        <Textarea
          rows={3}
          placeholder="Contá más detalles sobre el trabajo que necesitás..."
          {...register('descripcion')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Horas estimadas */}
        <div className="flex flex-col gap-1.5">
          <Label>Horas estimadas</Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            max="100"
            placeholder="Ej: 2"
            {...register('horas_estimadas')}
            className={errors.horas_estimadas ? 'border-destructive' : ''}
          />
          <FieldError msg={errors.horas_estimadas?.message} />
        </div>

        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <Label>Fecha preferida</Label>
          <Input
            type="date"
            min={today}
            {...register('fecha_solicitada')}
            className={errors.fecha_solicitada ? 'border-destructive' : ''}
          />
          <FieldError msg={errors.fecha_solicitada?.message} />
        </div>

        {/* Hora */}
        <div className="flex flex-col gap-1.5">
          <Label>Horario preferido</Label>
          <select
            {...register('hora_solicitada')}
            className={`border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary ${
              errors.hora_solicitada ? 'border-destructive' : 'border-cream-dark'
            }`}
            defaultValue=""
          >
            <option value="" disabled>Elegí un horario</option>
            {FRANJAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <FieldError msg={errors.hora_solicitada?.message} />
        </div>
      </div>

      {/* Aviso de conflicto de horario (solo cuando ya hay un técnico fijo) */}
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

      {/* Dirección */}
      <div className="flex flex-col gap-1.5">
        <Label>Dirección del trabajo</Label>
        <Input
          placeholder="Ej: San Martín 850, Centro"
          {...register('direccion')}
          className={errors.direccion ? 'border-destructive' : ''}
        />
        <FieldError msg={errors.direccion?.message} />
      </div>

      {/* Estimación de precio */}
      <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${
        precioBase != null ? 'bg-primary-soft border-primary-pale' : 'bg-gray-50 border-gray-100'
      }`}>
        {precioBase != null ? (
          <>
            <p className="text-sm font-semibold text-gray-700">Estimación de costo</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Precio base del servicio</span>
              <span className="font-medium text-gray-800 text-right">${precioBase.toLocaleString('es-AR')}</span>
              {tasa > 0 && (
                <>
                  <span className="text-gray-500">Tasa de plataforma ({tasa}%)</span>
                  <span className="font-medium text-gray-800 text-right">
                    ${Math.round(precioBase * tasa / 100).toLocaleString('es-AR')}
                  </span>
                </>
              )}
            </div>
            <div className="border-t border-primary-pale pt-3 flex items-center justify-between">
              <span className="font-bold text-gray-900">Total estimado</span>
              <span className="text-2xl font-bold text-primary">${total!.toLocaleString('es-AR')}</span>
            </div>
            <p className="text-xs text-gray-400">El total final puede variar según materiales y complejidad del trabajo.</p>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center">La tarifa se acordará directamente con el técnico.</p>
        )}
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
          {serverError}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || chequeando} className="w-full" size="lg">
        {chequeando ? 'Verificando horario...' : isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
      </Button>
    </form>
  )
}
