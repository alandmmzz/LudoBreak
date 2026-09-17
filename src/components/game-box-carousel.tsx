'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { ContactShadows, OrbitControls, Text } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

type Game = {
  title: string
  accent: string
  cover: string
}

type GameBoxCarouselProps = {
  games: Game[]
  active: number
  selectedVotes: number[]
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
  const coverTexture = useLoader(THREE.TextureLoader, game.cover)
  coverTexture.colorSpace = THREE.SRGBColorSpace
  const rotation = offset * -0.18
  const intermediateSpread = Math.sign(offset) * 0.42 * Math.max(0, 1 - Math.abs(distance - 1) * 2)
  const x = offset * 1.95 + intermediateSpread
  const y = 0.18 + distance * distance * 0.14 + (voted ? 0.62 : 0)
  const z = -0.08 - distance * distance * 0.3 + (voted ? 0.3 : 0)
  const scale = THREE.MathUtils.clamp(0.98 - distance * 0.24, 0.28, 0.98) + (voted ? 0.1 : 0)
  const opacity = THREE.MathUtils.clamp(1 - distance * 0.3, 0, 1)
  const color = new THREE.Color(accentColors[game.accent] ?? game.accent ?? '#a98150').lerp(new THREE.Color('#182020'), THREE.MathUtils.clamp(distance * 0.18, 0, 0.58)).getStyle()
  const edge = useMemo(() => new THREE.Color(color).multiplyScalar(0.62), [color])
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
    const base = new THREE.Color(color)
    const stops = [
      [0, 0.65],
      [0.22, 0.55],
      [0.42, 0.38],
      [0.62, 0.2],
      [0.8, 0.07],
      [1, 0],
    ] as const
    stops.forEach(([offsetStop, alpha]) => {
      gradient.addColorStop(offsetStop, `rgba(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)}, ${alpha})`)
    })
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 256)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [color])
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const initialized = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (!initialized.current) {
      groupRef.current.position.set(x, y, z)
      groupRef.current.rotation.set(0, rotation, offset * -0.08)
      groupRef.current.scale.set(scale, scale, scale)
      initialized.current = true
    } else {
      const easing = 1 - Math.exp(-delta * 9)
      groupRef.current.position.lerp(new THREE.Vector3(x, y, z), easing)
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, rotation, 9, delta)
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, offset * -0.035, 9, delta)
      groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), easing)
    }
    if (lightRef.current) lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, voted ? 3.2 : 0, 7, delta)
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = THREE.MathUtils.damp(material.opacity, voted ? 0.85 : 0, 7, delta)
    }
    groupRef.current.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.isVoteGlow) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        material.transparent = true
        material.opacity = THREE.MathUtils.damp(material.opacity, opacity, 10, delta)
      })
    })
  })

  return (
    <group ref={groupRef} onClick={onSelect}>
      <pointLight ref={lightRef} position={[0, 0.15, -0.85]} color={color} intensity={0} distance={4} decay={2} />
      <mesh ref={glowRef} position={[0, 0.1, -0.72]} userData={{ isVoteGlow: true }} renderOrder={-1}>
        <planeGeometry args={[4.6, 3.4]} />
        <meshBasicMaterial map={glowTexture} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[2.25, 0.72, 1.28]} />
        <meshStandardMaterial color="#b98c5d" roughness={0.82} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[2.38, 0.07, 1.4]} />
        <meshStandardMaterial color={color} roughness={0.72} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.675]} renderOrder={1}>
        <planeGeometry args={[2.25, 0.72]} />
        <meshBasicMaterial map={coverTexture} transparent opacity={opacity} toneMapped={false} />
      </mesh>
      {!game.cover && <Text position={[0, 0.02, 0.69]} fontSize={0.2} maxWidth={2.08} anchorX="center" anchorY="middle" color="#f7ead1" fillOpacity={opacity} outlineWidth={0.008} outlineColor="#5a3925">
        {game.title.toUpperCase()}
      </Text>}
      <Text position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.13} maxWidth={2.1} anchorX="center" anchorY="middle" color="#fff2d1" fillOpacity={opacity * 0.9}>
        GAME NIGHT
      </Text>
    </group>
  )
}

export function GameBoxCarousel({ games, active, selectedVotes, onSelect }: GameBoxCarouselProps) {
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const dragged = useRef(false)
  const activeVoted = selectedVotes.includes(active)
  const activeColor = accentColors[games[active]?.accent] ?? games[active]?.accent ?? '#a98150'

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragStart(event.clientX)
    dragged.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart === null) return
    const distance = event.clientX - dragStart
    if (Math.abs(distance) > 8) dragged.current = true
    setDragOffset(THREE.MathUtils.clamp(distance / 180, -0.95, 0.95))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart === null) return
    const distance = event.clientX - dragStart
    setDragStart(null)
    // A short drag returns through the same interpolated track animation.
    if (Math.abs(distance) < 90) {
      setDragOffset(0)
      return
    }

    // Finish the gesture by carrying the next box all the way into the center.
    // The active index changes only after that motion, so the scene never jumps.
    const direction = distance > 0 ? 1 : -1
    const nextIndex = (active + (distance > 0 ? -1 : 1) + games.length) % games.length
    setDragOffset(direction)
    window.setTimeout(() => {
      onSelect(nextIndex)
      setDragOffset(0)
    }, 420)
  }

  return (
    <div className="three-carousel-wrap">
      <div
        className={`vote-backlight ${activeVoted ? 'active' : ''}`}
        style={{ '--glow': activeColor } as React.CSSProperties}
        aria-hidden="true"
      />
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
          <fog attach="fog" args={['#111817', 6.5, 11.5]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[0, 6, 5]} intensity={3} />
          <pointLight position={[-5, 2, 2]} intensity={1.2} color="#f6d28c" />
          <group position={[0, 0.72, 0]}>
            {[-2, -1, 0, 1, 2].map((slot) => {
              const index = ((active + slot) % games.length + games.length) % games.length
              const offset = slot + dragOffset
              const game = games[index]
              return <BoardGameBox key={`${game.title}-${slot}`} game={game} offset={offset} selected={slot === 0} voted={selectedVotes.includes(index)} onSelect={() => onSelect(index)} />
            })}
            {/* Anchored to the group so the shadow plane sits directly under the box bottoms instead of floating far below them. */}
            <ContactShadows position={[0, -0.365, 0]} opacity={1} scale={4.4} blur={1.4} far={0.55} resolution={1024} frames={1} color="#000000" />
          </group>
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        </Canvas>
      </div>
    </div>
  )
}
