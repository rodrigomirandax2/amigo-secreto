import { motion } from 'motion/react'

/*
 * Foto de los niños con flechas punteadas a mano y el nombre de cada uno.
 * Todo vive en un lienzo de 100 x 140 unidades: la foto ocupa x 9..91, y 30..112.
 * - nombre: lo que se escribe.
 * - etiqueta: dónde va el nombre (fuera de la foto).
 * - destino: a dónde apunta la flecha (la cabeza o el cuerpo del niño).
 * - curva: 1 o -1, hacia qué lado se tuerce la flecha.
 */
const NINOS: { nombre: string; etiqueta: [number, number]; destino: [number, number]; curva: 1 | -1 }[] = [
  { nombre: 'Benjita', etiqueta: [13, 9],  destino: [25, 37],   curva: 1 },
  { nombre: 'Isa Jaramillo', etiqueta: [37, 20], destino: [44, 40],   curva: -1 },
  { nombre: 'Fran', etiqueta: [63, 9],  destino: [58, 40.5], curva: 1 },
  { nombre: 'Maxi', etiqueta: [87, 20], destino: [74, 38],   curva: -1 },
  { nombre: 'Emma', etiqueta: [27, 132], destino: [38, 103], curva: -1 },
  { nombre: 'Isa Miranda', etiqueta: [73, 132], destino: [62, 104], curva: 1 },
]

type P = [number, number]

/** Trazo con un rulito al medio, como dibujado a mano. */
function flecha(desde: P, hasta: P, curva: number): { d: string; angulo: number } {
  const [x1, y1] = desde
  const [x2, y2] = hasta
  const dx = x2 - x1, dy = y2 - y1
  const largo = Math.hypot(dx, dy) || 1
  const u: P = [dx / largo, dy / largo]
  const n: P = [-u[1] * curva, u[0] * curva]
  const m: P = [x1 + dx * 0.45 + n[0] * 3, y1 + dy * 0.45 + n[1] * 3]
  const m2: P = [m[0] + u[0] * 1.5, m[1] + u[1] * 1.5]
  const r = 3.2
  const f = (p: P) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  const c1: P = [x1 + dx * 0.15 + n[0] * 6, y1 + dy * 0.15 + n[1] * 6]
  const l1: P = [m[0] + u[0] * r * 2 + n[0] * r * 2, m[1] + u[1] * r * 2 + n[1] * r * 2]
  const l2: P = [m[0] - u[0] * r * 1.4 + n[0] * r * 2, m[1] - u[1] * r * 1.4 + n[1] * r * 2]
  const c2: P = [m2[0] + dx * 0.3 - n[0] * 5, m2[1] + dy * 0.3 - n[1] * 5]
  const d = `M ${f(desde)} Q ${f(c1)} ${f(m)} C ${f(l1)} ${f(l2)} ${f(m2)} Q ${f(c2)} ${f(hasta)}`
  return { d, angulo: (Math.atan2(y2 - c2[1], x2 - c2[0]) * 180) / Math.PI }
}

/** El trazo sale un poco separado del nombre para no tocar las letras. */
function inicio(etiqueta: P, destino: P): P {
  const [x, y] = etiqueta
  return destino[1] > y ? [x, y + 2.5] : [x, y - 6]
}

export default function FotoNinos() {
  return (
    <motion.div
      className="foto-zona"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0.3, delay: 0.15 }}
    >
      <figure className="foto">
        <img src={`${import.meta.env.BASE_URL}ninos.jpg`} alt="Los niños de las 6 familias" />
      </figure>

      <svg className="foto-flechas" viewBox="0 0 100 140" aria-hidden="true">
        <defs>
          {NINOS.map((k, i) => (
            <mask id={`trazo-${i}`} key={i} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="140">
              <motion.path
                d={flecha(inicio(k.etiqueta, k.destino), k.destino, k.curva).d}
                stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: 0.6 + i * 0.25, ease: 'easeInOut' }}
              />
            </mask>
          ))}
        </defs>

        {NINOS.map((k, i) => {
          const { d, angulo } = flecha(inicio(k.etiqueta, k.destino), k.destino, k.curva)
          return (
            <g key={k.nombre}>
              {/* La flecha entera se mece desde el nombre, como si respirara. */}
              <motion.g
                animate={{ rotate: [0, 2.5 * k.curva, -1.5 * k.curva, 0] }}
                transition={{ duration: 3.2 + i * 0.35, repeat: Infinity, ease: 'easeInOut', delay: 2 + i * 0.25 }}
                style={{ transformOrigin: `${k.etiqueta[0]}px ${k.etiqueta[1]}px`, transformBox: 'view-box' }}
              >
                <path
                  className="flecha-viva"
                  d={d} mask={`url(#trazo-${i})`} stroke="#fff" strokeWidth=".9" strokeDasharray="0 2.2" strokeLinecap="round" fill="none"
                  style={{ animationDuration: `${0.9 + (i % 3) * 0.15}s` }}
                />
                <g transform={`translate(${k.destino[0]} ${k.destino[1]}) rotate(${angulo})`}>
                  {/* La punta "toca" al niño: avanza y retrocede. */}
                  <motion.path
                    d="M -1.6 -1.5 L 1.4 0 L -1.6 1.5 Z"
                    fill="#fff"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: [0, 1.4, 0, 0.9, 0, 0] }}
                    transition={{
                      opacity: { delay: 1.6 + i * 0.25, duration: 0.2 },
                      x: { delay: 1.8 + i * 0.25, duration: 1.6, repeat: Infinity, repeatDelay: 1 + (i % 3) * 0.6, times: [0, 0.15, 0.3, 0.45, 0.6, 1] },
                    }}
                  />
                </g>
              </motion.g>
              <motion.text
                x={k.etiqueta[0]}
                y={k.etiqueta[1]}
                className="foto-nombre"
                textAnchor="middle"
                initial={{ opacity: 0, scale: 0.6, rotate: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: [-4, 4, -4], y: [0, -0.8, 0] }}
                transition={{
                  opacity: { delay: 0.4 + i * 0.25 },
                  scale: { delay: 0.4 + i * 0.25, type: 'spring', bounce: 0.5 },
                  rotate: { delay: 1 + i * 0.25, duration: 2.6 + (i % 3) * 0.4, repeat: Infinity, ease: 'easeInOut' },
                  y: { delay: 1 + i * 0.25, duration: 1.9 + (i % 2) * 0.5, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{ transformOrigin: `${k.etiqueta[0]}px ${k.etiqueta[1]}px`, transformBox: 'view-box' }}
              >
                {k.nombre}
              </motion.text>
            </g>
          )
        })}
      </svg>
    </motion.div>
  )
}
