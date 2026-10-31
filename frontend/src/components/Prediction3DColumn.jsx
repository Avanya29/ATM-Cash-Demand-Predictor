import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const Prediction3DColumn = ({ predictedDemand = 9500 }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
      return;
    }

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 260;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.4, 4.2);
    camera.lookAt(0, 0.4, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xE8F0E5, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xC7F36B, 3.5, 6);
    pointLight.position.set(0, 1.5, 2);
    scene.add(pointLight);

    // Normalize predictedDemand (typically $3,000 to $25,000) to height scale (0.5 to 2.2)
    const normalizedHeight = Math.min(Math.max((predictedDemand / 15000) * 1.4, 0.6), 2.2);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x073D2E,
      metalness: 0.8,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.6;
    rootGroup.add(base);

    // Illuminated Demand Column
    const colGeo = new THREE.CylinderGeometry(0.4, 0.4, normalizedHeight, 32);
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x064B36,
      emissive: 0x123F32,
      metalness: 0.7,
      roughness: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.y = -0.6 + normalizedHeight / 2;
    rootGroup.add(col);

    // Glowing Neon Rings around Column
    const ringCount = 3;
    const rings = [];
    for (let i = 0; i < ringCount; i++) {
      const ringGeo = new THREE.TorusGeometry(0.44, 0.02, 12, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xC7F36B });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.5 + (normalizedHeight / (ringCount + 1)) * (i + 1);
      rootGroup.add(ring);
      rings.push(ring);
    }

    // Top Glowing Currency Token
    const tokenGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24);
    const tokenMat = new THREE.MeshStandardMaterial({
      color: 0xC7F36B,
      emissive: 0x073D2E,
      metalness: 0.9,
      roughness: 0.15,
    });
    const token = new THREE.Mesh(tokenGeo, tokenMat);
    token.position.y = -0.6 + normalizedHeight + 0.15;
    rootGroup.add(token);

    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        rootGroup.rotation.y = t * 0.5;
        token.rotation.y = -t * 1.2;
        token.position.y = -0.6 + normalizedHeight + 0.15 + Math.sin(t * 3) * 0.04;

        rings.forEach((r, idx) => {
          r.scale.setScalar(1 + Math.sin(t * 2 + idx) * 0.04);
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 220;
      const newH = container.clientHeight || 260;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [predictedDemand]);

  return (
    <div className="prediction-3d-container" ref={mountRef}>
      <style>{`
        .prediction-3d-container {
          width: 100%;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .prediction-3d-container canvas {
          display: block;
          max-width: 100%;
        }
      `}</style>
    </div>
  );
};
