import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Encabezado, lanzarConfeti } from './Decoracion'
import { rpc, textoError, type Persona, type Yo } from './supabase'

interface Sesion { correo: string; codigo: string }
const CLAVE = 'amigoSecreto'

function leerSesion(): Sesion | null {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') } catch { return null }
}
function guardarSesion(s: Sesion | null) {
  try { s ? localStorage.setItem(CLAVE, JSON.stringify(s)) : localStorage.removeItem(CLAVE) } catch { /* sin storage */ }
}

export default function Participante() {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [yo, setYo] = useState<Yo | null>(null)
  const [cargando, setCargando] = useState(true)

  async function entrar(s: Sesion) {
    const datos = await rpc<Yo>('entrar', { p_correo: s.correo, p_codigo: s.codigo })
    guardarSesion(s)
    setSesion(s)
    setYo(datos)
  }

  useEffect(() => {
    const previa = leerSesion()
    if (!previa) { setCargando(false); return }
    entrar(previa).catch(() => guardarSesion(null)).finally(() => setCargando(false))
  }, [])

  function salir() {
    guardarSesion(null)
    setSesion(null)
    setYo(null)
  }

  const datos = [yo?.monto && `💰 ${yo.monto}`, yo?.fecha && `📅 ${yo.fecha}`].filter(Boolean) as string[]

  return (
    <div className="contenedor">
      <Encabezado titulo="Amigo Secreto" subtitulo={yo ? `Hola, ${yo.nombre} 👋` : 'Las 6 familias'}>
        {datos.length > 0 && <div className="datos">{datos.map(d => <span key={d}>{d}</span>)}</div>}
        {yo && <button className="salir" onClick={salir}>Salir</button>}
      </Encabezado>

      {cargando ? null : !sesion || !yo ? (
        <Entrar onEntrar={entrar} />
      ) : (
        <>
          <MiAmigo sesion={sesion} sorteoHecho={yo.sorteo_hecho} />
          <MiCarta sesion={sesion} inicial={yo} />
        </>
      )}
    </div>
  )
}

function Entrar({ onEntrar }: { onEntrar: (s: Sesion) => Promise<void> }) {
  const [correo, setCorreo] = useState(() => new URLSearchParams(location.search).get('correo') ?? '')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try { await onEntrar({ correo: correo.trim(), codigo: codigo.trim() }) }
    catch (err) { setError(textoError(err)) }
    finally { setEnviando(false) }
  }

  return (
    <motion.section className="tarjeta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2>Entrar</h2>
      <form onSubmit={enviar}>
        <label htmlFor="correo">Tu correo</label>
        <input id="correo" type="email" autoComplete="email" required value={correo} onChange={e => setCorreo(e.target.value)} />
        <label htmlFor="codigo">Tu código de 4 dígitos</label>
        <input id="codigo" inputMode="numeric" maxLength={4} required value={codigo} onChange={e => setCodigo(e.target.value)} />
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        {error && <div className="error">{error}</div>}
      </form>
    </motion.section>
  )
}

function MiAmigo({ sesion, sorteoHecho }: { sesion: Sesion; sorteoHecho: boolean }) {
  const [amigo, setAmigo] = useState<Persona | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [mostrarNombre, setMostrarNombre] = useState(false)

  useEffect(() => {
    if (!sorteoHecho) return
    rpc<Persona | null>('mi_amigo', { p_correo: sesion.correo, p_codigo: sesion.codigo })
      .then(setAmigo)
      .catch(() => setAmigo(null))
  }, [sesion, sorteoHecho])

  function abrir() {
    if (abierto) return
    setAbierto(true)
    setTimeout(() => { setMostrarNombre(true); lanzarConfeti() }, 450)
  }

  const opciones = amigo ? [amigo.opcion1, amigo.opcion2, amigo.opcion3].filter(Boolean) as string[] : []

  return (
    <motion.section className="tarjeta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2>Tu amigo secreto</h2>
      {!amigo ? (
        <p className="nota">El sorteo todavía no se hace. Mientras tanto, escribe tu carta 👇</p>
      ) : (
        <>
          <p className="nota">Esto es lo que le gustaría recibir:</p>
          <ul className="opciones">
            {opciones.length === 0 && <li>Todavía no escribe su carta. Vuelve más tarde.</li>}
            {opciones.map((o, i) => (
              <motion.li key={o} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i }}>
                {o}
              </motion.li>
            ))}
          </ul>
          {amigo.mensaje && <p className="nota">“{amigo.mensaje}”</p>}

          <Regalo abierto={abierto} onAbrir={abrir} />
          {!abierto && <p className="pista">Toca el regalo para saber quién es</p>}
          <AnimatePresence>
            {mostrarNombre && (
              <motion.div
                className="revelado"
                initial={{ scale: 0.4, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                {amigo.nombre}
                {amigo.descripcion && <small>{amigo.descripcion}</small>}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.section>
  )
}

function Regalo({ abierto, onAbrir }: { abierto: boolean; onAbrir: () => void }) {
  return (
    <button className="regalo" onClick={onAbrir} aria-label="Abrir el regalo y revelar quién es">
      <motion.svg
        viewBox="0 0 120 120"
        aria-hidden="true"
        animate={abierto ? { rotate: 0 } : { rotate: [0, 0, -5, 5, -3, 3, 0] }}
        transition={abierto ? {} : { duration: 2.4, repeat: Infinity, times: [0, 0.7, 0.75, 0.8, 0.85, 0.9, 1] }}
        style={{ transformOrigin: '50% 100%' }}
      >
        <rect x="18" y="52" width="84" height="62" rx="6" fill="#c8102e" />
        <rect x="52" y="52" width="16" height="62" fill="#e9b949" />
        <motion.g
          animate={abierto ? { x: 30, y: -45, rotate: 30, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.8, opacity: { delay: 0.5, duration: 0.4 } }}
          style={{ transformOrigin: '60px 47px' }}
        >
          <rect x="12" y="38" width="96" height="18" rx="5" fill="#a50d26" />
          <rect x="52" y="38" width="16" height="18" fill="#e9b949" />
          <path d="M60 38 C44 18 30 26 40 36 Z M60 38 C76 18 90 26 80 36 Z" fill="#e9b949" stroke="#c9952a" strokeWidth="2" />
        </motion.g>
      </motion.svg>
    </button>
  )
}

function MiCarta({ sesion, inicial }: { sesion: Sesion; inicial: Yo }) {
  const [op1, setOp1] = useState(inicial.opcion1 ?? '')
  const [op2, setOp2] = useState(inicial.opcion2 ?? '')
  const [op3, setOp3] = useState(inicial.opcion3 ?? '')
  const [mensaje, setMensaje] = useState(inicial.mensaje ?? '')
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | ''; texto: string }>({ tipo: '', texto: '' })

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado({ tipo: '', texto: 'Enviando…' })
    try {
      await rpc('guardar_carta', {
        p_correo: sesion.correo, p_codigo: sesion.codigo,
        p_opcion1: op1, p_opcion2: op2, p_opcion3: op3, p_mensaje: mensaje,
      })
      setEstado({ tipo: 'ok', texto: '¡Carta enviada al Viejito Pascuero! 🎁' })
    } catch (err) {
      setEstado({ tipo: 'error', texto: textoError(err) })
    }
  }

  return (
    <motion.section className="tarjeta carta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <h2>✉️ Mi carta al Viejito Pascuero</h2>
      <p className="nota">Escribe 3 opciones de regalo que te gustaría recibir. Quien te tocó las verá antes de saber tu nombre.</p>
      <form onSubmit={enviar}>
        <label htmlFor="op1">Opción 1</label>
        <input id="op1" maxLength={200} required value={op1} onChange={e => setOp1(e.target.value)} />
        <label htmlFor="op2">Opción 2</label>
        <input id="op2" maxLength={200} required value={op2} onChange={e => setOp2(e.target.value)} />
        <label htmlFor="op3">Opción 3</label>
        <input id="op3" maxLength={200} required value={op3} onChange={e => setOp3(e.target.value)} />
        <label htmlFor="mensaje">Mensaje (opcional): talla, colores, gustos…</label>
        <textarea id="mensaje" maxLength={1000} value={mensaje} onChange={e => setMensaje(e.target.value)} />
        <button type="submit" className="verde">Enviar mi carta</button>
        {estado.texto && <div className={estado.tipo}>{estado.texto}</div>}
      </form>
    </motion.section>
  )
}
