import { useEffect, useState } from 'react'
import { Hero, ILUSTRACION } from './Decoracion'
import { nombreFamilia } from './colores'
import { quien, rpc, textoError, type DatosAdmin, type ParticipanteAdmin } from './supabase'

type Estado = { tipo: 'ok' | 'error' | ''; texto: string }
const vacio: Estado = { tipo: '', texto: '' }

function Cabeza({ icono, titulo, sub }: { icono: string; titulo: string; sub?: string }) {
  return (
    <div className="tarjeta-cabeza">
      <img src={icono} alt="" />
      <div>
        <h2>{titulo}</h2>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  )
}

// La sesión del panel queda guardada en este navegador hasta "Cerrar sesión".
const CLAVE_SESION = 'amigoSecretoAdmin'
function leerClave() { try { return localStorage.getItem(CLAVE_SESION) ?? '' } catch { return '' } }
function guardarClave(c: string | null) {
  try { c === null ? localStorage.removeItem(CLAVE_SESION) : localStorage.setItem(CLAVE_SESION, c) } catch { /* sin storage */ }
}

export default function Admin() {
  const [clave, setClave] = useState(leerClave)
  const [datos, setDatos] = useState<DatosAdmin | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(() => !!leerClave())

  async function cargar(c = clave) {
    setDatos(await rpc<DatosAdmin>('admin_listar', { p_clave: c }))
  }

  useEffect(() => {
    const guardada = leerClave()
    if (!guardada) return
    cargar(guardada).catch(() => guardarClave(null)).finally(() => setCargando(false))
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try { await cargar(); guardarClave(clave) } catch (err) { setError(textoError(err)) }
  }

  function salir() {
    guardarClave(null)
    setClave('')
    setDatos(null)
  }

  if (cargando) return null

  return (
    <div className="contenedor">
      <Hero titulo="Panel del Pascuero" subtitulo="Correos, códigos, cartas y sorteo">
      </Hero>
      {!datos ? (
        <section className="tarjeta">
          <Cabeza icono={ILUSTRACION.arbol} titulo="Administrador" sub="Sólo para quien organiza" />
          <form onSubmit={entrar}>
            <label htmlFor="clave">Clave</label>
            <input id="clave" type="password" required value={clave} onChange={e => setClave(e.target.value)} />
            <button type="submit" className="boton">Entrar</button>
            {error && <div className="mensaje-estado error">{error}</div>}
          </form>
        </section>
      ) : (
        <>
          <Sorteo clave={clave} datos={datos} onCambio={() => cargar()} />
          <DatosIntercambio clave={clave} inicial={datos.config} />
          <Participantes lista={datos.participantes ?? []} clave={clave} config={datos.config} />
          <div style={{ textAlign: 'center' }}>
            <button className="enlace" onClick={salir}>Cerrar sesión</button>
          </div>
        </>
      )}
    </div>
  )
}

function DatosIntercambio({ clave, inicial }: { clave: string; inicial: DatosAdmin['config'] }) {
  const [monto, setMonto] = useState(inicial.monto ?? '')
  const [fecha, setFecha] = useState(inicial.fecha ?? '')
  const [estado, setEstado] = useState<Estado>(vacio)

  async function guardar() {
    try {
      await rpc('admin_guardar_config', { p_clave: clave, p_monto: monto, p_fecha: fecha })
      setEstado({ tipo: 'ok', texto: 'Guardado' })
    } catch (err) { setEstado({ tipo: 'error', texto: textoError(err) }) }
  }

  return (
    <section className="tarjeta">
      <Cabeza icono={ILUSTRACION.brillos} titulo="El intercambio" sub="Lo ven todos al entrar" />
      <label htmlFor="monto">Monto máximo</label>
      <input id="monto" placeholder="Ej: $15.000" value={monto} onChange={e => setMonto(e.target.value)} />
      <label htmlFor="fecha">Fecha</label>
      <input id="fecha" placeholder="Ej: 24 de diciembre" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button className="boton fantasma" onClick={guardar}>Guardar</button>
      {estado.texto && <div className={`mensaje-estado ${estado.tipo}`}>{estado.texto}</div>}
    </section>
  )
}

function Sorteo({ clave, datos, onCambio }: { clave: string; datos: DatosAdmin; onCambio: () => Promise<void> }) {
  const [ninosConNinos, setNinosConNinos] = useState(false)
  const [estado, setEstado] = useState<Estado>(vacio)
  const lista = datos.participantes ?? []
  const hecho = datos.config.sorteo_hecho

  async function ejecutar(funcion: string, args: Record<string, unknown>, ok: string) {
    try {
      await rpc(funcion, { p_clave: clave, ...args })
      setEstado({ tipo: 'ok', texto: ok })
      await onCambio()
    } catch (err) { setEstado({ tipo: 'error', texto: textoError(err) }) }
  }

  return (
    <section className="tarjeta">
      <Cabeza icono={ILUSTRACION.regalo} titulo="Sorteo" sub={hecho ? '✅ Ya está hecho' : 'Todavía no se hace'} />
      <div className="resumen">
        <div><strong>{lista.length}</strong><span>personas</span></div>
        <div><strong>{lista.filter(p => p.correo).length}</strong><span>con correo</span></div>
        <div><strong>{lista.filter(p => p.opcion1).length}</strong><span>con carta</span></div>
      </div>
      <label className="check">
        <input type="checkbox" checked={ninosConNinos} onChange={e => setNinosConNinos(e.target.checked)} />
        Niños sólo entre niños
      </label>
      <p className="nota">Nadie le regala a su propia familia. El resultado no se muestra aquí: cada uno ve el suyo.</p>
      <button className="boton" onClick={() => confirm('¿Hacer el sorteo? Si ya había uno, se reemplaza.')
        && ejecutar('admin_sortear', { p_ninos_con_ninos: ninosConNinos }, '¡Sorteo hecho! Ya pueden ver a su amigo secreto.')}>
        {hecho ? 'Volver a sortear' : 'Hacer sorteo'}
      </button>
      {hecho && (
        <button className="boton fantasma" onClick={() => confirm('¿Anular el sorteo? Nadie verá a su amigo secreto hasta que sortees de nuevo.')
          && ejecutar('admin_anular_sorteo', {}, 'Sorteo anulado.')}>
          Anular sorteo
        </button>
      )}
      {estado.texto && <div className={`mensaje-estado ${estado.tipo}`}>{estado.texto}</div>}
    </section>
  )
}

function Participantes({ lista, clave, config }: { lista: ParticipanteAdmin[]; clave: string; config: DatosAdmin["config"] }) {
  const familias = [...new Set(lista.map(p => p.familia))]
  return (
    <section className="tarjeta">
      <Cabeza icono={ILUSTRACION.carta} titulo="Participantes" sub="Correo, código y carta de cada uno" />
      {familias.map(f => (
        <div key={f}>
          <p className="familia-titulo">{nombreFamilia(lista, f)}</p>
          {lista.filter(p => p.familia === f).map(p => <Fila key={p.id} p={p} clave={clave} config={config} />)}
        </div>
      ))}
    </section>
  )
}

type Config = DatosAdmin['config']

function invitacion(p: ParticipanteAdmin, correo: string, config: Config) {
  const link = `${location.origin}${import.meta.env.BASE_URL}?correo=${encodeURIComponent(correo.trim())}`
  const datos = [config.monto && `💰 Monto máximo: ${config.monto}`, config.fecha && `📅 Intercambio: ${config.fecha}`].filter(Boolean)
  return [
    `¡Hola, ${p.nombre}! 🎅`,
    '',
    'Ya se hizo el sorteo del amigo secreto del #TeamNavideño.',
    'Entra, escribe tu carta con 3 regalos que te gustaría recibir y descubre a quién le regalas tú.',
    '',
    `👉 ${link}`,
    `Tu correo: ${correo.trim()}`,
    `Tu código: ${p.codigo}`,
    ...(datos.length ? ['', ...datos] : []),
    '',
    '¡No le cuentes a nadie quién te tocó! 🤫',
    '#TeamNavideño',
  ].join('\n')
}

// Recuerda en este navegador a quién ya se le abrió el correo.
const CLAVE_ENVIADOS = 'amigoSecretoCorreos'
function leerEnviados(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_ENVIADOS) ?? '[]')) } catch { return new Set() }
}
function marcarEnviado(id: number) {
  try { localStorage.setItem(CLAVE_ENVIADOS, JSON.stringify([...leerEnviados().add(id)])) } catch { /* sin storage */ }
}

function Fila({ p, clave, config }: { p: ParticipanteAdmin; clave: string; config: Config }) {
  const [correo, setCorreo] = useState(p.correo ?? '')
  const [guardado, setGuardado] = useState('Guardar')
  const [copiado, setCopiado] = useState('Copiar invitación')

  async function guardar() {
    try {
      await rpc('admin_guardar_correo', { p_clave: clave, p_id: p.id, p_correo: correo })
      setGuardado('✓')
    } catch (err) { setGuardado('Error'); alert(textoError(err)) }
  }

  const [enviado, setEnviado] = useState(() => leerEnviados().has(p.id))

  async function copiar() {
    const texto = invitacion(p, correo, config)
    try { await navigator.clipboard.writeText(texto); setCopiado('¡Copiada!') }
    catch { prompt('Copia este texto:', texto) }
  }

  // Abre la app de correo con todo escrito: sólo falta apretar Enviar.
  function enviarCorreo() {
    const asunto = `🎄 #TeamNavideño: ya está el sorteo del amigo secreto`
    // Gmail web con el correo escrito: funciona aunque el equipo no tenga app de correo configurada.
    const url = 'https://mail.google.com/mail/?view=cm&fs=1'
      + `&to=${encodeURIComponent(correo.trim())}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(invitacion(p, correo, config))}`
    window.open(url, '_blank', 'noopener')
    marcarEnviado(p.id)
    setEnviado(true)
  }

  const opciones = [p.opcion1, p.opcion2, p.opcion3].filter(Boolean) as string[]

  return (
    <div className="fila">
      <div className="cabeza">
        <div>
          <strong>{p.nombre}</strong>
          <div className="sub">{p.descripcion || (p.es_nino ? 'niño/a' : '')} · código <span className="codigo">{p.codigo}</span></div>
        </div>
        <span className={`chip ${p.opcion1 ? 'si' : 'no'}`}>{p.opcion1 ? 'con carta' : 'sin carta'}</span>
      </div>
      <div className="linea">
        <input type="email" placeholder="correo" aria-label={`Correo de ${quien(p)}`} value={correo} onChange={e => { setCorreo(e.target.value); setGuardado('Guardar') }} />
        <button className="boton chico" onClick={guardar}>{guardado}</button>
      </div>
      <div className="acciones-fila">
        <button className="boton chico" onClick={enviarCorreo} disabled={!correo.trim()}>{enviado ? '✓ Gmail abierto · reenviar' : '✉️ Enviar por Gmail'}</button>
        <button className="boton fantasma chico" onClick={copiar} disabled={!correo.trim()}>{copiado === 'Copiar invitación' ? '📋 Copiar' : copiado}</button>
      </div>
      {opciones.length > 0 && (
        <details>
          <summary>Ver carta</summary>
          <ul className="opciones">{opciones.map((o, i) => <li key={o}><span className="num">{i + 1}</span>{o}</li>)}</ul>
          {p.mensaje && <p className="cita">“{p.mensaje}”</p>}
        </details>
      )}
    </div>
  )
}
