import { useMemo } from 'react'
import confetti from 'canvas-confetti'

const COLORES = ['#ff4d4d', '#ffd23f', '#3ddc84', '#4dabff', '#ff8cd9']
const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Nieve() {
  const copos = useMemo(() => {
    if (reducido()) return []
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      simbolo: Math.random() < 0.3 ? '❄' : '•',
      left: Math.random() * 100,
      size: 6 + Math.random() * 12,
      opacity: 0.4 + Math.random() * 0.6,
      caida: 8 + Math.random() * 10,
      mece: 3 + Math.random() * 3,
      delay: -Math.random() * 18,
    }))
  }, [])
  return (
    <div className="nieve" aria-hidden="true">
      {copos.map(c => (
        <span
          key={c.id}
          style={{
            left: `${c.left}vw`,
            fontSize: c.size,
            opacity: c.opacity,
            animationDuration: `${c.caida}s, ${c.mece}s`,
            animationDelay: `${c.delay}s, 0s`,
          }}
        >
          {c.simbolo}
        </span>
      ))}
    </div>
  )
}

export function Guirnalda() {
  return (
    <div className="guirnalda" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          style={{ '--c': COLORES[i % COLORES.length], animationDelay: `${(i % 3) * 0.5}s` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/** Viejito Pascuero, dibujo propio. */
export function Pascuero() {
  return (
    <div className="pascuero">
      <svg viewBox="0 0 120 130" width="110" height="120" role="img" aria-label="Viejito Pascuero">
        <path d="M22 52 Q30 10 70 12 Q100 14 104 40 L96 44 Q88 26 66 26 Q40 28 36 54 Z" fill="#d62828" />
        <circle cx="104" cy="42" r="8" fill="#fff" />
        <rect x="18" y="48" width="84" height="14" rx="7" fill="#fff" />
        <circle cx="60" cy="74" r="24" fill="#f6c9a8" />
        <circle cx="51" cy="70" r="3" fill="#3b2a24" />
        <circle cx="69" cy="70" r="3" fill="#3b2a24" />
        <circle cx="45" cy="78" r="4" fill="#f4a3a3" opacity=".7" />
        <circle cx="75" cy="78" r="4" fill="#f4a3a3" opacity=".7" />
        <circle cx="60" cy="78" r="4.5" fill="#e88b7d" />
        <path d="M32 80 Q34 120 60 124 Q86 120 88 80 Q80 92 70 88 Q60 96 50 88 Q40 92 32 80 Z" fill="#fff" />
        <path d="M46 88 Q53 82 60 87 Q67 82 74 88 Q67 92 60 89 Q53 92 46 88 Z" fill="#f2f2f2" stroke="#e3e3e3" />
        <path d="M54 96 Q60 101 66 96" stroke="#c0392b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function lanzarConfeti() {
  if (reducido()) return
  const comun = { particleCount: 60, spread: 70, colors: COLORES, startVelocity: 45 }
  confetti({ ...comun, angle: 60, origin: { x: 0, y: 0.7 } })
  confetti({ ...comun, angle: 120, origin: { x: 1, y: 0.7 } })
  setTimeout(() => confetti({ particleCount: 80, spread: 100, colors: COLORES, origin: { y: 0.5 } }), 250)
}

export function Encabezado({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: React.ReactNode }) {
  return (
    <header>
      <Pascuero />
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
      {children}
    </header>
  )
}
