/**
 * Una inicial por persona; si dos comparten inicial, llevan dos letras.
 * - Nombre compuesto: inicial de cada palabra (Isabella Miranda → IM, Isabella Jaramillo → IJ).
 * - Nombre simple: primera letra + la siguiente que no esté tomada (Camila → Ca, Carla → Cr).
 */
export function iniciales(personas: { id: number; nombre: string }[]): Map<number, string> {
  const primera = (n: string) => n.trim()[0]?.toUpperCase() ?? '?'
  const cuenta = new Map<string, number>()
  personas.forEach(p => cuenta.set(primera(p.nombre), (cuenta.get(primera(p.nombre)) ?? 0) + 1))

  const resultado = new Map<number, string>()
  const usadas = new Set<string>()

  // Primero los únicos y los compuestos, que tienen su sigla natural.
  for (const p of personas) {
    const inicial = primera(p.nombre)
    const palabras = p.nombre.trim().split(/\s+/)
    if (cuenta.get(inicial) === 1) resultado.set(p.id, inicial)
    else if (palabras.length > 1) resultado.set(p.id, palabras.slice(0, 2).map(primera).join(''))
    else continue
    usadas.add(resultado.get(p.id)!)
  }

  for (const p of personas) {
    if (resultado.has(p.id)) continue
    const n = p.nombre.trim()
    let sigla = primera(n)
    for (let k = 1; k < n.length; k++) {
      const candidata = primera(n) + n[k].toLowerCase()
      if (/[a-záéíóúñ]/i.test(n[k]) && !usadas.has(candidata)) { sigla = candidata; break }
    }
    resultado.set(p.id, sigla)
    usadas.add(sigla)
  }
  return resultado
}
