import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import CommandPalette from './CommandPalette'
import { mockTecnicos } from '@/data/mockTecnicos'
import type { UserTipo } from '@/lib/types'

interface UserInfo {
  nombre: string
  tipo:   UserTipo
}

const DASHBOARD: Record<string, string> = {
  admin:   '/dashboard/admin',
  tecnico: '/dashboard/tecnico',
  cliente: '/dashboard/cliente',
}

function openPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }))
}

export default function Navbar() {
  const [menuOpen, setMenuOpen]         = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userInfo, setUserInfo]         = useState<UserInfo | null>(null)
  const [loading, setLoading]           = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadUser = async (userId: string) => {
      const { data } = await supabase
        .from('usuarios')
        .select('nombre_completo, tipo')
        .eq('id', userId)
        .single()
      if (data) setUserInfo({ nombre: data.nombre_completo, tipo: data.tipo as UserTipo })
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser(session.user.id)
      else { setUserInfo(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initials = userInfo?.nombre
    .split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  const firstName = userInfo?.nombre.split(' ')[0]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-cream-dark">

        {/* ── Desktop: grid 3 columnas ─────────────────────────────────── */}
        <div className="hidden md:grid grid-cols-[1fr_1.1fr_1fr] items-center gap-4 px-8 h-16 max-w-7xl mx-auto">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 shrink-0">
              <img src="/images/taita-avatar.webp" alt="TAITA" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="leading-none">
              <div className="font-serif font-bold text-primary text-[18px] leading-none tracking-tight">TAITA</div>
              <div className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">soluciones</div>
            </div>
          </a>

          {/* Search */}
          <button
            onClick={openPalette}
            className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 text-sm text-gray-400 cursor-pointer w-full"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 truncate text-left">Buscá técnicos, servicios…</span>
            <kbd className="text-[10px] bg-white border border-cream-dark rounded px-1 shrink-0">Ctrl+K</kbd>
          </button>

          {/* Links / Usuario */}
          <div className="flex items-center justify-end gap-3">
            <a href="/tecnicos"      className="text-sm text-gray-600 hover:text-primary transition-colors">Técnicos</a>
            <a href="/como-funciona" className="text-sm text-gray-600 hover:text-primary transition-colors">Cómo funciona</a>

            {!loading && (
              userInfo ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    className="flex items-center gap-2 border border-cream-dark rounded-full pr-3 pl-1 py-1 bg-white hover:border-primary-pale transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-gray-600 max-w-20 truncate">{firstName}</span>
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-cream-dark py-1.5 z-50">
                      <div className="px-4 py-2 border-b border-cream mb-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{userInfo.nombre}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{userInfo.tipo}</p>
                      </div>
                      <a
                        href={DASHBOARD[userInfo.tipo]}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-primary-soft hover:text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Mi panel
                      </a>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <a href="/login" className="bg-primary-soft hover:bg-primary-pale text-primary rounded-full px-4 py-1.5 text-sm font-semibold transition-colors">
                    Ingresar
                  </a>
                  <a href="/registro" className="bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded-full transition-colors text-sm">
                    Registrate
                  </a>
                </>
              )
            )}
          </div>
        </div>

        {/* ── Mobile ───────────────────────────────────────────────────── */}
        <div className="md:hidden flex items-center justify-between h-16 px-4">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 shrink-0">
              <img src="/images/taita-avatar.webp" alt="TAITA" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <span className="font-serif font-bold text-primary text-base">TAITA</span>
          </a>
          <div className="flex items-center gap-2">
            <button aria-label="Buscar" onClick={openPalette} className="p-2 rounded-lg text-gray-500 hover:bg-cream transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              aria-label="Menú"
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 rounded-lg text-gray-600 hover:bg-cream transition-colors"
            >
              {menuOpen
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-cream-dark flex flex-col gap-1 px-4">
            <a href="/tecnicos"      className="px-3 py-2 rounded-xl text-gray-600 hover:text-primary hover:bg-primary-soft font-medium transition-colors">Técnicos</a>
            <a href="/como-funciona" className="px-3 py-2 rounded-xl text-gray-600 hover:text-primary hover:bg-primary-soft font-medium transition-colors">Cómo funciona</a>
            {!loading && (userInfo ? (
              <>
                <div className="px-3 py-2 flex items-center gap-2.5 border-t border-cream mt-1 pt-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{userInfo.nombre}</p>
                    <p className="text-xs text-gray-400 capitalize">{userInfo.tipo}</p>
                  </div>
                </div>
                <a href={DASHBOARD[userInfo.tipo]} className="px-3 py-2 rounded-xl text-gray-600 hover:text-primary hover:bg-primary-soft font-medium transition-colors">
                  Mi panel
                </a>
                <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-left text-red-500 hover:bg-red-50 font-medium transition-colors">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <a href="/login"    className="px-3 py-2 rounded-xl text-gray-600 hover:text-primary hover:bg-primary-soft font-medium transition-colors">Ingresar</a>
                <a href="/registro" className="mt-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-full text-center hover:bg-primary-hover transition-colors">Registrate</a>
              </>
            ))}
          </div>
        )}
      </nav>

      <CommandPalette tecnicos={mockTecnicos} />
    </>
  )
}
