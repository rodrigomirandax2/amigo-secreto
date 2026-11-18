// Un color de sello por familia, para reconocerlas en el árbol y en la lista.
export const COLOR_FAMILIA = ['#ff4d63', '#ffc94d', '#4ade80', '#7dd3fc', '#f0abfc', '#fb923c']
export const colorFamilia = (f: number) => COLOR_FAMILIA[(f - 1) % COLOR_FAMILIA.length]

/** "Familia de Emma", "Familia de Fran y Jorgito": se nombra por sus niños. */
export function nombreFamilia(personas: { familia: number; nombre: string; es_nino: boolean }[], familia: number) {
  const ninos = personas.filter(p => p.familia === familia && p.es_nino).map(p => p.nombre)
  if (ninos.length === 0) return `Familia ${familia}`
  return `Familia de ${ninos.length > 1 ? ninos.slice(0, -1).join(', ') + ' y ' + ninos.at(-1) : ninos[0]}`
}
