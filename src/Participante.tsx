import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Hero, ILUSTRACION, lanzarConfeti } from './Decoracion'
import FotoNinos from './FotoNinos'
import Modal from './Modal'
import { colorFamilia, nombreFamilia } from './colores'
import Cartas from './Cartas'
import { DEMO, rpc, textoError, type Persona, type Yo } from './supabase'

interface Sesion { correo: string; codigo: string }
type Pestana = 'arbol' | 'amigo' | 'carta'
const CLAVE = 'amigoSecreto'
// ?demo=regalo: entra solo y va directo al regalo cerrado, para probar la revelación.
const SOLO_REGALO = DEMO && new URLSearchParams(location.search).get('demo') === 'regalo'
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
    setPestana(SOLO_REGALO ? 'amigo' : datos.opcion1 ? 'arbol' : 'carta')
  }

  // Al guardar la primera carta se habilita "Mi amigo".
  function cartaGuardada(carta: Pick<Yo, 'opcion1' | 'opcion2' | 'opcion3' | 'mensaje'>) {
    const primera = !yo?.opcion1
    setYo(y => (y ? { ...y, ...carta } : y))
    if (primera) setPestana('amigo')
  }

  useEffect(() => {
    const previa = SOLO_REGALO ? { correo: 'demo@ejemplo.cl', codigo: '0000' } : leerSesion()
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


interface Nombre { id: number; nombre: string; descripcion: string; familia: number; es_nino: boolean }

/**
 * Se entra tocando tu nombre y escribiendo el código: nadie tiene que tipear su correo.
 * Si el link trae ?correo= (el de la invitación), entra directo con el correo ya puesto.
 */
function Entrar({ onEntrar }: { onEntrar: (s: Sesion) => Promise<void> }) {
  const correoUrl = new URLSearchParams(location.search).get('correo') ?? ''
  const [modo, setModo] = useState<'nombre' | 'correo'>(correoUrl ? 'correo' : 'nombre')
  const [nombres, setNombres] = useState<Nombre[] | null>(null)
  const [elegido, setElegido] = useState<Nombre | null>(null)
  const [correo, setCorreo] = useState(correoUrl)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    rpc<Nombre[]>('nombres', {}).then(n => setNombres(n ?? [])).catch(() => { setNombres([]); setModo('correo') })
  }, [])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const c = modo === 'nombre' && elegido
        ? await rpc<string>('correo_por_codigo', { p_id: elegido.id, p_codigo: codigo.trim() })
        : correo.trim()
      await onEntrar({ correo: c, codigo: codigo.trim() })
    }
    catch (err) { setError(textoError(err)) }
    finally { setEnviando(false) }
  }

  const familias = [...new Set((nombres ?? []).map(n => n.familia))]

  return (
    <motion.section className="tarjeta" {...entrada} transition={{ delay: 0.2 }}>
      <div className="tarjeta-cabeza">
        <img src={ILUSTRACION.arbol} alt="" />
        <div>
          <h2>Entrar</h2>
          <p>{modo === 'nombre' ? 'Toca tu nombre y escribe tu código' : 'Con tu correo y el código que te llegó'}</p>
        </div>
      </div>
      <form onSubmit={enviar}>
        {modo === 'nombre' ? (
          <>
            {!nombres && <p className="nota">Cargando nombres…</p>}
            {familias.map(f => (
              <div key={f} className="grupo-nombres">
                <p className="familia-titulo"><i className="familia-punto" style={{ background: colorFamilia(f) }} />{nombreFamilia(nombres!, f)}</p>
                <div className="nombres">
                  {nombres!.filter(n => n.familia === f).map(n => (
                    <button
                      type="button"
                      key={n.id}
                      className={`nombre-chip ${elegido?.id === n.id ? 'elegido' : ''}`}
                      aria-pressed={elegido?.id === n.id}
                      onClick={() => { setElegido(n); setCodigo(''); setError('') }}
                    >
                      {n.nombre}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <label htmlFor="correo">Correo</label>
            <input id="correo" type="email" autoComplete="email" placeholder="tu@correo.cl" required value={correo} onChange={e => setCorreo(e.target.value)} />
          </>
        )}

        {modo === 'correo' && (
          <>
            <label htmlFor="codigo">Código de 4 dígitos</label>
            <input id="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="••••" required value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))} />
            <button type="submit" className="boton" disabled={enviando || codigo.length < 4}>{enviando ? 'Entrando…' : 'Entrar'}</button>
            {error && <div className="mensaje-estado error">{error}</div>}
          </>
        )}
      </form>

      <Modal abierto={modo === 'nombre' && !!elegido} onCerrar={() => { setElegido(null); setCodigo(''); setError('') }} etiqueta="Escribe tu código">
        {elegido && (
          <form onSubmit={enviar} className="modal-codigo">
            <span className="avatar grande" style={{ background: colorFamilia(elegido.familia) }}>{elegido.nombre[0]}</span>
            <h2>Hola, {elegido.nombre.split(' ')[0]} 👋</h2>
            <p className="nota">Escribe el código de 4 dígitos que te llegó por correo.</p>
            <input
              className="codigo-grande"
              aria-label="Código de 4 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={4}
              placeholder="• • • •"
              value={codigo}
              onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); setError('') }}
            />
            {error && <div className="mensaje-estado error">{error}</div>}
            <button type="submit" className="boton" disabled={enviando || codigo.length < 4}>{enviando ? 'Entrando…' : 'Entrar'}</button>
            <button type="button" className="enlace" onClick={() => { setElegido(null); setCodigo(''); setError('') }}>No soy yo</button>
          </form>
        )}
      </Modal>
      <div style={{ textAlign: 'center' }}>
        <button type="button" className="enlace" onClick={() => { setModo(modo === 'nombre' ? 'correo' : 'nombre'); setError('') }}>
          {modo === 'nombre' ? 'Prefiero entrar con mi correo' : 'Entrar eligiendo mi nombre'}
        </button>
      </div>
    </motion.section>
  )
}

function MiAmigo({ sesion, sorteoHecho, irACarta }: { sesion: Sesion; sorteoHecho: boolean; irACarta: () => void }) {
  const [amigo, setAmigo] = useState<Persona | null>(null)
  // Una vez abierto el regalo, queda abierto (en el demo, ya viene abierto).
  const [abierto, setAbierto] = useState(() => {
    if (DEMO) return !SOLO_REGALO && new URLSearchParams(location.search).get('demo') !== 'sin-carta'
    try { return localStorage.getItem('amigoSecretoRevelado') === sesion.correo } catch { return false }
  })

  useEffect(() => {
    if (!sorteoHecho) return
    rpc<Persona | null>('mi_amigo', { p_correo: sesion.correo, p_codigo: sesion.codigo })
      .then(setAmigo)
      .catch(() => setAmigo(null))
  }, [sesion, sorteoHecho])

  // Cuenta regresiva 3, 2, 1 antes de abrir el regalo.
  const [cuenta, setCuenta] = useState<number | null>(null)

  function abrir() {
    if (abierto || cuenta !== null) return
    setCuenta(3)
  }

  useEffect(() => {
    if (cuenta === null) return
    navigator.vibrate?.(cuenta > 0 ? 40 : [80, 40, 120])
    if (cuenta > 0) {
      const t = setTimeout(() => setCuenta(cuenta - 1), 950)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setCuenta(null)
      setAbierto(true)
      try { if (!DEMO) localStorage.setItem('amigoSecretoRevelado', sesion.correo) } catch { /* sin storage */ }
      setTimeout(lanzarConfeti, 250)
    }, 450)
    return () => clearTimeout(t)
  }, [cuenta, sesion.correo])

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

  // Sin carta de tu amigo no hay pistas: el nombre espera hasta que la escriba.
  if (opciones.length === 0) {
    return (
      <section className="tarjeta" style={{ textAlign: 'center' }}>
        <img src={ILUSTRACION.carta} alt="" width={64} height={64} />
        <h2>Tu amigo aún no escribe su carta</h2>
        <p className="nota">Cuando la escriba, aquí verás los 3 regalos que le gustaría recibir y podrás descubrir quién es. Vuelve más tarde 🎄</p>
      </section>
    )
  }

  return (
    <section className="tarjeta">
      <div className="tarjeta-cabeza centrada">
        <img src={ILUSTRACION.brillos} alt="" />
        <div>
          <h2>Tu amigo secreto</h2>
          <p>Esto es lo que le gustaría recibir</p>
        </div>
      </div>

      <ul className="opciones">
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
                key={cuenta === null ? 'quieto' : 'cuenta'}
                className="regalo"
                onClick={abrir}
                aria-label="Abrir el regalo y revelar quién es"
                // En la cuenta regresiva el regalo tiembla cada vez más fuerte.
                animate={cuenta === null
                  ? { rotate: [0, 0, -7, 7, -4, 4, 0], y: [0, 0, -6, 0, -3, 0, 0], scale: 1 }
                  : { rotate: [-1, 1].map(x => x * (4 + (3 - cuenta) * 5)), y: [0, -4 - (3 - cuenta) * 3], scale: 1 + (3 - cuenta) * 0.08 }}
                transition={cuenta === null
                  ? { duration: 2.4, repeat: Infinity, times: [0, 0.6, 0.68, 0.76, 0.84, 0.92, 1] }
                  : { duration: 0.12 - (3 - cuenta) * 0.025, repeat: Infinity, repeatType: 'mirror', scale: { type: 'spring', bounce: 0.5 } }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="regalo-halo" />
                <img src={ILUSTRACION.regalo} alt="" />
                <AnimatePresence>
                  {cuenta !== null && cuenta > 0 && (
                    <motion.span
                      key={cuenta}
                      className="cuenta-numero"
                      initial={{ scale: 2.4, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.4, opacity: 0, y: -30 }}
                      transition={{ type: 'spring', bounce: 0.55, duration: 0.5 }}
                    >
                      {cuenta}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <AnimatePresence mode="wait">
                <motion.p
                  key={cuenta ?? 'pista'}
                  className={`pista ${cuenta !== null ? 'pista-cuenta' : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {cuenta === null ? 'Toca el regalo para saber quién es'
                    : cuenta === 3 ? '¿Quién será…? 🤔'
                    : cuenta === 2 ? 'Redoble de tambores 🥁'
                    : cuenta === 1 ? '¡Aquí viene! ✨'
                    : '¡Ábrelo! 🎁'}
                </motion.p>
              </AnimatePresence>
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
  // Una vez enviada, las 3 opciones quedan fijas: sólo el mensaje se puede cambiar.
  const enviada = !!inicial.opcion1

  const [confirmando, setConfirmando] = useState(false)

  function pedirEnvio(e: React.FormEvent) {
    e.preventDefault()
    if (enviada) guardar()
    else setConfirmando(true)
  }

  async function guardar() {
    setConfirmando(false)
    setEstado({ tipo: '', texto: 'Enviando…' })
    try {
      await rpc('guardar_carta', {
        p_correo: sesion.correo, p_codigo: sesion.codigo,
        p_opcion1: opciones[0], p_opcion2: opciones[1], p_opcion3: opciones[2], p_mensaje: mensaje,
      })
      setEstado({ tipo: 'ok', texto: enviada ? 'Mensaje guardado ✓' : '¡Carta enviada al Viejito Pascuero! 🎅' })
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
      {enviada ? (
        <>
          <p className="nota">🔒 Tus 3 opciones ya están enviadas. Puedes cambiar sólo el mensaje.</p>
          <ul className="opciones">
            {opciones.map((o, i) => <li key={i}><span className="num">{i + 1}</span>{o}</li>)}
          </ul>
        </>
      ) : (
        <p className="nota">Quien te tocó verá estas opciones antes de saber tu nombre. Piénsalas bien: una vez enviada la carta, sólo podrás cambiar el mensaje.</p>
      )}
      <form onSubmit={pedirEnvio}>
        {!enviada && opciones.map((valor, i) => (
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
        <button type="submit" className="boton">{enviada ? 'Guardar mensaje' : 'Enviar mi carta'}</button>
        {estado.texto && <div className={`mensaje-estado ${estado.tipo}`}>{estado.texto}</div>}
      </form>

      <Modal abierto={confirmando} onCerrar={() => setConfirmando(false)} etiqueta="Confirmar envío de la carta">
        <div className="modal-confirmar">
          <img src={ILUSTRACION.carta} alt="" width={64} height={64} />
          <h2>¿Lista tu carta?</h2>
          <p className="nota">Así la verá el Viejito Pascuero:</p>
          <ul className="opciones">
            {opciones.map((o, i) => <li key={i}><span className="num">{i + 1}</span>{o.trim()}</li>)}
          </ul>
          {mensaje.trim() && <p className="cita">“{mensaje.trim()}”</p>}
          <p className="aviso-candado">🔒 Una vez enviada, los 3 regalos quedan fijos. El mensaje lo puedes cambiar cuando quieras.</p>
          <button className="boton" onClick={guardar}>Sí, enviar mi carta 🎅</button>
          <button className="boton fantasma" onClick={() => setConfirmando(false)}>Quiero revisarla</button>
        </div>
      </Modal>
    </section>
  )
}
