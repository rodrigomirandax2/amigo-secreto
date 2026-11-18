import { useState } from 'react'
import { Encabezado } from './Decoracion'
import { quien, rpc, textoError, type DatosAdmin, type ParticipanteAdmin } from './supabase'

type Estado = { tipo: 'ok' | 'error' | ''; texto: string }
const vacio: Estado = { tipo: '', texto: '' }

export default function Admin() {
  const [clave, setClave] = useState('')
  const [datos, setDatos] = useState<DatosAdmin | null>(null)
  const [error, setError] = useState('')

  async function cargar(c = clave) {
    setDatos(await rpc<DatosAdmin>('admin_listar', { p_clave: c }))
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try { await cargar() } catch (err) { setError(textoError(err)) }
  }

  return (
    <div className="contenedor">
      <Encabezado titulo="Administración" subtitulo="Correos, códigos, cartas y sorteo" />
      {!datos ? (
        <section className="tarjeta">
          <form onSubmit={entrar}>
            <label htmlFor="clave">Clave de administrador</label>
            <input id="clave" type="password" required value={clave} onChange={e => setClave(e.target.value)} />
            <button type="submit">Entrar</button>
            {error && <div className="error">{error}</div>}
          </form>
        </section>
      ) : (
        <>
          <DatosIntercambio clave={clave} inicial={datos.config} />
          <Sorteo clave={clave} hecho={datos.config.sorteo_hecho} onCambio={() => cargar()} />
          <Participantes lista={datos.participantes ?? []} clave={clave} />
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
      <h2>Datos del intercambio</h2>
      <label htmlFor="monto">Monto máximo</label>
      <input id="monto" placeholder="Ej: $15.000" value={monto} onChange={e => setMonto(e.target.value)} />
      <label htmlFor="fecha">Fecha</label>
      <input id="fecha" placeholder="Ej: 24 de diciembre" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button onClick={guardar}>Guardar</button>
      {estado.texto && <div className={estado.tipo}>{estado.texto}</div>}
    </section>
  )
}

function Sorteo({ clave, hecho, onCambio }: { clave: string; hecho: boolean; onCambio: () => Promise<void> }) {
  const [ninosConNinos, setNinosConNinos] = useState(false)
  const [estado, setEstado] = useState<Estado>(vacio)

  async function ejecutar(funcion: string, args: Record<string, unknown>, ok: string) {
    try {
      await rpc(funcion, { p_clave: clave, ...args })
      setEstado({ tipo: 'ok', texto: ok })
      await onCambio()
    } catch (err) { setEstado({ tipo: 'error', texto: textoError(err) }) }
  }

  return (
    <section className="tarjeta">
      <h2>Sorteo</h2>
      <p className="nota">{hecho ? '✅ El sorteo ya está hecho.' : 'El sorteo todavía no se hace.'}</p>
      <label className="check">
        <input type="checkbox" checked={ninosConNinos} onChange={e => setNinosConNinos(e.target.checked)} />
        Niños sólo entre niños y adultos sólo entre adultos
      </label>
      <p className="nota">Nadie le regala a alguien de su propia familia. El resultado no se muestra aquí: cada uno ve el suyo.</p>
      <button onClick={() => confirm('¿Hacer el sorteo? Si ya había uno, se reemplaza.')
        && ejecutar('admin_sortear', { p_ninos_con_ninos: ninosConNinos }, '¡Sorteo hecho! Ya pueden ver a su amigo secreto.')}>
        Hacer sorteo
      </button>
      <button className="secundario" onClick={() => confirm('¿Anular el sorteo? Nadie verá a su amigo secreto hasta que sortees de nuevo.')
        && ejecutar('admin_anular_sorteo', {}, 'Sorteo anulado.')}>
        Anular sorteo
      </button>
      {estado.texto && <div className={estado.tipo}>{estado.texto}</div>}
    </section>
  )
}

function Participantes({ lista, clave }: { lista: ParticipanteAdmin[]; clave: string }) {
  const conCarta = lista.filter(p => p.opcion1).length
  const conCorreo = lista.filter(p => p.correo).length
  return (
    <section className="tarjeta">
      <h2>Participantes</h2>
      <p className="nota">{lista.length} personas · {conCorreo} con correo · {conCarta} con carta</p>
      {lista.map(p => <Fila key={p.id} p={p} clave={clave} />)}
    </section>
  )
}

function Fila({ p, clave }: { p: ParticipanteAdmin; clave: string }) {
  const [correo, setCorreo] = useState(p.correo ?? '')
  const [guardado, setGuardado] = useState('Guardar')
  const [copiado, setCopiado] = useState('Copiar invitación')

  async function guardar() {
    try {
      await rpc('admin_guardar_correo', { p_clave: clave, p_id: p.id, p_correo: correo })
      setGuardado('✓')
    } catch (err) { setGuardado('Error'); alert(textoError(err)) }
  }

  async function copiar() {
    const link = `${location.origin}${import.meta.env.BASE_URL}?correo=${encodeURIComponent(correo)}`
    const texto = `🎄 Amigo Secreto\nEntra aquí: ${link}\nTu correo: ${correo}\nTu código: ${p.codigo}`
    try { await navigator.clipboard.writeText(texto); setCopiado('¡Copiada!') }
    catch { prompt('Copia este texto:', texto) }
  }

  const opciones = [p.opcion1, p.opcion2, p.opcion3].filter(Boolean) as string[]

  return (
    <div className="fila">
      <div className="cabeza">
        <strong>{quien(p)}</strong>
        <span className={`chip ${p.opcion1 ? 'si' : 'no'}`}>{p.opcion1 ? 'con carta' : 'sin carta'}</span>
      </div>
      <div className="nota">Familia {p.familia} · código <span className="codigo">{p.codigo}</span></div>
      <div className="linea">
        <input type="email" placeholder="correo" value={correo} onChange={e => { setCorreo(e.target.value); setGuardado('Guardar') }} />
        <button onClick={guardar}>{guardado}</button>
      </div>
      <button className="secundario" style={{ marginTop: 8 }} onClick={copiar}>{copiado}</button>
      {opciones.length > 0 && (
        <details>
          <summary>Ver carta</summary>
          <ul className="opciones">{opciones.map(o => <li key={o}>{o}</li>)}</ul>
          {p.mensaje && <p className="nota">“{p.mensaje}”</p>}
        </details>
      )}
    </div>
  )
}
