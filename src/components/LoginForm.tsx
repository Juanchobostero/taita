import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const loginSchema = z.object({
  email:    z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

type LoginData = z.infer<typeof loginSchema>

const DASHBOARD: Record<string, string> = {
  admin:   '/dashboard/admin',
  tecnico: '/dashboard/tecnico',
  cliente: '/dashboard/cliente',
}

export default function LoginForm() {
  const [serverError, setServerError] = useState('')
  const [sinConfirmar, setSinConfirmar] = useState('') // email pendiente de confirmar, si es ese el motivo del error
  const [reenviando, setReenviando] = useState(false)
  const [reenviado,  setReenviado]  = useState(false)
  const params     = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const redirectTo = params.get('redirect')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const reenviarConfirmacion = async () => {
    if (!sinConfirmar) return
    setReenviando(true)
    await supabase.auth.resend({ type: 'signup', email: sinConfirmar })
    setReenviando(false)
    setReenviado(true)
  }

  const onSubmit = async (data: LoginData) => {
    setServerError('')
    setSinConfirmar('')
    setReenviado(false)
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      // Supabase distingue "email not confirmed" de credenciales inválidas — sin esto, un cliente
      // que todavía no clickeó el link de confirmación ve "contraseña incorrecta" y piensa que se
      // equivocó al tipear, cuando en realidad la contraseña está bien.
      if (error.code === 'email_not_confirmed' || error.message?.toLowerCase().includes('email not confirmed')) {
        setSinConfirmar(data.email)
      } else {
        setServerError('Email o contraseña incorrectos.')
      }
      return
    }

    // Leer tipo del usuario para redirigir al dashboard correcto
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', authData.user.id)
      .single()

    const tipo = usuario?.tipo ?? 'cliente'
    // Si viene de una URL protegida y es cliente, vuelve ahí; si no, va al dashboard
    const dest = (redirectTo && tipo === 'cliente') ? redirectTo : (DASHBOARD[tipo] ?? '/dashboard/cliente')
    window.location.href = dest
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>Correo electrónico</Label>
        <Input
          type="email"
          placeholder="tu@email.com"
          {...register('email')}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Contraseña</Label>
          <a href="#" className="text-xs text-primary hover:text-primary-hover font-medium">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <Input
          type="password"
          placeholder="Tu contraseña"
          {...register('password')}
          className={errors.password ? 'border-destructive' : ''}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
          {serverError}
        </div>
      )}

      {sinConfirmar && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 flex flex-col items-center gap-2 text-center">
          <span>📩 Todavía no confirmaste tu correo. Revisá tu bandeja de entrada (o spam) y hacé click en el link que te mandamos.</span>
          <button
            type="button"
            onClick={reenviarConfirmacion}
            disabled={reenviando || reenviado}
            className="text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {reenviado ? '✓ Reenviado' : reenviando ? 'Enviando…' : 'Reenviar confirmación'}
          </button>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <a href={redirectTo ? `/registro?redirect=${encodeURIComponent(redirectTo)}` : '/registro'} className="text-primary hover:text-primary-hover font-medium">
          Registrate gratis
        </a>
      </p>
    </form>
  )
}
