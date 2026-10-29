"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import {
  useRef,
  useMemo,
  useState,
  useEffect,
  Component,
  ReactNode,
} from "react";
import * as THREE from "three";
function Jacket() {
  const ref = useRef<THREE.Group>(null);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.23, 0.92);
    s.lineTo(-0.58, 0.78);
    s.lineTo(-0.72, -0.65);
    s.quadraticCurveTo(0, -0.9, 0.72, -0.65);
    s.lineTo(0.58, 0.78);
    s.lineTo(0.23, 0.92);
    s.lineTo(0.14, 0.64);
    s.lineTo(-0.14, 0.64);
    s.closePath();
    return s;
  }, []);
  useFrame(({ pointer }, dt) => {
    if (ref.current) {
      ref.current.rotation.y = THREE.MathUtils.damp(
        ref.current.rotation.y,
        pointer.x * 0.45 - 0.18,
        4,
        dt,
      );
      ref.current.rotation.x = THREE.MathUtils.damp(
        ref.current.rotation.x,
        -pointer.y * 0.12,
        4,
        dt,
      );
    }
  });
  return (
    <Float speed={1.5} rotationIntensity={0.12} floatIntensity={0.35}>
      <group ref={ref} scale={1.4} position={[0, 0.15, 0]}>
        <mesh position={[0, 0, -0.18]} castShadow>
          <extrudeGeometry
            args={[
              shape,
              {
                depth: 0.35,
                bevelEnabled: true,
                bevelSegments: 5,
                steps: 1,
                bevelSize: 0.09,
                bevelThickness: 0.09,
              },
            ]}
          />
          <meshStandardMaterial color="#a1ad83" roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.78, 0.06, 0]}
              rotation={[0, 0, side * 0.22]}
              castShadow
            >
              <capsuleGeometry args={[0.22, 1.1, 8, 20]} />
              <meshStandardMaterial color="#919e73" roughness={0.95} />
            </mesh>
            <mesh
              position={[side * 0.24, 0.46, 0.31]}
              rotation={[0, 0, side * -0.28]}
            >
              <boxGeometry args={[0.23, 0.68, 0.045]} />
              <meshStandardMaterial color="#c2c7a7" roughness={1} />
            </mesh>
            <mesh position={[side * 0.39, -0.25, 0.31]}>
              <boxGeometry args={[0.25, 0.28, 0.025]} />
              <meshStandardMaterial color="#87966c" roughness={1} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.86, -0.04]}>
          <cylinderGeometry args={[0.12, 0.18, 0.34, 24]} />
          <meshStandardMaterial
            color="#b7ac95"
            metalness={0.35}
            roughness={0.6}
          />
        </mesh>
        {[0.14, -0.1, -0.34, -0.58].map((y) => (
          <mesh
            key={y}
            position={[0.045, y, 0.31]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.025, 0.025, 0.025, 12]} />
            <meshStandardMaterial color="#37392b" />
          </mesh>
        ))}
      </group>
    </Float>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <img
        className="scene-fallback"
        src="/garments/glo-001.svg"
        alt="Sage green overshirt"
      />
    ) : (
      this.props.children
    );
  }
}
export default function HeroScene() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return (
    <div
      className="hero-canvas"
      role="img"
      aria-label="Interactive floating sage jacket. Move your pointer to rotate."
    >
      <Boundary>
        {enabled ? (
          <Canvas
            dpr={[1, 1.5]}
            shadows
            camera={{ position: [0, 0, 6.1], fov: 39 }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight position={[3, 5, 4]} intensity={3} castShadow />
            <directionalLight position={[-4, 0, 2]} intensity={1} />
            <Jacket />
            <ContactShadows
              position={[0, -2, 0]}
              opacity={0.26}
              scale={9}
              blur={2.6}
              far={4}
            />
          </Canvas>
        ) : (
          <img
            className="scene-fallback"
            src="/garments/glo-001.svg"
            alt="Sage overshirt"
          />
        )}
      </Boundary>
    </div>
  );
}
