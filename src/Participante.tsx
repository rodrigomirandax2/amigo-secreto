import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Hero, ILUSTRACION, lanzarConfeti } from './Decoracion'
import FotoNinos from './FotoNinos'
import Cartas from './Cartas'
import { DEMO, rpc, textoError, type Persona, type Yo } from './supabase'

interface Sesion { correo: string; codigo: string }
type Pestana = 'arbol' | 'amigo' | 'carta'
const CLAVE = 'amigoSecreto'
const entrada = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }

function leerSesion(): Sesion | null {
  if (DEMO) return null
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') } catch { return null }
}
function guardarSesion(s: Sesion | null) {
  if (DEMO) return
  try { s ? localStorage.setItem(CLAVE, JSON.stringify(s)) : localStorage.removeItem(CLAVE) } catch { /* sin storage */ }
}

export default function Participante() {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [yo, setYo] = useState<Yo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState<Pestana>('arbol')

  async function entrar(s: Sesion) {
    const datos = await rpc<Yo>('entrar', { p_correo: s.correo, p_codigo: s.codigo })
    guardarSesion(s)
    setSesion(s)
    setYo(datos)
    setPestana(datos.opcion1 ? 'arbol' : 'carta')
  }

  // Al guardar la primera carta se habilita "Mi amigo".
  function cartaGuardada(carta: Pick<Yo, 'opcion1' | 'opcion2' | 'opcion3' | 'mensaje'>) {
    const primera = !yo?.opcion1
    setYo(y => (y ? { ...y, ...carta } : y))
    if (primera) setPestana('amigo')
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

  if (cargando) return null

  if (!sesion || !yo) {
    return (
      <div className="contenedor">
        {DEMO && <div style={{ textAlign: 'center' }}><span className="aviso-demo">Modo demo</span></div>}
        <FotoNinos />
        <Entrar onEntrar={entrar} />
      </div>
    )
  }

  return (
    <div className="contenedor">
      <Hero titulo={`Hola, ${yo.nombre.split(' ')[0]}`} subtitulo={yo.descripcion || 'Bienvenido al #TeamNavideño'}>
        <div className="datos">
          {yo.monto && <span className="dato">💰 {yo.monto}</span>}
          {yo.fecha && <span className="dato">📅 {yo.fecha}</span>}
        </div>
        {DEMO && <span className="aviso-demo">Modo demo</span>}
      </Hero>

      {!yo.opcion1 ? (
        <motion.div {...entrada}>
          <section className="tarjeta aviso-carta">
            <img src={ILUSTRACION.carta} alt="" width={56} height={56} />
            <div>
              <h2>Primero, tu carta</h2>
              <p className="nota">Para descubrir a tu amigo secreto, antes escribe los 3 regalos que te gustaría recibir. Así quien te tocó sabrá qué regalarte.</p>
            </div>
          </section>
          <MiCarta sesion={sesion} inicial={yo} onGuardada={cartaGuardada} />
        </motion.div>
      ) : (
      <AnimatePresence mode="wait">
        {pestana === 'arbol' ? (
          <motion.div key="arbol" {...entrada}>
            <Cartas correo={sesion.correo} codigo={sesion.codigo} miNombre={yo.nombre} />
          </motion.div>
        ) : pestana === 'amigo' ? (
          <motion.div key="amigo" {...entrada}>
            <MiAmigo sesion={sesion} sorteoHecho={yo.sorteo_hecho} irACarta={() => setPestana('carta')} />
          </motion.div>
        ) : (
          <motion.div key="carta" {...entrada}>
            <MiCarta sesion={sesion} inicial={yo} onGuardada={cartaGuardada} />
          </motion.div>
        )}
      </AnimatePresence>
      )}

      <div style={{ textAlign: 'center' }}>
        <button className="enlace" onClick={salir}>Cerrar sesión</button>
      </div>

      {yo.opcion1 && <nav className="pestanas" aria-label="Secciones">
        {([['arbol', '🎄 Cartas'], ['amigo', '🎁 Mi amigo'], ['carta', '✉️ Mi carta']] as const).map(([id, texto]) => (
          <button key={id} className={`pestana ${pestana === id ? 'activa' : ''}`} onClick={() => setPestana(id)}>
            {pestana === id && <motion.span layoutId="pestana-activa" className="fondo-activo" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />}
            {texto}
          </button>
        ))}
      </nav>}
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
    <motion.section className="tarjeta" {...entrada} transition={{ delay: 0.2 }}>
      <div className="tarjeta-cabeza">
        <img src={ILUSTRACION.arbol} alt="" />
        <div>
          <h2>Entrar</h2>
          <p>Con tu correo y el código que te llegó.</p>
        </div>
      </div>
      <form onSubmit={enviar}>
        <label htmlFor="correo">Correo</label>
        <input id="correo" type="email" autoComplete="email" placeholder="tu@correo.cl" required={!DEMO} value={correo} onChange={e => setCorreo(e.target.value)} />
        <label htmlFor="codigo">Código de 4 dígitos</label>
        <input id="codigo" inputMode="numeric" maxLength={4} placeholder="••••" required={!DEMO} value={codigo} onChange={e => setCodigo(e.target.value)} />
        <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        {error && <div className="mensaje-estado error">{error}</div>}
      </form>
    </motion.section>
  )
}

function MiAmigo({ sesion, sorteoHecho, irACarta }: { sesion: Sesion; sorteoHecho: boolean; irACarta: () => void }) {
  const [amigo, setAmigo] = useState<Persona | null>(null)
  // Una vez abierto el regalo, queda abierto (en el demo, ya viene abierto).
  const [abierto, setAbierto] = useState(() => {
    if (DEMO) return new URLSearchParams(location.search).get('demo') !== 'sin-carta'
    try { return localStorage.getItem('amigoSecretoRevelado') === sesion.correo } catch { return false }
  })

  useEffect(() => {
    if (!sorteoHecho) return
    rpc<Persona | null>('mi_amigo', { p_correo: sesion.correo, p_codigo: sesion.codigo })
      .then(setAmigo)
      .catch(() => setAmigo(null))
  }, [sesion, sorteoHecho])

  function abrir() {
    if (abierto) return
    setAbierto(true)
    try { if (!DEMO) localStorage.setItem('amigoSecretoRevelado', sesion.correo) } catch { /* sin storage */ }
    setTimeout(lanzarConfeti, 250)
  }

  if (!amigo) {
    return (
      <section className="tarjeta" style={{ textAlign: 'center' }}>
        <img src={ILUSTRACION.copo} alt="" width={64} height={64} />
        <h2>El sorteo aún no se hace</h2>
        <p className="nota">Cuando se haga, aquí verás lo que le gustaría recibir a tu amigo secreto. Mientras tanto, escribe tu carta.</p>
        <button className="boton" onClick={irACarta}>Escribir mi carta</button>
      </section>
    )
  }

  const opciones = [amigo.opcion1, amigo.opcion2, amigo.opcion3].filter(Boolean) as string[]

  return (
    <section className="tarjeta">
      <div className="tarjeta-cabeza">
        <img src={ILUSTRACION.brillos} alt="" />
        <div>
          <h2>Tu amigo secreto</h2>
          <p>Esto es lo que le gustaría recibir</p>
        </div>
      </div>

      <ul className="opciones">
        {opciones.length === 0 && <li>Todavía no escribe su carta. Vuelve más tarde.</li>}
        {opciones.map((o, i) => (
          <motion.li key={o} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i + 0.1 }}>
            <span className="num">{i + 1}</span>{o}
          </motion.li>
        ))}
      </ul>
      {amigo.mensaje && <p className="cita">“{amigo.mensaje}”</p>}

      <div className="regalo-zona">
        <AnimatePresence mode="wait">
          {!abierto ? (
            <motion.div key="regalo" exit={{ scale: 1.6, opacity: 0, rotate: 12, transition: { duration: 0.35 } }}>
              <motion.button
                className="regalo"
                onClick={abrir}
                aria-label="Abrir el regalo y revelar quién es"
                animate={{ rotate: [0, 0, -7, 7, -4, 4, 0], y: [0, 0, -6, 0, -3, 0, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.6, 0.68, 0.76, 0.84, 0.92, 1] }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="regalo-halo" />
                <img src={ILUSTRACION.regalo} alt="" />
              </motion.button>
              <p className="pista">Toca el regalo para saber quién es</p>
            </motion.div>
          ) : (
            <motion.div
              key="nombre"
              className="revelado"
              initial={{ scale: 0.4, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
            >
              <img src={ILUSTRACION.fiesta} alt="" />
              <p className="le-regalas">Le regalas a</p>
              <p className="nombre">{amigo.nombre}</p>
              {amigo.descripcion && <p className="desc">{amigo.descripcion}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

function MiCarta({ sesion, inicial, onGuardada }: { sesion: Sesion; inicial: Yo; onGuardada: (c: Pick<Yo, 'opcion1' | 'opcion2' | 'opcion3' | 'mensaje'>) => void }) {
  const [opciones, setOpciones] = useState([inicial.opcion1 ?? '', inicial.opcion2 ?? '', inicial.opcion3 ?? ''])
  const [mensaje, setMensaje] = useState(inicial.mensaje ?? '')
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | ''; texto: string }>({ tipo: '', texto: '' })

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado({ tipo: '', texto: 'Enviando…' })
    try {
      await rpc('guardar_carta', {
        p_correo: sesion.correo, p_codigo: sesion.codigo,
        p_opcion1: opciones[0], p_opcion2: opciones[1], p_opcion3: opciones[2], p_mensaje: mensaje,
      })
      setEstado({ tipo: 'ok', texto: '¡Carta enviada al Viejito Pascuero! 🎅' })
      onGuardada({ opcion1: opciones[0].trim(), opcion2: opciones[1].trim(), opcion3: opciones[2].trim(), mensaje: mensaje.trim() })
    } catch (err) {
      setEstado({ tipo: 'error', texto: textoError(err) })
    }
  }

  return (
    <section className="tarjeta">
      <div className="tarjeta-cabeza">
        <img src={ILUSTRACION.carta} alt="" />
        <div>
          <h2>Mi carta</h2>
          <p>3 regalos que te gustaría recibir</p>
        </div>
      </div>
      <p className="nota">Quien te tocó verá estas opciones antes de saber tu nombre. Puedes cambiarlas cuando quieras.</p>
      <form onSubmit={enviar}>
        {opciones.map((valor, i) => (
          <div className="campo-numerado" key={i}>
            <span>{i + 1}</span>
            <input
              aria-label={`Opción ${i + 1}`}
              placeholder={['Ej: un libro de aventuras', 'Ej: algo para la cocina', 'Ej: un juego de mesa'][i]}
              maxLength={200}
              required
              value={valor}
              onChange={e => setOpciones(o => o.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </div>
        ))}
        <label htmlFor="mensaje">Algo más (opcional)</label>
        <textarea id="mensaje" maxLength={1000} placeholder="Talla, colores favoritos, lo que no te gusta…" value={mensaje} onChange={e => setMensaje(e.target.value)} />
        <button type="submit" className="boton">Enviar mi carta</button>
        {estado.texto && <div className={`mensaje-estado ${estado.tipo}`}>{estado.texto}</div>}
      </form>
    </section>
  )
}
