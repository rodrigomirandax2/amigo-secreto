import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ILUSTRACION } from './Decoracion'
import { colorFamilia, nombreFamilia } from './colores'
import { iniciales } from './iniciales'
import { rpc, textoError, type CartaDe } from './supabase'

// El 3D pesa: se baja sólo cuando se abre esta pestaña.
const Arbol3D = lazy(() => import('./Arbol3D'))

type Vista = 'arbol' | 'lista'
interface Aviso { id: number; nombre: string; sigla: string; familia: number }

// Cada cuánto se revisa si llegaron cartas nuevas (sólo con la pestaña visible).
const CADA_MS = 20_000

function soportaWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

/** Si el 3D falla en algún celular, se muestra la lista y listo. */
class SiFalla extends Component<{ alFallar: () => void; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  componentDidCatch() { this.props.alFallar() }
  render() { return this.state.fallo ? null : this.props.children }
}

export default function Cartas({ correo, codigo, miNombre }: { correo: string; codigo: string; miNombre: string }) {
  const [cartas, setCartas] = useState<CartaDe[] | null>(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState<Vista>(() => (soportaWebGL() ? 'arbol' : 'lista'))
  const [abierta, setAbierta] = useState<number | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [nuevas, setNuevas] = useState<Set<number>>(new Set())
  const conocidas = useRef<Set<number> | null>(null)

  useEffect(() => {
    let vivo = true
    async function cargar() {
      try {
        const lista = (await rpc<CartaDe[]>('cartas', { p_correo: correo, p_codigo: codigo })) ?? []
        if (!vivo) return
        const escritas = new Set(lista.filter(c => c.opcion1).map(c => c.id))
        // La primera carga sólo memoriza; las siguientes avisan lo que llegó.
        const antes = conocidas.current
        if (antes) {
          const llegaron = lista.filter(c => escritas.has(c.id) && !antes.has(c.id))
          if (llegaron.length) {
            const sig = iniciales(lista)
            setAvisos(a => [...a, ...llegaron.map(c => ({ id: c.id, nombre: c.nombre, sigla: sig.get(c.id) ?? '', familia: c.familia }))])
            setNuevas(n => new Set([...n, ...llegaron.map(c => c.id)]))
            navigator.vibrate?.(60)
          }
        }
        conocidas.current = escritas
        setCartas(lista)
      } catch (e) {
        if (vivo && !conocidas.current) setError(textoError(e))
      }
    }
    cargar()
    const reloj = setInterval(() => { if (document.visibilityState === 'visible') cargar() }, CADA_MS)
    // Al volver a la app se revisa al tiro.
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { vivo = false; clearInterval(reloj); document.removeEventListener('visibilitychange', alVolver) }
  }, [correo, codigo])

  // Cada aviso se va solo a los 5 segundos.
  useEffect(() => {
    if (!avisos.length) return
    const t = setTimeout(() => setAvisos(a => a.slice(1)), 5000)
    return () => clearTimeout(t)
  }, [avisos])

  function abrirDesdeAviso(id: number) {
    setAvisos(a => a.filter(x => x.id !== id))
    alAbrir(id)
  }

  function alAbrir(id: number | null) {
    setAbierta(id)
    if (id !== null) setNuevas(n => { const m = new Set(n); m.delete(id); return m })
  }

  const conCarta = useMemo(() => (cartas ?? []).filter(c => c.opcion1), [cartas])
  const siglas = useMemo(() => iniciales(cartas ?? []), [cartas])
  const indice = conCarta.findIndex(c => c.id === abierta)
  const actual = indice >= 0 ? conCarta[indice] : null
  const mover = (paso: number) => setAbierta(conCarta[(indice + paso + conCarta.length) % conCarta.length].id)

  if (error) return <section className="tarjeta"><p className="mensaje-estado error">{error}</p></section>
  if (!cartas) return <section className="tarjeta"><p className="nota">Colgando las cartitas…</p></section>

  const total = cartas.length
  const escritas = conCarta.length

  return (
    <>
      <section className="tarjeta arbol-tarjeta">
        <div className="tarjeta-cabeza">
          <img src={ILUSTRACION.arbol} alt="" />
          <div>
            <h2>El árbol de cartas</h2>
            <p>{vista === 'arbol' ? 'Gira el árbol y toca una cartita' : 'Toca un nombre para leer su carta'}</p>
          </div>
        </div>

        <div className="progreso" aria-label={`${escritas} de ${total} cartas escritas`}>
          <div className="progreso-barra"><motion.div initial={{ width: 0 }} animate={{ width: `${(escritas / total) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }} /></div>
          <span><strong>{escritas}</strong> de {total} cartas escritas</span>
        </div>

        <div className="segmentado" role="tablist">
          {(['arbol', 'lista'] as const).map(v => (
            <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'activo' : ''} onClick={() => setVista(v)}>
              {vista === v && <motion.span layoutId="segmento" className="segmento-fondo" />}
              <span>{v === 'arbol' ? '🎄 Árbol' : '📋 Lista'}</span>
            </button>
          ))}
        </div>

        {vista === 'arbol' ? (
          <div className="arbol-lienzo">
            <SiFalla alFallar={() => setVista('lista')}>
              <Suspense fallback={<p className="nota arbol-cargando">Armando el arbolito…</p>}>
                <Arbol3D cartas={cartas} seleccion={abierta} nuevas={nuevas} onElegir={alAbrir} />
              </Suspense>
            </SiFalla>
          </div>
        ) : (
          <Lista cartas={cartas} siglas={siglas} nuevas={nuevas} miNombre={miNombre} onAbrir={alAbrir} />
        )}

        <div className="leyenda">
          {[...new Set(cartas.map(c => c.familia))].map(f => (
            <span key={f}><i style={{ background: colorFamilia(f) }} />{nombreFamilia(cartas, f).replace('Familia de ', '')}</span>
          ))}
        </div>
      </section>

      <div className="avisos" aria-live="polite">
        <AnimatePresence>
          {avisos.map(a => (
            <motion.button
              key={a.id}
              layout
              className="aviso"
              onClick={() => abrirDesdeAviso(a.id)}
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0.4 }}
            >
              <motion.span className="aviso-icono" animate={{ rotate: [0, -12, 12, -8, 8, 0] }} transition={{ duration: 0.8, delay: 0.2 }}>💌</motion.span>
              <span className="aviso-texto">
                <strong>¡Llegó una carta!</strong>
                <small>{a.nombre} colgó su carta en el árbol</small>
              </span>
              <span className="avatar" style={{ background: colorFamilia(a.familia) }}>{a.sigla}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {actual && (
          <CartaAbierta
            key="hoja"
            carta={actual}
            sigla={siglas.get(actual.id) ?? ''}
            esMia={actual.nombre === miNombre}
            posicion={`${indice + 1} / ${conCarta.length}`}
            onCerrar={() => setAbierta(null)}
            onAnterior={() => mover(-1)}
            onSiguiente={() => mover(1)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function Lista({ cartas, siglas, nuevas, miNombre, onAbrir }: { cartas: CartaDe[]; siglas: Map<number, string>; nuevas: Set<number>; miNombre: string; onAbrir: (id: number) => void }) {
  const familias = [...new Set(cartas.map(c => c.familia))]
  return (
    <div className="lista-cartas">
      {familias.map(f => (
        <div key={f}>
          <p className="familia-titulo"><i className="familia-punto" style={{ background: colorFamilia(f) }} />{nombreFamilia(cartas, f)}</p>
          {cartas.filter(c => c.familia === f).map(c => {
            const tiene = !!c.opcion1
            return (
              <button key={c.id} className="persona" disabled={!tiene} onClick={() => onAbrir(c.id)}>
                <span className="avatar" style={{ background: colorFamilia(c.familia) }}>{siglas.get(c.id)}</span>
                <span className="persona-texto">
                  <strong>{c.nombre}{c.nombre === miNombre && ' (tú)'}</strong>
                  <small>{c.descripcion || (c.es_nino ? 'niño/a' : '')}</small>
                </span>
                <span className={`chip ${nuevas.has(c.id) ? 'nueva' : tiene ? 'si' : 'no'}`}>{nuevas.has(c.id) ? '¡Nueva! 💌' : tiene ? 'Leer ✉️' : 'Sin carta'}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface CartaAbiertaProps {
  carta: CartaDe
  sigla: string
  esMia: boolean
  posicion: string
  onCerrar: () => void
  onAnterior: () => void
  onSiguiente: () => void
}

function CartaAbierta({ carta, sigla, esMia, posicion, onCerrar, onAnterior, onSiguiente }: CartaAbiertaProps) {
  // Escape cierra; flechas del teclado cambian de carta.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowLeft') onAnterior()
      if (e.key === 'ArrowRight') onSiguiente()
    }
    window.addEventListener('keydown', tecla)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = previo }
  }, [onCerrar, onAnterior, onSiguiente])

  const opciones = [carta.opcion1, carta.opcion2, carta.opcion3].filter(Boolean) as string[]

  return (
    <>
      <motion.div className="velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
      <motion.div
        className="hoja"
        role="dialog"
        aria-modal="true"
        aria-label={`Carta de ${carta.nombre}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onCerrar() }}
      >
        <div className="hoja-agarre" />
        <AnimatePresence mode="wait">
          <motion.div
            key={carta.id}
            className="papel"
            initial={{ opacity: 0, x: 30, rotate: 1.5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="papel-sello" style={{ background: colorFamilia(carta.familia) }}>{sigla}</div>
            <p className="papel-para">Querido Viejito Pascuero:</p>
            <p className="papel-intro">Para esta Navidad me gustaría…</p>
            <ol className="papel-lista">
              {opciones.map(o => <li key={o}>{o}</li>)}
            </ol>
            {carta.mensaje && <p className="papel-mensaje">{carta.mensaje}</p>}
            <p className="papel-firma">
              {carta.nombre}{esMia && ' (tú)'}
              {carta.descripcion && <small>{carta.descripcion}</small>}
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="hoja-nav">
          <button className="boton fantasma chico" onClick={onAnterior} aria-label="Carta anterior">←</button>
          <span>{posicion}</span>
          <button className="boton fantasma chico" onClick={onSiguiente} aria-label="Carta siguiente">→</button>
        </div>
        <button className="boton" onClick={onCerrar}>Cerrar</button>
      </motion.div>
    </>
  )
}
