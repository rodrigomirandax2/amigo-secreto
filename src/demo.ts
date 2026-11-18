// Datos de ejemplo para ver la app sin base de datos (?demo en la URL).

const familias: [string, string, number, boolean][] = [
  ['Rodrigo', 'papá de Isabella Miranda', 1, false], ['Camila', 'mamá de Isabella Miranda', 1, false], ['Isabella Miranda', '', 1, true],
  ['Alejandro', 'papá de Isabella Jaramillo', 2, false], ['Cristina', 'mamá de Isabella Jaramillo', 2, false], ['Isabella Jaramillo', '', 2, true],
  ['Peter', 'papá de Emma', 3, false], ['Leslie', 'mamá de Emma', 3, false], ['Emma', '', 3, true],
  ['Diego', 'papá de Maxi', 4, false], ['Carla', 'mamá de Maxi', 4, false], ['Maxi', '', 4, true],
  ['Boris', 'papá de Benja', 5, false], ['Magda', 'mamá de Benja', 5, false], ['Benja', '', 5, true],
  ['Jorge', 'papá de Fran y Jorgito', 6, false], ['Waleska', 'mamá de Fran y Jorgito', 6, false], ['Fran', '', 6, true], ['Jorgito', '', 6, true],
]

const conCarta = new Set([1, 3, 5, 8, 12, 15, 18])

const ideas = [
  ['Un libro de cocina', 'Audífonos inalámbricos', 'Una planta para la casa', 'Me gusta el azul'],
  ['Una taza grande', 'Chocolates amargos', 'Un pijama abrigado', 'Talla M'],
  ['Un set de Lego', 'Plasticina', 'Un peluche de unicornio', 'Me encanta el morado 💜'],
  ['Un vino tinto', 'Un juego de mesa', 'Calcetines chistosos', ''],
  ['Una vela aromática', 'Un cuaderno bonito', 'Aros', 'Nada de perfumes, porfa'],
  ['Una pelota de fútbol', 'Un autito a control remoto', 'Lápices de colores', 'Soy del Colo-Colo ⚽'],
]


const sinCarta = new URLSearchParams(location.search).get('demo') === 'sin-carta'

const inicio = Date.now()

export function rpcDemo(funcion: string): unknown {
  switch (funcion) {
    case 'entrar':
      return {
        nombre: 'Rodrigo', descripcion: 'papá de Isabella Miranda',
        // ?demo = ya escribió su carta (entra al árbol). ?demo=sin-carta = obliga a escribirla primero.
        ...(sinCarta
          ? { opcion1: null, opcion2: null, opcion3: null, mensaje: null }
          : { opcion1: 'Un libro de cocina', opcion2: 'Audífonos inalámbricos', opcion3: 'Una planta para la casa', mensaje: 'Me gusta el azul' }), monto: '$15.000', fecha: 'Martes 24 de diciembre', sorteo_hecho: true,
      }
    case 'mi_amigo':
      // ?demo=amigo-sin-carta: tu amigo todavía no escribe la suya.
      if (new URLSearchParams(location.search).get('demo') === 'amigo-sin-carta')
        return { nombre: 'Maxi', descripcion: '', opcion1: null, opcion2: null, opcion3: null, mensaje: null }
      return {
        nombre: 'Maxi', descripcion: '',
        opcion1: 'Un set de Lego de dinosaurios', opcion2: 'Una pelota de fútbol', opcion3: 'Lápices de colores y un cuaderno de dibujo',
        mensaje: 'Me encantan los dinosaurios y el color verde 🦖',
      }
    case 'nombres':
      return familias.map(([nombre, descripcion, familia, es_nino], i) => ({ id: i + 1, nombre, descripcion, familia, es_nino }))
    case 'correo_por_codigo':
      return 'demo@ejemplo.cl'
    case 'cartas':
      return familias.map(([nombre, descripcion, familia, es_nino], i) => {
        // A los 12 segundos de entrar "llega" la carta de Leslie, para ver el aviso.
        const tiene = (i !== 0 && i % 4 !== 3) || (i === 7 && Date.now() - inicio > 12_000)
        const [o1, o2, o3, m] = ideas[i % ideas.length]
        return {
          id: i + 1, nombre, descripcion, familia, es_nino,
          opcion1: tiene ? o1 : null, opcion2: tiene ? o2 : null, opcion3: tiene ? o3 : null, mensaje: tiene ? m : null,
        }
      })
    case 'admin_listar':
      return {
        config: { monto: '$15.000', fecha: 'Martes 24 de diciembre', sorteo_hecho: false },
        participantes: familias.map(([nombre, descripcion, familia, es_nino], i) => ({
          id: i + 1, nombre, descripcion, familia, es_nino,
          correo: i % 3 === 2 ? null : `${nombre.split(' ')[0].toLowerCase()}@ejemplo.cl`,
          codigo: String(1000 + ((i * 7919) % 9000)),
          opcion1: conCarta.has(i + 1) ? 'Un libro' : null,
          opcion2: conCarta.has(i + 1) ? 'Chocolates' : null,
          opcion3: conCarta.has(i + 1) ? 'Calcetines navideños' : null,
          mensaje: conCarta.has(i + 1) ? 'Talla M, me gusta el azul' : null,
          actualizado: null,
        })),
      }
    default:
      return undefined
  }
}
