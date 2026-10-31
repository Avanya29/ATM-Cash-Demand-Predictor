import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const AtmHeroCanvas = () => {
  const mountRef = useRef(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Test WebGL support
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to static visual:', e);
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 480;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 6.2);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xE8F0E5, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xC7F36B, 2.5);
    mainLight.position.set(4, 6, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xD3F47A, 1.8);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xC7F36B, 3, 8);
    pointLight.position.set(0, 0.2, 1.5);
    scene.add(pointLight);

    // Root 3D Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Stylized 3D ATM Terminal Body
    const atmGroup = new THREE.Group();
    rootGroup.add(atmGroup);

    // ATM Main Cabinet (Dark Forest Green)
    const cabinetGeo = new THREE.BoxGeometry(1.6, 2.4, 1.2);
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x073D2E,
      metalness: 0.6,
      roughness: 0.25,
    });
    const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    atmGroup.add(cabinet);

    // ATM Upper Fascia / Bevel (Deep Green)
    const fasciaGeo = new THREE.BoxGeometry(1.5, 0.5, 1.15);
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: 0x064B36,
      metalness: 0.8,
      roughness: 0.2,
    });
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    fascia.position.set(0, 0.95, 0.08);
    atmGroup.add(fascia);

    // ATM Brand Trim (Electric Lime Accent Bar)
    const trimGeo = new THREE.BoxGeometry(1.52, 0.05, 0.05);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xC7F36B });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 1.2, 0.61);
    atmGroup.add(trim);

    // ATM Display Screen (Illuminated Dark Glass with Lime Waveform)
    const screenGeo = new THREE.PlaneGeometry(1.1, 0.75);
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256;
    screenCanvas.height = 180;
    const ctx = screenCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#062B21';
      ctx.fillRect(0, 0, 256, 180);
      // Grid lines
      ctx.strokeStyle = 'rgba(199, 243, 107, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 180);
        ctx.stroke();
      }
      for (let y = 0; y < 180; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
      // Demand line graph
      ctx.strokeStyle = '#C7F36B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 130);
      ctx.bezierCurveTo(70, 40, 120, 150, 180, 50);
      ctx.lineTo(240, 90);
      ctx.stroke();
      // Glow dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(180, 50, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#C7F36B';
      ctx.fillText('$9,398 / DAY', 24, 34);
    }
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.42, 0.61);
    atmGroup.add(screen);

    // ATM Keypad Panel
    const keypadGeo = new THREE.BoxGeometry(0.9, 0.35, 0.04);
    const keypadMat = new THREE.MeshStandardMaterial({ color: 0x123F32, metalness: 0.9, roughness: 0.1 });
    const keypad = new THREE.Mesh(keypadGeo, keypadMat);
    keypad.position.set(0, -0.15, 0.62);
    keypad.rotation.x = -0.3;
    atmGroup.add(keypad);

    // Cash Dispenser Slot (Glowing Lime Aperture)
    const slotBaseGeo = new THREE.BoxGeometry(0.9, 0.12, 0.08);
    const slotBaseMat = new THREE.MeshStandardMaterial({ color: 0x04241B });
    const slotBase = new THREE.Mesh(slotBaseGeo, slotBaseMat);
    slotBase.position.set(0, -0.6, 0.6);
    atmGroup.add(slotBase);

    const slotGlowGeo = new THREE.PlaneGeometry(0.75, 0.03);
    const slotGlowMat = new THREE.MeshBasicMaterial({ color: 0xC7F36B });
    const slotGlow = new THREE.Mesh(slotGlowGeo, slotGlowMat);
    slotGlow.position.set(0, -0.6, 0.65);
    atmGroup.add(slotGlow);

    // 2. Floating Currency Geometric Tokens (Hexagonal & Cylindrical Coins)
    const tokenGroup = new THREE.Group();
    rootGroup.add(tokenGroup);

    const createToken = (radius, height, color, x, y, z, rx, ry) => {
      const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.85,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, 0);
      mesh.castShadow = true;
      tokenGroup.add(mesh);
      return mesh;
    };

    const token1 = createToken(0.35, 0.08, 0xC7F36B, -1.8, 0.7, 0.4, 0.6, 0.4);
    const token2 = createToken(0.28, 0.07, 0xD3F47A, 1.7, -0.4, 0.8, -0.5, 0.8);
    const token3 = createToken(0.22, 0.05, 0xF5F3E9, -1.3, -0.9, 0.9, 0.8, -0.4);
    const token4 = createToken(0.32, 0.07, 0x123F32, 1.5, 1.1, -0.2, -0.3, 0.5);

    // 3. Flowing Luminous Cash Particles
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 1.5;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
      particleSpeeds[i] = 0.008 + Math.random() * 0.015;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xC7F36B,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // 4. Curved Ribbon / Orbiting Flow Lines
    const curvePoints = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      curvePoints.push(new THREE.Vector3(Math.cos(t) * 2.2, Math.sin(t * 2) * 0.6, Math.sin(t) * 2.2));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.016, 8, true);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xC7F36B, transparent: true, opacity: 0.5 });
    const orbitRibbon = new THREE.Mesh(tubeGeo, tubeMat);
    rootGroup.add(orbitRibbon);

    // Initial slight rotation
    rootGroup.rotation.y = -0.25;
    rootGroup.rotation.x = 0.08;

    // Mouse Parallax Interaction
    let targetRotX = 0.08;
    let targetRotY = -0.25;
    let currentRotX = 0.08;
    let currentRotY = -0.25;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = -0.25 + x * 0.35;
      targetRotX = 0.08 - y * 0.25;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      currentRotX += (targetRotX - currentRotX) * 0.05;
      currentRotY += (targetRotY - currentRotY) * 0.05;
      rootGroup.rotation.x = currentRotX;
      rootGroup.rotation.y = currentRotY;

      // Gentle continuous floating
      if (!prefersReducedMotion) {
        atmGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.06;

        token1.rotation.y += 0.012;
        token1.rotation.x += 0.008;
        token1.position.y = 0.7 + Math.sin(elapsedTime * 1.5) * 0.08;

        token2.rotation.y -= 0.015;
        token2.position.y = -0.4 + Math.cos(elapsedTime * 1.3) * 0.07;

        token3.rotation.z += 0.01;
        token3.position.y = -0.9 + Math.sin(elapsedTime * 1.1) * 0.06;

        token4.rotation.x += 0.014;
        token4.position.y = 1.1 + Math.cos(elapsedTime * 1.4) * 0.09;

        orbitRibbon.rotation.y += 0.004;

        // Animate particles flowing upward
        const pos = particleGeo.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          pos[i * 3 + 1] += particleSpeeds[i];
          if (pos[i * 3 + 1] > 2) {
            pos[i * 3 + 1] = -2;
          }
        }
        particleGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 520;
      const newH = container.clientHeight || 480;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="hero-3d-wrapper" ref={mountRef}>
      {!webGlSupported && (
        <div className="webgl-fallback-container">
          <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
            <rect x="40" y="40" width="200" height="200" rx="24" fill="#073D2E" stroke="#C7F36B" strokeWidth="3" />
            <rect x="65" y="70" width="150" height="90" rx="10" fill="#064B36" />
            <path d="M85 130 C110 80 140 140 170 95 L195 115" stroke="#C7F36B" strokeWidth="4" strokeLinecap="round" />
            <rect x="85" y="180" width="110" height="16" rx="4" fill="#C7F36B" />
          </svg>
          <div className="fallback-badge">Interactive 3D Ready</div>
        </div>
      )}

      {/* Layered Floating HUD Badges with 3D Depth */}
      <div className="floating-hud-badge badge-top-right">
        <span className="hud-dot" />
        <span className="hud-text">Active Model: Random Forest</span>
      </div>

      <div className="floating-hud-badge badge-bottom-left">
        <span className="hud-icon">⚡</span>
        <div>
          <div className="hud-title">Zero Data Leakage</div>
          <div className="hud-sub">Strict Calendar Lags (t-1..t-14)</div>
        </div>
      </div>

      <div className="floating-hud-badge badge-bottom-right">
        <span className="hud-stat-value">-6.8%</span>
        <span className="hud-stat-label">WAPE vs Baseline</span>
      </div>

      <style>{`
        .hero-3d-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          overflow: visible;
        }
        .hero-3d-wrapper canvas {
          display: block;
          max-width: 100%;
          height: auto;
        }
        .webgl-fallback-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .fallback-badge {
          background: #C7F36B;
          color: #073D2E;
          font-weight: 700;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .floating-hud-badge {
          position: absolute;
          background: rgba(7, 61, 46, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(199, 243, 107, 0.35);
          border-radius: 12px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #F5F3E9;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
          pointer-events: none;
          z-index: 10;
          transition: transform 0.3s ease;
        }
        .badge-top-right {
          top: 18px;
          right: 12px;
          font-size: 11.5px;
        }
        .badge-bottom-left {
          bottom: 24px;
          left: 10px;
        }
        .badge-bottom-right {
          bottom: 30px;
          right: 14px;
          flex-direction: column;
          align-items: flex-end;
          gap: 0;
          padding: 8px 12px;
        }
        .hud-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #C7F36B;
          box-shadow: 0 0 8px #C7F36B;
        }
        .hud-icon {
          font-size: 14px;
        }
        .hud-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #FFFFFF;
        }
        .hud-sub {
          font-size: 9.5px;
          color: #C7F36B;
          font-family: var(--font-mono);
        }
        .hud-stat-value {
          font-size: 17px;
          font-weight: 800;
          color: #C7F36B;
          font-family: var(--font-mono);
          line-height: 1.1;
        }
        .hud-stat-label {
          font-size: 9.5px;
          color: #E8F0E5;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        @media (max-width: 900px) {
          .floating-hud-badge { display: none; }
          .hero-3d-wrapper { min-height: 320px; }
        }
      `}</style>
    </div>
  );
};
