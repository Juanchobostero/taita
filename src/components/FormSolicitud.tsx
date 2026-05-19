import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface CategoriaOpt {
  id: string
  nombre: string
  icono: string | null
  porcentaje_tasa: number
}

interface Props {
  tecnicoId: string
  tecnicoNombre: string
  tarifaHora: number | null
  categorias: CategoriaOpt[]
}

const schema = z.object({
  categoria_id:     z.string().min(1, 'Seleccioná una categoría'),
  titulo:           z.string().min(5, 'Mínimo 5 caracteres'),
  descripcion:      z.string().optional(),
  horas_estimadas:  z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0.5, 'Mínimo 0.5 horas').max(100),
  fecha_solicitada: z.string().min(1, 'Ingresá una fecha'),
  direccion:        z.string().min(5, 'Ingresá la dirección del trabajo'),
})

type FormData = z.infer<typeof schema>

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

export default function FormSolicitud({ tecnicoId, tecnicoNombre, tarifaHora, categorias }: Props) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess]         = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categoria_id: categorias[0]?.id ?? '' },
  })

  const categoriaId   = watch('categoria_id')
  const horasEstimadas = watch('horas_estimadas')

  const { tasa, precioBase, total } = useMemo(() => {
    const cat  = categorias.find(c => c.id === categoriaId)
    const tasa = cat?.porcentaje_tasa ?? 0
    if (!tarifaHora || !horasEstimadas || horasEstimadas <= 0) return { tasa, precioBase: null, total: null }
    const precioBase = tarifaHora * horasEstimadas
    const total      = precioBase * (1 + tasa / 100)
    return { tasa, precioBase, total }
  }, [categoriaId, horasEstimadas, tarifaHora, categorias])

  const onSubmit = async (data: FormData) => {
    setServerError('')
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
        direccion:       data.direccion,
      }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      setServerError(error ?? 'Error al enviar la solicitud')
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-8 text-center flex flex-col gap-3">
        <p className="text-2xl">✅</p>
        <p className="font-bold text-lg">¡Solicitud enviada!</p>
        <p className="text-sm">Le avisamos a {tecnicoNombre}. Podés ver el estado en tu panel.</p>
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
        <Select {...register('categoria_id')} className={errors.categoria_id ? 'border-destructive' : ''}>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>
              {c.icono ? `${c.icono} ` : ''}{c.nombre}
            </option>
          ))}
        </Select>
        <FieldError msg={errors.categoria_id?.message} />
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

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
      {tarifaHora ? (
        <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${
          total != null ? 'bg-primary-soft border-primary-pale' : 'bg-gray-50 border-gray-100'
        }`}>
          <p className="text-sm font-semibold text-gray-700">Estimación de costo</p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">Tarifa del técnico</span>
            <span className="font-medium text-gray-800 text-right">
              ${Number(tarifaHora).toLocaleString('es-AR')} / hora
            </span>
            <span className="text-gray-500">Horas estimadas</span>
            <span className="font-medium text-gray-800 text-right">
              {horasEstimadas > 0 ? `${horasEstimadas} h` : '—'}
            </span>
            <span className="text-gray-500">Subtotal de trabajo</span>
            <span className="font-medium text-gray-800 text-right">
              {precioBase != null ? `$${precioBase.toLocaleString('es-AR')}` : '—'}
            </span>
            <span className="text-gray-500">Tasa de plataforma ({tasa}%)</span>
            <span className="font-medium text-gray-800 text-right">
              {precioBase != null ? `$${(precioBase * tasa / 100).toLocaleString('es-AR')}` : '—'}
            </span>
          </div>
          <div className="border-t border-primary-pale pt-3 flex items-center justify-between">
            <span className="font-bold text-gray-900">Total estimado</span>
            <span className="text-2xl font-bold text-primary">
              {total != null ? `$${Math.round(total).toLocaleString('es-AR')}` : '—'}
            </span>
          </div>
          <p className="text-xs text-gray-400">El total final puede variar según materiales y duración real del trabajo.</p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-500 text-center">
          La tarifa se acordará directamente con el técnico.
        </div>
      )}

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
          {serverError}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
      </Button>
    </form>
  )
}
