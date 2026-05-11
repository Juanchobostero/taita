import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Schemas ────────────────────────────────────────────────────────────────
const base = {
  nombre:   z.string().min(2, 'Mínimo 2 caracteres'),
  apellido: z.string().min(2, 'Mínimo 2 caracteres'),
  email:    z.string().email('Correo electrónico inválido'),
  telefono: z.string().min(8, 'Teléfono inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
}

const clienteSchema = z.object({ ...base, barrio: z.string().min(2, 'Ingresá tu barrio') })

const tecnicoSchema = z.object({
  ...base,
  especialidad: z.string().min(1, 'Seleccioná una especialidad'),
  experiencia:  z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0).max(60),
  zona:         z.string().min(2, 'Ingresá tu zona de trabajo'),
  descripcion:  z.string().min(20, 'Mínimo 20 caracteres'),
})

type ClienteData = z.infer<typeof clienteSchema>
type TecnicoData = z.infer<typeof tecnicoSchema>

const ESPECIALIDADES = [
  'Electricidad', 'Refrigeración', 'Plomería', 'Limpieza',
  'Jardinería', 'Pintura', 'Mudanzas', 'Carpintería', 'Gas', 'Otra',
]

// ── Helpers ────────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      <FieldError msg={error} />
    </div>
  )
}

function ServerError({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
      {msg}
    </div>
  )
}

function SuccessMessage({ tipo }: { tipo: 'cliente' | 'tecnico' }) {
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-4 text-center flex flex-col gap-2">
      <p className="font-semibold">¡Cuenta creada!</p>
      {tipo === 'tecnico'
        ? <p>Tu perfil está pendiente de aprobación. Te avisaremos cuando esté activo.</p>
        : <p>Redirigiendo a tu panel...</p>
      }
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function Tabs({ tipo, onChange }: { tipo: 'cliente' | 'tecnico'; onChange: (t: 'cliente' | 'tecnico') => void }) {
  return (
    <div className="flex bg-cream-dark rounded-full p-1">
      {(['cliente', 'tecnico'] as const).map(t => (
        <button
          key={t} type="button" onClick={() => onChange(t)}
          className={cn(
            'flex-1 py-2.5 rounded-full text-sm font-semibold transition-all',
            tipo === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {t === 'cliente' ? 'Soy cliente' : 'Quiero ser técnico'}
        </button>
      ))}
    </div>
  )
}

// ── Cliente form ───────────────────────────────────────────────────────────
function ClienteForm() {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClienteData>({
    resolver: zodResolver(clienteSchema),
  })

  const onSubmit = async (data: ClienteData) => {
    setServerError('')
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nombre_completo: `${data.nombre} ${data.apellido}`,
          tipo: 'cliente',
        },
      },
    })
    if (error) { setServerError(error.message); return }
    if (authData.user) {
      // Actualizar teléfono en usuarios (el trigger no lo incluye)
      await supabase
        .from('usuarios')
        .update({ telefono: data.telefono })
        .eq('id', authData.user.id)
    }
    setSuccess(true)
    setTimeout(() => { window.location.href = '/dashboard/cliente' }, 1500)
  }

  if (success) return <SuccessMessage tipo="cliente" />

  const err = (f: keyof ClienteData) => errors[f]?.message
  const ecls = (f: keyof ClienteData) => err(f) ? 'border-destructive' : ''

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" error={err('nombre')}>
          <Input placeholder="Juan" {...register('nombre')} className={ecls('nombre')} />
        </Field>
        <Field label="Apellido" error={err('apellido')}>
          <Input placeholder="González" {...register('apellido')} className={ecls('apellido')} />
        </Field>
      </div>
      <Field label="Correo electrónico" error={err('email')}>
        <Input type="email" placeholder="tu@email.com" {...register('email')} className={ecls('email')} />
      </Field>
      <Field label="Teléfono / WhatsApp" error={err('telefono')}>
        <Input type="tel" placeholder="+54 9 379 ..." {...register('telefono')} className={ecls('telefono')} />
      </Field>
      <Field label="Barrio" error={err('barrio')}>
        <Input placeholder="Ej: Centro, Belgrano..." {...register('barrio')} className={ecls('barrio')} />
      </Field>
      <Field label="Contraseña" error={err('password')}>
        <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} className={ecls('password')} />
      </Field>
      <ServerError msg={serverError} />
      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
      </Button>
      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <a href="/login" className="text-primary hover:text-primary-hover font-medium">Ingresá aquí</a>
      </p>
    </form>
  )
}

// ── Técnico form ───────────────────────────────────────────────────────────
function TecnicoForm() {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TecnicoData>({
    resolver: zodResolver(tecnicoSchema),
  })

  const onSubmit = async (data: TecnicoData) => {
    setServerError('')
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nombre_completo: `${data.nombre} ${data.apellido}`,
          tipo: 'tecnico',
        },
      },
    })
    if (error) { setServerError(error.message); return }

    if (authData.user) {
      // Actualizar teléfono
      await supabase
        .from('usuarios')
        .update({ telefono: data.telefono })
        .eq('id', authData.user.id)

      // Crear fila en tecnicos con activo = false (pendiente aprobación)
      const { error: tecErr } = await supabase.from('tecnicos').insert({
        usuario_id:     authData.user.id,
        descripcion:    data.descripcion,
        zona_cobertura: data.zona,
        activo:         false,
      })
      if (tecErr) { setServerError(tecErr.message); return }
    }

    setSuccess(true)
  }

  if (success) return <SuccessMessage tipo="tecnico" />

  const err = (f: keyof TecnicoData) => errors[f]?.message
  const ecls = (f: keyof TecnicoData) => err(f) ? 'border-destructive' : ''

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" error={err('nombre')}>
          <Input placeholder="Juan" {...register('nombre')} className={ecls('nombre')} />
        </Field>
        <Field label="Apellido" error={err('apellido')}>
          <Input placeholder="González" {...register('apellido')} className={ecls('apellido')} />
        </Field>
      </div>
      <Field label="Correo electrónico" error={err('email')}>
        <Input type="email" placeholder="tu@email.com" {...register('email')} className={ecls('email')} />
      </Field>
      <Field label="Teléfono / WhatsApp" error={err('telefono')}>
        <Input type="tel" placeholder="+54 9 379 ..." {...register('telefono')} className={ecls('telefono')} />
      </Field>
      <Field label="Especialidad principal" error={err('especialidad')}>
        <Select {...register('especialidad')} className={ecls('especialidad')}>
          <option value="">Seleccioná una especialidad</option>
          {ESPECIALIDADES.map(e => <option key={e} value={e.toLowerCase()}>{e}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Años de experiencia" error={err('experiencia')}>
          <Input type="number" min="0" max="60" placeholder="Ej: 5" {...register('experiencia')} className={ecls('experiencia')} />
        </Field>
        <Field label="Zona de trabajo" error={err('zona')}>
          <Input placeholder="Ej: Centro, toda la ciudad..." {...register('zona')} className={ecls('zona')} />
        </Field>
      </div>
      <Field label="Descripción breve" error={err('descripcion')}>
        <Textarea rows={3} placeholder="Contanos sobre tu experiencia (mínimo 20 caracteres)..." {...register('descripcion')} className={ecls('descripcion')} />
      </Field>
      <Field label="Contraseña" error={err('password')}>
        <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} className={ecls('password')} />
      </Field>
      <ServerError msg={serverError} />
      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Registrando...' : 'Registrarme como técnico'}
      </Button>
      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <a href="/login" className="text-primary hover:text-primary-hover font-medium">Ingresá aquí</a>
      </p>
    </form>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function RegistroForm() {
  const [tipo, setTipo] = useState<'cliente' | 'tecnico'>('cliente')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tipo') === 'tecnico') setTipo('tecnico')
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <Tabs tipo={tipo} onChange={setTipo} />
      {tipo === 'cliente' ? <ClienteForm /> : <TecnicoForm />}
    </div>
  )
}
