// ─── SlideToAccept — Botão deslizante de confirmação ─────────────────────────
// O motorista arrasta o thumb da esquerda para a direita para aceitar o frete.
// Quando o thumb chega ao final do track, onAccept() é chamado.

import { useState, useRef } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'

interface SlideToAcceptProps {
  onAccept?: () => void
}

export function SlideToAccept({ onAccept }: SlideToAcceptProps) {
  const [pos,      setPos]      = useState(0)
  const [accepted, setAccepted] = useState(false)
  const trackRef  = useRef<HTMLDivElement>(null)
  const dragging  = useRef(false)

  // Largura do track menos o thumb (56px) = distância máxima de arraste
  const maxTravel = () =>
    trackRef.current ? trackRef.current.offsetWidth - 56 : 260

  const handleMove = (clientX: number) => {
    if (!dragging.current || !trackRef.current) return
    const rect   = trackRef.current.getBoundingClientRect()
    const newPos = Math.max(0, Math.min(clientX - rect.left - 28, maxTravel()))
    setPos(newPos)
    // Aceita quando o thumb chega a 10px do final
    if (newPos >= maxTravel() - 10 && !accepted) {
      setAccepted(true)
      onAccept?.()
    }
  }

  const handleEnd = () => {
    dragging.current = false
    if (!accepted) setPos(0) // Volta ao início se não completou
  }

  return (
    <div
      ref={trackRef}
      role="button"
      aria-label={accepted ? 'Frete aceito' : 'Deslize para aceitar o frete'}
      className={`relative h-14 rounded-full overflow-hidden select-none transition-colors duration-300 border-2 border-muvv-accent ${
        accepted ? 'bg-muvv-accent' : 'bg-muvv-accent-light'
      }`}
      onMouseDown={() => { dragging.current = true }}
      onMouseMove={e => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={() => { dragging.current = true }}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Label do track */}
      <div
        className={`absolute inset-0 flex items-center justify-center font-bold text-[15px] tracking-wide transition-opacity duration-300 ${
          accepted ? 'text-white opacity-100' : 'text-muvv-accent'
        } ${pos > 30 && !accepted ? 'opacity-0' : 'opacity-100'}`}
      >
        {accepted ? '✓  FRETE ACEITO!' : 'deslize para aceitar →'}
      </div>

      {/* Thumb arrastável */}
      {!accepted && (
        <div
          className="absolute top-1 flex items-center justify-center w-12 h-12 rounded-full bg-muvv-accent shadow-accent cursor-grab active:cursor-grabbing"
          style={{
            left: 4 + pos,
            // Transição suave apenas quando não está sendo arrastado
            transition: dragging.current ? 'none' : 'left 0.3s ease',
          }}
        >
          <Icon path={ICON_PATHS.arrow} size={20} color="white" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}
