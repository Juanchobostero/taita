import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const clienteSchema = z.object({
  ...base,
  barrio:   z.string().min(2, 'Ingresá tu barrio'),
  terminos: z.boolean().refine(v => v === true, 'Debés aceptar los términos y condiciones'),
})

const tecnicoSchema = z.object({
  ...base,
  nick:           z.string().max(30, 'Máximo 30 caracteres').optional(),
  mostrar_nombre: z.boolean().optional(),
  especialidades: z.array(z.string()).min(1, 'Seleccioná al menos una especialidad'),
  experiencia:    z.coerce.number().min(0, 'Ingresá un número válido').max(60),
  zona:           z.string().min(2, 'Ingresá tu zona de trabajo'),
  descripcion:    z.string().min(20, 'Mínimo 20 caracteres'),
  cvu:            z.string().regex(/^\d{22}$/, 'El CVU o CBU debe tener exactamente 22 dígitos'),
  terminos:       z.boolean().refine(v => v === true, 'Debés aceptar los términos y condiciones'),
})

type ClienteData = z.infer<typeof clienteSchema>
type TecnicoData = z.infer<typeof tecnicoSchema>


// ── Helpers ────────────────────────────────────────────────────────────────
// Supabase devuelve el error de "ya existe" en inglés y con distinta forma según la versión —
// lo mapeamos a un mensaje en español y accionable para el usuario.
function mensajeErrorAuth(error: { message: string; code?: string }): string {
  const yaRegistrado = error.code === 'user_already_exists'
    || error.message?.toLowerCase().includes('already registered')
    || error.message?.toLowerCase().includes('already exists')
  if (yaRegistrado) {
    return 'Ese correo ya está registrado. Si ya tenés cuenta, iniciá sesión — o si olvidaste tu contraseña, escribinos a taitasoluciones@gmail.com para recuperarla.'
  }
  return error.message
}

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
  const params     = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const redirectTo = params.get('redirect')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClienteData>({
    resolver: zodResolver(clienteSchema),
  })

  const onSubmit = async (data: ClienteData) => {
    setServerError('')
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nombre_completo: `${data.nombre} ${data.apellido}`,
          tipo: 'cliente',
          telefono: data.telefono,
        },
      },
    })
    if (error) { setServerError(mensajeErrorAuth(error)); return }
    if (authData.user?.identities?.length === 0) {
      setServerError('Este mail ya está registrado, ¿ya tenés cuenta?')
      return
    }
    window.location.href = '/dashboard/cliente'
  }

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
      {/* Checkbox T&C */}
      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register('terminos')}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
          />
          <span className="text-sm text-gray-600">
            Acepto los{' '}
            <a href="/terminos" target="_blank" className="text-primary hover:underline font-medium">
              Términos y condiciones
            </a>
          </span>
        </label>
        {errors.terminos && <p className="text-xs text-destructive ml-6">{errors.terminos.message}</p>}
      </div>

      <ServerError msg={serverError} />
      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
      </Button>
      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <a href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'} className="text-primary hover:text-primary-hover font-medium">Ingresá aquí</a>
      </p>
    </form>
  )
}

// ── Técnico form ───────────────────────────────────────────────────────────
function TecnicoForm({ especialidades }: { especialidades: string[] }) {
  const [serverError, setServerError] = useState('')
  const [subcats, setSubcats]         = useState<Record<string, string[]>>({})

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<TecnicoData>({
    resolver: zodResolver(tecnicoSchema),
  })

  const raw = watch('especialidades')
  const selectedEsps: string[] = Array.isArray(raw) ? raw : []

  const toggleSubcat = (esp: string, checked: boolean) => {
    setSubcats(prev => {
      if (checked && !prev[esp]) return { ...prev, [esp]: [''] }
      if (!checked) { const next = { ...prev }; delete next[esp]; return next }
      return prev
    })
  }

  const updateSubcat = (esp: string, idx: number, val: string) => {
    setSubcats(prev => {
      const arr = [...(prev[esp] ?? [])]
      arr[idx] = val
      return { ...prev, [esp]: arr }
    })
  }

  const addSubcat = (esp: string) => {
    setSubcats(prev => ({ ...prev, [esp]: [...(prev[esp] ?? []), ''] }))
  }

  const removeSubcat = (esp: string, idx: number) => {
    setSubcats(prev => {
      const arr = (prev[esp] ?? []).filter((_, i) => i !== idx)
      return { ...prev, [esp]: arr.length ? arr : [''] }
    })
  }

  const onSubmit = async (data: TecnicoData) => {
    setServerError('')
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nombre_completo: `${data.nombre} ${data.apellido}`,
          tipo: 'tecnico',
        },
      },
    })
    if (error) { setServerError(mensajeErrorAuth(error)); return }
    if (authData.user?.identities?.length === 0) {
      setServerError('Este mail ya está registrado, ¿ya tenés cuenta?')
      return
    }

    if (authData.user) {
      const res = await fetch('/api/registro-tecnico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:         authData.user.id,
          telefono:       data.telefono,
          descripcion:    data.descripcion,
          zona:           data.zona,
          especialidades: data.especialidades,
          subcategorias:  subcats,
          cvu:            data.cvu || null,
          nick:           data.nick?.trim() || null,
          mostrarNombre:  data.mostrar_nombre ?? true,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setServerError(msg ?? 'Error al crear perfil de técnico')
        return
      }
    }

    window.location.href = '/dashboard/tecnico'
  }

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
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          defaultChecked
          {...register('mostrar_nombre')}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />
        <span className="text-sm text-gray-600">Mostrar mi nombre completo en el perfil público</span>
      </label>
      <Field label="NickTaita (opcional)" error={err('nick')}>
        <Input placeholder="Ej: JuanRepara" maxLength={30} {...register('nick')} className={ecls('nick')} />
        <p className="text-xs text-gray-400">Será el nombre visible para los clientes. Si no lo completás, se usará tu nombre.</p>
      </Field>
      <Field label="Correo electrónico" error={err('email')}>
        <Input type="email" placeholder="tu@email.com" {...register('email')} className={ecls('email')} />
      </Field>
      <Field label="Teléfono / WhatsApp" error={err('telefono')}>
        <Input type="tel" placeholder="+54 9 379 ..." {...register('telefono')} className={ecls('telefono')} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Label>Especialidades <span className="text-gray-400 text-xs">(seleccioná todas las que apliquen)</span></Label>
        <div className="flex flex-col gap-2">
          {especialidades.map(e => {
            const checked = selectedEsps.includes(e)
            const subs    = subcats[e] ?? []
            return (
              <div key={e} className={`border rounded-xl transition-colors ${checked ? 'border-primary-pale bg-primary-soft/30' : 'border-cream-dark'}`}>
                <label className="flex items-center gap-2.5 cursor-pointer p-3">
                  <input
                    type="checkbox"
                    value={e}
                    {...register('especialidades', {
                      onChange: (ev) => toggleSubcat(e, ev.target.checked)
                    })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                  />
                  <span className={`text-sm font-medium transition-colors ${checked ? 'text-primary' : 'text-gray-700'}`}>{e}</span>
                </label>

                {checked && (
                  <div className="px-3 pb-3 flex flex-col gap-2 border-t border-primary-pale pt-2.5">
                    <p className="text-xs text-primary font-medium">Subcategorías <span className="text-gray-400 font-normal">(opcional — ej: Reparación, Instalación)</span></p>
                    {subs.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4 shrink-0">{idx + 1}.</span>
                        <input
                          type="text"
                          value={val}
                          maxLength={40}
                          placeholder={`Subcategoría ${idx + 1}`}
                          onChange={ev => updateSubcat(e, idx, ev.target.value)}
                          className="flex-1 border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
                        />
                        {subs.length > 1 && (
                          <button type="button" onClick={() => removeSubcat(e, idx)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                        )}
                      </div>
                    ))}
                    {subs.length < 5 && (
                      <button type="button" onClick={() => addSubcat(e)} className="text-xs text-primary hover:underline w-fit mt-0.5">
                        + Agregar subcategoría
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {errors.especialidades && (
          <p className="text-xs text-destructive mt-1">{errors.especialidades.message as string}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Años de experiencia" error={err('experiencia')}>
          <Input type="number" min="0" max="60" placeholder="Ej: 5" {...register('experiencia')} className={ecls('experiencia')} />
        </Field>
        <Field label="Zona de trabajo" error={err('zona')}>
          <Input placeholder="Ej: Centro, toda la ciudad..." {...register('zona')} className={ecls('zona')} />
        </Field>
      </div>
      <Field label="CVU o CBU" error={err('cvu')}>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={22}
          placeholder="22 dígitos — para recibir pagos"
          {...register('cvu')}
          className={ecls('cvu')}
        />
        <p className="text-xs text-gray-400">Necesario para recibir pagos por tus servicios.</p>
      </Field>
      <Field label="Descripción breve" error={err('descripcion')}>
        <Textarea rows={3} placeholder="Contanos sobre tu experiencia (mínimo 20 caracteres)..." {...register('descripcion')} className={ecls('descripcion')} />
      </Field>
      <Field label="Contraseña" error={err('password')}>
        <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} className={ecls('password')} />
      </Field>
      {/* Checkbox T&C */}
      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register('terminos')}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
          />
          <span className="text-sm text-gray-600">
            Acepto los{' '}
            <a href="/terminos" target="_blank" className="text-primary hover:underline font-medium">
              Términos y condiciones
            </a>
          </span>
        </label>
        {errors.terminos && <p className="text-xs text-destructive ml-6">{errors.terminos.message}</p>}
      </div>
      <ServerError msg={serverError} />
      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Registrando...' : 'Registrarme como técnico'}
      </Button>
      <div className="bg-primary-soft border border-primary-pale rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-primary">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Validaremos tu identidad para garantizar la seguridad de nuestros clientes. Te solicitaremos documentación después de completar tu registro.</span>
      </div>
      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <a href="/login" className="text-primary hover:text-primary-hover font-medium">Ingresá aquí</a>
      </p>
    </form>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function RegistroForm({ especialidades = [] }: { especialidades?: string[] }) {
  const [tipo, setTipo] = useState<'cliente' | 'tecnico'>('cliente')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tipo') === 'tecnico') setTipo('tecnico')
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <Tabs tipo={tipo} onChange={setTipo} />
      {tipo === 'cliente' ? <ClienteForm /> : <TecnicoForm especialidades={especialidades} />}
    </div>
  )
}
