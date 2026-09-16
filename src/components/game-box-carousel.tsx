'use client'

import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, Text } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

type Game = {
  title: string
  accent: string
}

type GameBoxCarouselProps = {
  games: Game[]
  active: number
  onSelect: (index: number) => void
}

const accentColors: Record<string, string> = {
  gold: '#d8aa36',
  orange: '#c87832',
  teal: '#3d918b',
  red: '#9f403b',
}

function BoardGameBox({ game, offset, onSelect }: { game: Game; offset: number; onSelect: () => void }) {
  const distance = Math.abs(offset)
  const rotation = offset * -0.22
  const x = offset * 0.98
  const y = -Math.abs(offset) * 0.12 + (Math.abs(offset) < 0.2 ? 0.08 : 0)
  const scale = THREE.MathUtils.clamp(0.84 - distance * 0.17, 0.14, 0.84)
  const opacity = THREE.MathUtils.clamp(1 - distance * 0.3, 0, 1)
  const color = accentColors[game.accent] ?? '#a98150'
  const edge = useMemo(() => new THREE.Color(color).multiplyScalar(0.62), [color])
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const easing = 1 - Math.exp(-delta * 9)
    groupRef.current.position.lerp(new THREE.Vector3(x, y, -distance * 0.14), easing)
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, rotation, 9, delta)
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, offset * -0.035, 9, delta)
    groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), easing)
    groupRef.current.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        material.transparent = true
        material.opacity = THREE.MathUtils.damp(material.opacity, opacity, 10, delta)
      })
    })
  })

  return (
    <group ref={groupRef} position={[x, y, -distance * 0.14]} rotation={[0, rotation, offset * -0.035]} scale={scale} onClick={onSelect}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.62, 1.42]} />
        <meshStandardMaterial color="#b98c5d" roughness={0.82} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <boxGeometry args={[2.5, 0.07, 1.75]} />
        <meshStandardMaterial color={color} roughness={0.72} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.86]}>
        <planeGeometry args={[2.08, 0.48]} />
        <meshStandardMaterial color={edge} roughness={0.8} transparent opacity={opacity} />
      </mesh>
      <Text position={[0, 0.02, 0.87]} fontSize={0.25} maxWidth={1.9} anchorX="center" anchorY="middle" color="#f7ead1" fillOpacity={opacity} outlineWidth={0.008} outlineColor="#5a3925">
        {game.title.toUpperCase()}
      </Text>
      <Text position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.16} maxWidth={2.1} anchorX="center" anchorY="middle" color="#fff2d1" fillOpacity={opacity * 0.9}>
        GAME NIGHT
      </Text>
    </group>
  )
}

export function GameBoxCarousel({ games, active, onSelect }: GameBoxCarouselProps) {
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const dragged = useRef(false)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragStart(event.clientX)
    dragged.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart === null) return
    const distance = event.clientX - dragStart
    if (Math.abs(distance) > 8) dragged.current = true
    setDragOffset(THREE.MathUtils.clamp(-distance / 180, -0.95, 0.95))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart === null) return
    const distance = event.clientX - dragStart
    setDragStart(null)
    setDragOffset(0)
    if (Math.abs(distance) < 55) return
    onSelect((active + (distance > 0 ? 1 : -1) + games.length) % games.length)
  }

  return (
    <div
      className="three-carousel"
      aria-label="Carrusel 3D de juegos"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setDragStart(null)
        setDragOffset(0)
      }}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.stopPropagation()
          dragged.current = false
        }
      }}
    >
      <Canvas shadows camera={{ position: [0, 3.6, 8.2], fov: 34 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.8} />
        <directionalLight position={[0, 6, 5]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 2, 2]} intensity={1.2} color="#f6d28c" />
        <group position={[0, 0.72, 0]}>
          {games.map((game, index) => {
            let offset = index - active
            if (offset > games.length / 2) offset -= games.length
            if (offset < -games.length / 2) offset += games.length
            offset += dragOffset
            if (Math.abs(offset) > 3.6) return null
            return <BoardGameBox key={game.title} game={game} offset={offset} onSelect={() => onSelect(index)} />
          })}
        </group>
        <ContactShadows position={[0, -0.72, 0]} opacity={0.28} scale={12} blur={2.6} far={5} />
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
      </Canvas>
    </div>
  )
}
