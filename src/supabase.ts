import { createClient } from '@supabase/supabase-js'
import { rpcDemo } from './demo'

// La clave publishable es pública por diseño: la seguridad está en las funciones de supabase.sql.
const sb = createClient(
  'https://wfyenympztusmnrhdzri.supabase.co',
  'sb_publishable_rne4kif7krBfRt4ttAwegA_BnnBP6aZ',
)

/** Sólo para pruebas: con ?demo en la URL se usan los datos de ejemplo de src/demo.ts. */
export const DEMO = new URLSearchParams(location.search).has('demo')

export async function rpc<T = void>(funcion: string, args: Record<string, unknown>): Promise<T> {
  if (DEMO) return rpcDemo(funcion) as T
  const { data, error } = await sb.rpc(funcion, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const textoError = (e: unknown) => (e instanceof Error ? e.message : String(e))

export interface Carta {
  opcion1: string | null
  opcion2: string | null
  opcion3: string | null
  mensaje: string | null
}

export interface Persona extends Carta {
  nombre: string
  descripcion: string
}

export interface Yo extends Persona {
  monto: string | null
  fecha: string | null
  sorteo_hecho: boolean
}

export interface CartaDe extends Persona {
  id: number
  familia: number
  es_nino: boolean
}

export interface ParticipanteAdmin extends Persona {
  id: number
  familia: number
  es_nino: boolean
  correo: string | null
  codigo: string
  actualizado: string | null
}

export interface DatosAdmin {
  config: { monto: string | null; fecha: string | null; sorteo_hecho: boolean }
  participantes: ParticipanteAdmin[]
}

export const quien = (p: Persona) => (p.descripcion ? `${p.nombre}, ${p.descripcion}` : p.nombre)
