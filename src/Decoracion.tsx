import { useMemo } from 'react'
import { motion } from 'motion/react'
import confetti from 'canvas-confetti'

// Ilustraciones 3D de Microsoft Fluent Emoji (licencia MIT), fijadas a un commit.
const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets'
export const ILUSTRACION = {
  pascuero: `${BASE}/Santa%20claus/Default/3D/santa_claus_3d_default.png`,
  regalo: `${BASE}/Wrapped%20gift/3D/wrapped_gift_3d.png`,
  arbol: `${BASE}/Christmas%20tree/3D/christmas_tree_3d.png`,
  copo: `${BASE}/Snowflake/3D/snowflake_3d.png`,
  carta: `${BASE}/Envelope%20with%20arrow/3D/envelope_with_arrow_3d.png`,
  brillos: `${BASE}/Sparkles/3D/sparkles_3d.png`,
  fiesta: `${BASE}/Party%20popper/3D/party_popper_3d.png`,
}

const COLORES = ['#ff5a6e', '#ffc94d', '#4ade80', '#7dd3fc', '#f0abfc', '#ffffff']
const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fondo de noche con auroras y nieve fina. */
export function Fondo() {
  const copos = useMemo(() => {
    if (reducido()) return []
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      opacity: 0.25 + Math.random() * 0.6,
      caida: 10 + Math.random() * 14,
      delay: -Math.random() * 24,
    }))
  }, [])
  return (
    <div className="fondo" aria-hidden="true">
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />
      {copos.map(c => (
        <span
          key={c.id}
          className="copo"
          style={{ left: `${c.left}vw`, width: c.size, height: c.size, opacity: c.opacity, animationDuration: `${c.caida}s`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  )
}

export function Hero({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: React.ReactNode }) {
  return (
    <header className="hero">
      <motion.img
        className="hero-pascuero"
        src={ILUSTRACION.pascuero}
        alt=""
        width={132}
        height={132}
        initial={{ y: 20, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.45 }}
      />
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {titulo}
      </motion.h1>
      {subtitulo && <p className="hero-sub">{subtitulo}</p>}
      {children}
    </header>
  )
}

export function lanzarConfeti() {
  if (reducido()) return
  const comun = { particleCount: 70, spread: 75, colors: COLORES, startVelocity: 48, scalar: 1.1 }
  confetti({ ...comun, angle: 60, origin: { x: 0, y: 0.75 } })
  confetti({ ...comun, angle: 120, origin: { x: 1, y: 0.75 } })
  setTimeout(() => confetti({ particleCount: 90, spread: 110, colors: COLORES, origin: { y: 0.45 }, shapes: ['star', 'circle'] }), 250)
}
