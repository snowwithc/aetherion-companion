/**
 * Real 3D card (three.js via react-three-fiber): the card image is the front texture and
 * card_back.png the back. Floats, tilts toward the pointer, flips when tapped and slides in on mount.
 * Kept light for phones: two planes, unlit materials, no shadows, rendered on demand at max 30 fps.
 * Loaded lazily (React.lazy) so three.js never slows down the first screen.
 */
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CARD_BACK, cardImage } from './assets';

const W = 1.26;
const H = 1.76;

/** Rounded-rectangle geometry with 0..1 UVs (so the card corners are rounded). */
function useRoundedCardGeometry() {
  return useMemo(() => {
    const r = 0.075;
    const s = new THREE.Shape();
    const x = -W / 2;
    const y = -H / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + W - r, y);
    s.quadraticCurveTo(x + W, y, x + W, y + r);
    s.lineTo(x + W, y + H - r);
    s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
    s.lineTo(x + r, y + H);
    s.quadraticCurveTo(x, y + H, x, y + H - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ShapeGeometry(s, 8);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - x) / W;
      uv[i * 2 + 1] = (pos.getY(i) - y) / H;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  }, []);
}

/** Re-render at most `fps` times per second (frameloop="demand"). */
function FrameLimiter({ fps }: { fps: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

function CardMesh({ cardId, flipped, slideIn }: { cardId: string; flipped: boolean; slideIn: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [front, back] = useLoader(THREE.TextureLoader, [cardImage(cardId), CARD_BACK]);
  const geometry = useRoundedCardGeometry();
  const t = useRef(0);
  const startX = useRef(slideIn ? -3.2 : 0);

  useMemo(() => {
    [front, back].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
    });
  }, [front, back]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    t.current += dt;
    // slide in
    startX.current += (0 - startX.current) * Math.min(1, dt * 5);
    g.position.x = startX.current;
    // float
    g.position.y = Math.sin(t.current * 1.6) * 0.05;
    // tilt toward pointer + flip
    const targetY = (flipped ? Math.PI : 0) + state.pointer.x * 0.35 + (slideIn ? startX.current * -0.6 : 0);
    const targetX = -state.pointer.y * 0.25;
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 6);
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 6);
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} position={[0, 0, 0.006]}>
        <meshBasicMaterial map={front} toneMapped={false} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0, -0.006]} rotation={[0, Math.PI, 0]}>
        <meshBasicMaterial map={back} toneMapped={false} />
      </mesh>
    </group>
  );
}

export interface Card3DProps {
  cardId: string;
  flipped?: boolean;
  slideIn?: boolean;
  className?: string;
}

export default function Card3D({ cardId, flipped = false, slideIn = true, className }: Card3DProps) {
  return (
    <div className={className} data-testid="card-3d-canvas">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 3.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <FrameLimiter fps={30} />
        <Suspense fallback={null}>
          <CardMesh cardId={cardId} flipped={flipped} slideIn={slideIn} />
        </Suspense>
      </Canvas>
    </div>
  );
}
