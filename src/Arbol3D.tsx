import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { CartaDe } from './supabase'
import { colorFamilia } from './colores'
import { iniciales } from './iniciales'


const ALTO = 4.2
const radioEn = (h: number) => 1.75 * (1 - h / (ALTO + 0.35))

interface Props {
  cartas: CartaDe[]
  seleccion: number | null
  onElegir: (id: number) => void
}

export default function Arbol3D({ cartas, seleccion, onElegir }: Props) {
  return (
    <Canvas
      className="arbol-canvas"
      dpr={[1, 2]}
      camera={{ position: [0, 2.4, 6.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <hemisphereLight args={['#dbe7ff', '#0b1a14', 0.9]} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <pointLight position={[0, 4.6, 1.5]} intensity={8} distance={6} color="#ffd27a" />
      <Escena cartas={cartas} seleccion={seleccion} onElegir={onElegir} />
      <Sparkles count={70} scale={[6, 5.5, 6]} position={[0, 2.2, 0]} size={2.2} speed={0.25} color="#ffffff" opacity={0.7} />
      <Controles pausado={seleccion !== null} />
    </Canvas>
  )
}

function Controles({ pausado }: { pausado: boolean }) {
  const ref = useRef<any>(null)
  // Que el arrastre vertical siga moviendo la página: el árbol sólo gira en horizontal.
  useEffect(() => {
    const el: HTMLElement | undefined = ref.current?.domElement
    if (el) el.style.touchAction = 'pan-y'
  })
  return (
    <OrbitControls
      ref={ref}
      target={[0, 1.95, 0]}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={Math.PI / 2.35}
      maxPolarAngle={Math.PI / 2.35}
      autoRotate={!pausado}
      autoRotateSpeed={0.9}
      enableDamping
      rotateSpeed={0.6}
    />
  )
}

function Escena({ cartas, seleccion, onElegir }: Props) {
  // Cartitas en espiral alrededor del árbol (ángulo áureo para que no se tapen).
  const posiciones = useMemo(() => {
    const n = cartas.length
    return cartas.map((_, k) => {
      const h = 0.55 + (k / Math.max(1, n - 1)) * (ALTO - 1.25)
      const angulo = k * 2.39996
      const r = radioEn(h) + 0.1
      return { h, angulo, r }
    })
  }, [cartas])

  const siglas = useMemo(() => iniciales(cartas), [cartas])

  return (
    <group position={[0, 0, 0]}>
      <Arbolito />
      {cartas.map((c, k) => (
        <Cartita
          key={c.id}
          carta={c}
          sigla={siglas.get(c.id) ?? ''}
          {...posiciones[k]}
          elegida={seleccion === c.id}
          onElegir={onElegir}
          fase={k * 0.7}
        />
      ))}
    </group>
  )
}

function Arbolito() {
  const estrella = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (estrella.current) estrella.current.rotation.y += dt * 0.8 })

  const pisos = [
    { y: 0.95, r: 1.75, h: 1.9 },
    { y: 1.85, r: 1.4, h: 1.6 },
    { y: 2.7, r: 1.02, h: 1.35 },
    { y: 3.45, r: 0.66, h: 1.1 },
  ]
  const verdes = ['#14532d', '#166534', '#15803d', '#16a34a']

  // Bolitas y lucecitas fijas.
  const adornos = useMemo(() => {
    const lista: { p: [number, number, number]; c: string; s: number; luz: boolean }[] = []
    const colores = ['#ff4d63', '#ffc94d', '#7dd3fc', '#f0abfc', '#ffffff']
    for (let i = 0; i < 46; i++) {
      const h = 0.35 + Math.random() * (ALTO - 0.8)
      const a = Math.random() * Math.PI * 2
      const r = radioEn(h) * 0.96
      const luz = i % 2 === 0
      lista.push({ p: [Math.sin(a) * r, h, Math.cos(a) * r], c: colores[i % colores.length], s: luz ? 0.035 : 0.075, luz })
    }
    return lista
  }, [])

  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.18, 0.24, 0.5, 16]} />
        <meshStandardMaterial color="#6b3f22" roughness={0.9} />
      </mesh>
      {pisos.map((p, i) => (
        <mesh key={i} position={[0, p.y, 0]}>
          <coneGeometry args={[p.r, p.h, 40, 1]} />
          <meshStandardMaterial color={verdes[i]} roughness={0.75} flatShading />
        </mesh>
      ))}
      {adornos.map((a, i) => (
        <mesh key={i} position={a.p}>
          <sphereGeometry args={[a.s, 16, 16]} />
          <meshStandardMaterial color={a.c} emissive={a.luz ? a.c : '#000000'} emissiveIntensity={a.luz ? 2.2 : 0} metalness={a.luz ? 0 : 0.6} roughness={0.25} />
        </mesh>
      ))}
      <mesh ref={estrella} position={[0, ALTO + 0.08, 0]}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#ffd23f" emissive="#ffb703" emissiveIntensity={1.6} metalness={0.4} roughness={0.2} />
      </mesh>
    </group>
  )
}

interface CartitaProps {
  carta: CartaDe
  sigla: string
  h: number
  angulo: number
  r: number
  elegida: boolean
  fase: number
  onElegir: (id: number) => void
}

function Cartita({ carta, sigla, h, angulo, r, elegida, fase, onElegir }: CartitaProps) {
  const grupo = useRef<THREE.Group>(null)
  const [encima, setEncima] = useState(false)
  const tiene = !!carta.opcion1
  const sello = colorFamilia(carta.familia)
  const textura = useTexturaSello(sigla, tiene ? sello : '#4b5563')

  useFrame(({ clock }) => {
    const g = grupo.current
    if (!g) return
    const t = clock.getElapsedTime()
    // Se mecen colgando de la rama; la elegida o la que está bajo el dedo crece.
    g.rotation.z = Math.sin(t * 1.6 + fase) * 0.12
    const meta = elegida ? 1.45 : encima ? 1.2 : 1
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, meta, 0.15))
  })

  function tocar(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    // Si el dedo arrastró para girar el árbol, no cuenta como toque.
    if (e.delta > 10 || !tiene) return
    onElegir(carta.id)
  }

  return (
    <group position={[Math.sin(angulo) * r, h, Math.cos(angulo) * r]} rotation={[0, angulo, 0]}>
      {/* Hilo del que cuelga */}
      <mesh position={[0, 0.2, -0.02]}>
        <cylinderGeometry args={[0.005, 0.005, 0.18, 4]} />
        <meshBasicMaterial color="#e5e7eb" />
      </mesh>
      <group
        ref={grupo}
        onClick={tocar}
        onPointerOver={e => { e.stopPropagation(); if (tiene) { setEncima(true); document.body.style.cursor = 'pointer' } }}
        onPointerOut={() => { setEncima(false); document.body.style.cursor = '' }}
      >
        {/* Zona de toque más grande que el sobre, pensada para dedos */}
        <mesh visible={false}>
          <boxGeometry args={[0.6, 0.45, 0.2]} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.42, 0.29, 0.025]} />
          <meshStandardMaterial color={tiene ? '#fff8ec' : '#6b7280'} roughness={0.6} transparent opacity={tiene ? 1 : 0.55} />
        </mesh>
        {/* Solapa */}
        <mesh position={[0, 0.045, 0.014]} rotation={[0, 0, Math.PI]} scale={[1, 1, 0.06]}>
          <coneGeometry args={[0.215, 0.2, 3, 1]} />
          <meshStandardMaterial color={tiene ? '#f3e6cf' : '#4b5563'} roughness={0.6} transparent opacity={tiene ? 1 : 0.55} />
        </mesh>
        {/* Sello de la familia */}
        {/* Sello de lacre con la inicial, en el color de la familia */}
        <mesh position={[0, -0.025, 0.03]}>
          <circleGeometry args={[0.095, 32]} />
          <meshStandardMaterial map={textura} transparent emissive="#ffffff" emissiveMap={textura} emissiveIntensity={elegida ? 0.55 : 0.25} roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

/** Círculo del color de la familia con la inicial en blanco, dibujado en un canvas. */
function useTexturaSello(sigla: string, color: string) {
  const textura = useMemo(() => {
    const t = new THREE.CanvasTexture(document.createElement('canvas'))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])

  useEffect(() => {
    let vivo = true
    const fuente = `800 ${sigla.length > 1 ? 88 : 112}px "Bricolage Grotesque", system-ui, sans-serif`
    const dibujar = () => {
      if (!vivo) return
      const c = textura.image as HTMLCanvasElement
      c.width = c.height = 256
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, 256, 256)
      ctx.beginPath()
      ctx.arc(128, 128, 124, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.lineWidth = 10
      ctx.strokeStyle = 'rgba(0,0,0,.18)'
      ctx.beginPath()
      ctx.arc(128, 128, 104, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = fuente
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,.35)'
      ctx.shadowBlur = 6
      ctx.fillText(sigla, 128, 136)
      textura.needsUpdate = true
    }
    dibujar()
    // Si la tipografía llega después, se vuelve a dibujar con ella.
    document.fonts?.load(fuente).then(dibujar).catch(() => {})
    return () => { vivo = false }
  }, [sigla, color, textura])

  return textura
}
