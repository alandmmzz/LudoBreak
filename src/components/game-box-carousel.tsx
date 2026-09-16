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
  voted: boolean
  onSelect: (index: number) => void
}

const accentColors: Record<string, string> = {
  gold: '#d8aa36',
  orange: '#c87832',
  teal: '#3d918b',
  red: '#9f403b',
}

function BoardGameBox({ game, offset, selected, voted, onSelect }: { game: Game; offset: number; selected: boolean; voted: boolean; onSelect: () => void }) {
  const distance = Math.abs(offset)
  const isCenter = Math.abs(offset) < 0.12
  const rotation = offset * -0.18
  const x = offset * 1.5
  const y = 0.18 + distance * distance * 0.14 + (selected && voted ? 0.62 : 0)
  const z = -0.08 - distance * distance * 0.12 + (selected && voted ? 0.3 : 0)
  const scale = THREE.MathUtils.clamp(0.98 - distance * 0.24, 0.28, 0.98) + (selected && voted ? 0.1 : 0)
  const opacity = THREE.MathUtils.clamp(1 - distance * 0.3, 0, 1)
  const color = accentColors[game.accent] ?? '#a98150'
  const edge = useMemo(() => new THREE.Color(color).multiplyScalar(0.62), [color])
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const easing = 1 - Math.exp(-delta * 9)
    groupRef.current.position.lerp(new THREE.Vector3(x, y, z), easing)
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
    <group ref={groupRef} position={[x, y, z]} rotation={[0, rotation, offset * -0.08]} scale={scale} onClick={onSelect}>
      {selected && voted && <>
        <pointLight position={[0, 0.2, -0.5]} color={color} intensity={3.5} distance={4.5} decay={2} />
        <mesh position={[0, 0, -0.7]} rotation={[0, 0, 0]}>
          <circleGeometry args={[1.25, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </>}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.25, 0.72, 1.28]} />
        <meshStandardMaterial color="#b98c5d" roughness={0.82} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[2.38, 0.07, 1.4]} />
        <meshStandardMaterial color={color} roughness={0.72} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.66]}>
        <planeGeometry args={[2.2, 0.58]} />
        <meshStandardMaterial color={edge} roughness={0.8} transparent opacity={opacity} />
      </mesh>
      <Text position={[0, 0.02, 0.67]} fontSize={0.2} maxWidth={2.08} anchorX="center" anchorY="middle" color="#f7ead1" fillOpacity={opacity} outlineWidth={0.008} outlineColor="#5a3925">
        {game.title.toUpperCase()}
      </Text>
      <Text position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.13} maxWidth={2.1} anchorX="center" anchorY="middle" color="#fff2d1" fillOpacity={opacity * 0.9}>
        GAME NIGHT
      </Text>
    </group>
  )
}

export function GameBoxCarousel({ games, active, voted, onSelect }: GameBoxCarouselProps) {
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
      <Canvas shadows camera={{ position: [0, 2.55, 8.6], fov: 32 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.8} />
        <directionalLight position={[0, 6, 5]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 2, 2]} intensity={1.2} color="#f6d28c" />
        <group position={[0, 0.72, 0]}>
          {[-2, -1, 0, 1, 2].map((slot) => {
            const index = ((active + slot) % games.length + games.length) % games.length
            const offset = slot + dragOffset
            const game = games[index]
            return <BoardGameBox key={`${game.title}-${slot}`} game={game} offset={offset} selected={slot === 0} voted={voted} onSelect={() => onSelect(index)} />
          })}
        </group>
        <ContactShadows position={[0, -0.72, 0]} opacity={0.28} scale={12} blur={2.6} far={5} />
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
      </Canvas>
    </div>
  )
}
