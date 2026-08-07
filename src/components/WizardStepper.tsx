// Sidebar de progreso (desktop) + barra compacta (mobile) para formularios de varios pasos.
// Se extrajo del wizard de "Solicitar servicio" (Fase 6a) para reusarlo tal cual en el de
// registro de técnico (Fase 6d) — mismo lenguaje visual, sin duplicar la misma JSX dos veces.

export interface PasoWizard {
  n:     number
  label: string
  sub:   string
}

interface SidebarProps {
  pasos:  PasoWizard[]
  actual: number
  titulo?: string
}

export function StepperSidebar({ pasos, actual, titulo = 'Progreso' }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col gap-1 w-56 shrink-0 pt-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{titulo}</p>
      {pasos.map((p, idx) => {
        const completado = p.n < actual
        const esActual    = p.n === actual
        return (
          <div key={p.n} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                completado ? 'bg-primary text-white'
                : esActual ? 'bg-primary text-white ring-4 ring-amber-200'
                : 'bg-white border border-cream-dark text-gray-400'
              }`}>
                {completado ? '✓' : p.n}
              </span>
              {idx < pasos.length - 1 && (
                <span className={`w-px flex-1 min-h-7 ${completado ? 'bg-primary' : 'bg-cream-dark'}`} />
              )}
            </div>
            <div className={`pb-7 ${esActual ? '' : 'opacity-80'}`}>
              <p className={`text-sm font-semibold ${esActual ? 'text-primary' : completado ? 'text-gray-700' : 'text-gray-400'}`}>{p.label}</p>
              <p className="text-xs text-gray-400">{p.sub}</p>
            </div>
          </div>
        )
      })}
    </aside>
  )
}

interface MobileBarProps {
  total:  number
  actual: number
  label:  string
}

export function StepperMobileBar({ total, actual, label }: MobileBarProps) {
  return (
    <div className="lg:hidden px-5 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Paso {actual} de {total}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="w-full h-1.5 bg-cream rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(actual / total) * 100}%` }} />
      </div>
    </div>
  )
}
