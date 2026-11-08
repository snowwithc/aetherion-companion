/**
 * Optional 3D character model: used only when /public/assets/models/<characterId>.glb exists.
 * Low-poly friendly: unlit-ish lighting, no shadows, 30 fps cap. Loaded lazily.
 */
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { characterModel } from './assets';

function Limiter() {
  const { invalidate } = useThree();
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / 30);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

function Model({ characterId }: { characterId: string }) {
  const gltf = useLoader(GLTFLoader, characterModel(characterId));
  const ref = useRef<THREE.Group>(null);
  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    // Fit the model into a ~2 unit tall box centred at the origin.
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z || 1);
    root.scale.setScalar(scale);
    root.position.sub(center.multiplyScalar(scale));
    return root;
  }, [gltf]);
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += Math.min(delta, 0.05) * 0.4;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.05;
  });
  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

export default function CharacterModel3D({ characterId }: { characterId: string }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0.3, 3.4], fov: 40 }} gl={{ alpha: true, powerPreference: 'low-power' }}>
      <Limiter />
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} />
      <Suspense fallback={null}>
        <Model characterId={characterId} />
      </Suspense>
    </Canvas>
  );
}
