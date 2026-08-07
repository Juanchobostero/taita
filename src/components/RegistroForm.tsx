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
import { StepperSidebar, StepperMobileBar, type PasoWizard } from '@/components/WizardStepper'

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

interface CategoriaOpcion {
  id:     string
  nombre: string
}

// Wizard de 4 pasos — antes era un formulario larguísimo de una sola pantalla (el más largo de
// toda la app, con especialidades + subcategorías dinámicas incluidas) que necesitaba mucho
// scroll. Mismo lenguaje visual que el wizard de "Solicitar servicio" (Fase 6a).
const PASOS_TECNICO: (PasoWizard & { campos: (keyof TecnicoData)[] })[] = [
  { n: 1, label: 'Cuenta',         sub: 'Tus datos',         campos: ['nombre', 'apellido', 'email', 'telefono', 'password'] },
  { n: 2, label: 'Tu perfil',      sub: 'Cómo te ven',       campos: ['zona', 'experiencia', 'descripcion'] },
  { n: 3, label: 'Especialidades', sub: 'Qué hacés',         campos: ['especialidades'] },
  { n: 4, label: 'Confirmar',      sub: 'Cobros y términos', campos: ['cvu', 'terminos'] },
]

// ── Técnico form ───────────────────────────────────────────────────────────
// Las especialidades se identifican por `id` de categoría (no por nombre) — antes se guardaban y
// enviaban por nombre, y si una categoría se editaba (cambiaba de nombre) después de que el
// técnico hubiera cargado la página, el guardado fallaba en silencio: la especialidad quedaba sin
// asociar porque el nombre ya no calzaba con ninguna categoría existente.
function TecnicoForm({ especialidades }: { especialidades: CategoriaOpcion[] }) {
  const [serverError, setServerError] = useState('')
  const [subcats, setSubcats]         = useState<Record<string, string[]>>({})
  const [paso, setPaso]               = useState(1)

  const { register, handleSubmit, watch, trigger, formState: { errors, isSubmitting } } = useForm<TecnicoData>({
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

  const siguiente = async () => {
    const campos = PASOS_TECNICO[paso - 1].campos
    if (campos.length > 0) {
      const ok = await trigger(campos)
      if (!ok) return
    }
    setPaso(p => Math.min(p + 1, PASOS_TECNICO.length))
  }
  const atras = () => setPaso(p => Math.max(p - 1, 1))
  const info  = PASOS_TECNICO[paso - 1]

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <StepperSidebar pasos={PASOS_TECNICO} actual={paso} titulo="Registro técnico" />

      {/* Mismo criterio que el wizard de "Solicitar servicio": ningún botón es type="submit", el
          <form> siempre hace preventDefault en su propio onSubmit, y el envío real solo pasa con
          el click explícito en el botón final (ver más abajo) — evita que Enter en cualquier
          campo dispare un envío salteando pasos. */}
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
          e.preventDefault()
          if (paso < PASOS_TECNICO.length) siguiente()
        }}
        className="flex-1 bg-white rounded-2xl border border-cream-dark shadow-sm flex flex-col min-w-0"
      >
        <StepperMobileBar total={PASOS_TECNICO.length} actual={paso} label={info.label} />

        <div className="flex-1 p-5 sm:p-8 flex flex-col gap-4">
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Paso {paso} de {PASOS_TECNICO.length}</p>
          </div>

          {/* ── Paso 1: Cuenta ───────────────────────────────────────────── */}
          {paso === 1 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">Creá tu cuenta</h2>
                <p className="text-gray-500 text-sm mt-1">Empecemos con lo básico.</p>
              </div>
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
              <Field label="Contraseña" error={err('password')}>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} className={ecls('password')} />
              </Field>
            </>
          )}

          {/* ── Paso 2: Tu perfil ────────────────────────────────────────── */}
          {paso === 2 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">Tu perfil público</h2>
                <p className="text-gray-500 text-sm mt-1">Así te van a ver los clientes.</p>
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
            </>
          )}

          {/* ── Paso 3: Especialidades ───────────────────────────────────── */}
          {paso === 3 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">¿En qué trabajás?</h2>
                <p className="text-gray-500 text-sm mt-1">Seleccioná todas las especialidades que apliquen.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-col gap-2">
                  {especialidades.map(cat => {
                    const checked = selectedEsps.includes(cat.id)
                    const subs    = subcats[cat.id] ?? []
                    return (
                      <div key={cat.id} className={`border rounded-xl transition-colors ${checked ? 'border-primary-pale bg-primary-soft/30' : 'border-cream-dark'}`}>
                        <label className="flex items-center gap-2.5 cursor-pointer p-3">
                          <input
                            type="checkbox"
                            value={cat.id}
                            {...register('especialidades', {
                              onChange: (ev) => toggleSubcat(cat.id, ev.target.checked)
                            })}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                          />
                          <span className={`text-sm font-medium transition-colors ${checked ? 'text-primary' : 'text-gray-700'}`}>{cat.nombre}</span>
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
                                  onChange={ev => updateSubcat(cat.id, idx, ev.target.value)}
                                  className="flex-1 border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
                                />
                                {subs.length > 1 && (
                                  <button type="button" onClick={() => removeSubcat(cat.id, idx)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                                )}
                              </div>
                            ))}
                            {subs.length < 5 && (
                              <button type="button" onClick={() => addSubcat(cat.id)} className="text-xs text-primary hover:underline w-fit mt-0.5">
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
            </>
          )}

          {/* ── Paso 4: Confirmar ────────────────────────────────────────── */}
          {paso === 4 && (
            <>
              <div>
                <h2 className="font-serif font-bold text-gray-900 text-2xl">Cobros y confirmación</h2>
                <p className="text-gray-500 text-sm mt-1">Último paso antes de crear tu cuenta.</p>
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
            </>
          )}
        </div>

        {/* Barra inferior de navegación */}
        <div className="border-t border-cream px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <span className="hidden sm:inline text-xs text-gray-400">Paso {paso} de {PASOS_TECNICO.length}</span>
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
            {paso < PASOS_TECNICO.length ? (
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
                disabled={isSubmitting}
                className="text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando...' : 'Registrarme como técnico'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function RegistroForm({ especialidades = [] }: { especialidades?: CategoriaOpcion[] }) {
  const [tipo, setTipo] = useState<'cliente' | 'tecnico'>('cliente')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tipo') === 'tecnico') setTipo('tecnico')
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Los tabs y el form de cliente (corto) quedan centrados y angostos; el de técnico (el
          wizard largo, con sidebar de pasos) usa todo el ancho que le da la página. */}
      <div className={tipo === 'cliente' ? 'max-w-md w-full mx-auto' : 'w-full'}>
        <Tabs tipo={tipo} onChange={setTipo} />
      </div>
      {tipo === 'cliente' ? (
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-cream-dark shadow-sm">
            <ClienteForm />
          </div>
        </div>
      ) : (
        <TecnicoForm especialidades={especialidades} />
      )}
    </div>
  )
}
