import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserTipo } from '@/lib/types'

// Barra de navegación inferior estilo app nativa — solo mobile (`md:hidden`).
//
// Los accesos NO son un set genérico fijo — cada rol tiene su propio recorrido:
//   - Cliente / visitante sin sesión: buscar técnico → pedir un servicio → ver sus solicitudes.
//     (el visitante ve los mismos accesos que el cliente porque `/solicitud` y `/dashboard/cliente`
//     ya están protegidos por el middleware — clickearlos sin sesión manda a /login con redirect,
//     mismo criterio que ya usa el navbar de escritorio para "Solicitar servicio".)
//   - Técnico: ver sus trabajos → gestionar su perfil → ver cómo lo ve el público.
//   - Admin: sin barra — sigue con el panel de escritorio (decisión ya tomada en la Fase 6).
export default function BottomNavMobile() {
  const [tipo, setTipo] = useState<UserTipo | null>(null)
  const [tecnicoId, setTecnicoId] = useState<string | null>(null)
  const [path, setPath] = useState('')

  useEffect(() => {
    setPath(window.location.pathname)

    const loadUsuario = async (userId: string) => {
      const { data } = await supabase.from('usuarios').select('tipo').eq('id', userId).single()
      const t = (data?.tipo as UserTipo) ?? null
      setTipo(t)
      if (t === 'tecnico') {
        const { data: tec } = await supabase.from('tecnicos').select('id').eq('usuario_id', userId).single()
        setTecnicoId(tec?.id ?? null)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUsuario(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUsuario(session.user.id)
      else { setTipo(null); setTecnicoId(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (tipo === 'admin') return null

  const activo = (href: string) => {
    const base = href.split('#')[0].split('?')[0]
    return base === '/' ? path === '/' : path.startsWith(base)
  }

  const iconHome  = <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  const iconWrench = <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 4a4 4 0 10-4.9 3.9L3 11v3h3l3.1-3.1A4 4 0 0011 4zm0 0l9 9m-4-2l3-3m-9.5 4.5L3 21" /></svg>
  const iconPlus  = <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
  const iconList  = <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  const iconUser  = <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  const iconEye   = <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

  const items = tipo === 'tecnico'
    ? [
        { label: 'Inicio',       href: '/',                                icon: iconHome },
        { label: 'Mis trabajos', href: '/dashboard/tecnico',                icon: iconList },
        { label: 'Mi perfil',    href: '/dashboard/tecnico#mi-perfil',      icon: iconUser },
        { label: 'Ver público',  href: tecnicoId ? `/tecnicos/${tecnicoId}` : '/dashboard/tecnico#mi-perfil', icon: iconEye },
      ]
    : [
        { label: 'Inicio',    href: '/',                  icon: iconHome },
        { label: 'Técnicos',  href: '/tecnicos',           icon: iconWrench },
        { label: 'Solicitar', href: '/solicitud',          icon: iconPlus },
        { label: 'Mis pedidos', href: '/dashboard/cliente', icon: iconList },
      ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-primary border-t border-primary-hover/40 flex items-stretch pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.25)]">
      {items.map(item => {
        const on = activo(item.href)
        return (
          <a
            key={item.label}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
              on ? 'text-white' : 'text-white/55 hover:text-white/80'
            }`}
          >
            <span className={`p-1 rounded-full transition-colors ${on ? 'bg-white/15' : ''}`}>{item.icon}</span>
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
