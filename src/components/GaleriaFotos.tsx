import { useState } from 'react'

interface Props {
  urls: string[]
}

export default function GaleriaFotos({ urls }: Props) {
  const [abierta, setAbierta] = useState<string | null>(null)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {urls.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setAbierta(url)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <img
              src={url}
              alt="Foto del trabajo"
              className="w-24 h-24 rounded-xl object-cover border border-cream-dark hover:opacity-90 transition-opacity cursor-zoom-in"
            />
          </button>
        ))}
      </div>

      {abierta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAbierta(null)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAbierta(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white text-gray-700 hover:bg-gray-100 flex items-center justify-center shadow-md text-lg font-bold leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
            <img
              src={abierta}
              alt="Foto del trabajo ampliada"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  )
}
