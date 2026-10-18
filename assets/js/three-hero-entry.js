/* ==========================================================================
   VAKUUS — three-hero-entry.js
   Hero 3D scene entry point. Imported as an ES module by the import map
   script in index.html. Imports Three.js directly.
   ========================================================================== */

import * as THREE from "three";

(function (THREE) {
  "use strict";

  var canvas, scene, camera, renderer, shield, rings, particles, mouse, clock;
  var rafId, width, height, reduceMotion;

  var CFG = {
    shieldRadius: 2.6,
    ringCount: 3,
    particleCount: 120,
    rotateSpeed: 0.18,
    floatSpeed: 0.5,
    ease: 0.08
  };

  var COLORS = {
    cyan: 0x35c8ff,
    blue: 0x2e6bff,
    violet: 0x7c5cff,
    aurora: 0x14d6b0,
    white: 0xffffff
  };

  function boot() {
    canvas = document.getElementById("hero-3d");
    if (!canvas) return;

    reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    buildScene();
    animate();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("deviceorientation", onDeviceOrientation, {
      passive: true
    });
  }

  function buildScene() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0, 7.5);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x070d1a, 0);
    renderer.toneMapping = THREE.ReinhardToneMapping;

    var ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    var rimLight = new THREE.PointLight(COLORS.cyan, 2.5, 20);
    rimLight.position.set(-4, 3, 2);
    scene.add(rimLight);

    var fillLight = new THREE.PointLight(COLORS.violet, 1.8, 20);
    fillLight.position.set(4, -2, 3);
    scene.add(fillLight);

    /* Shield / vault wireframe */
    shield = new THREE.Group();
    var geo = new THREE.IcosahedronGeometry(CFG.shieldRadius, 1);
    geo.scale(1, 1.18, 1);

    var wireMat = new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    var solidMat = new THREE.MeshPhongMaterial({
      color: 0x070d1a,
      emissive: COLORS.blue,
      emissiveIntensity: 0.12,
      shininess: 60,
      transparent: true,
      opacity: 0.08
    });
    shield.add(new THREE.Mesh(geo, wireMat));
    shield.add(new THREE.Mesh(geo, solidMat));
    scene.add(shield);

    /* Floating rings */
    rings = new THREE.Group();
    for (var i = 0; i < CFG.ringCount; i++) {
      var radius = 2.0 + i * 1.15;
      var ringGeo = new THREE.RingGeometry(radius - 0.04, radius + 0.04, 64);
      var ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? COLORS.aurora : i === 1 ? COLORS.blue : COLORS.violet,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14 - i * 0.04
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.15 : -0.22);
      ring.rotation.z = (i * 0.7) % Math.PI;
      ring.userData = {
        baseRotationX: ring.rotation.x,
        baseRotationZ: ring.rotation.z,
        speed: 0.06 + i * 0.025
      };
      rings.add(ring);
    }
    scene.add(rings);

    /* Particle constellation */
    particles = new THREE.Group();
    var ptsGeo = new THREE.BufferGeometry();
    var positions = new Float32Array(CFG.particleCount * 3);
    var colors = new Float32Array(CFG.particleCount * 3);
    var pc = new THREE.Color();
    var drift = [];

    for (var p = 0; p < CFG.particleCount; p++) {
      positions[p * 3] = (Math.random() - 0.5) * 14;
      positions[p * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[p * 3 + 2] = (Math.random() - 0.5) * 6;

      pc.set(p % 3 === 0 ? COLORS.cyan : p % 3 === 1 ? COLORS.blue : COLORS.violet);
      colors[p * 3] = pc.r;
      colors[p * 3 + 1] = pc.g;
      colors[p * 3 + 2] = pc.b;

      drift.push({
        x: (Math.random() - 0.5) * 0.004,
        y: (Math.random() - 0.5) * 0.004,
        z: (Math.random() - 0.5) * 0.004
      });
    }

    ptsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    ptsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    var ptsMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    var particleSystem = new THREE.Points(ptsGeo, ptsMat);
    particleSystem.userData = { drift: drift };
    particles.add(particleSystem);
    scene.add(particles);

    /* Connecting lines */
    var lineGeo = new THREE.BufferGeometry();
    var linePos = new Float32Array(CFG.particleCount * 2 * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    var lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.06 })
    );
    lines.userData = { geo: lineGeo };
    particles.add(lines);

    mouse = new THREE.Vector2(0, 0);
    clock = new THREE.Clock();
    width = canvas.clientWidth;
    height = canvas.clientHeight;
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (!scene || !camera || !renderer) return;

    var delta = clock.getDelta();
    var time = clock.getElapsedTime();

    if (shield) {
      shield.rotation.y += CFG.rotateSpeed * delta * 1.6;
      shield.rotation.x += CFG.rotateSpeed * delta * 0.9;
      shield.position.y = Math.sin(time * CFG.floatSpeed) * 0.12;
    }

    if (rings) {
      rings.children.forEach(function (ring, i) {
        ring.rotation.z =
          ring.userData.baseRotationZ +
          Math.sin(time * ring.userData.speed + i) * 0.12;
        ring.rotation.x =
          ring.userData.baseRotationX + Math.cos(time * 0.4 + i) * 0.08;
      });
    }

    if (particles) {
      var ps = particles.children[0];
      if (ps) {
        var pos = ps.geometry.attributes.position.array;
        var drift = ps.userData.drift;
        for (var p = 0; p < CFG.particleCount; p++) {
          var d = drift[p];
          pos[p * 3] += d.x;
          pos[p * 3 + 1] += d.y;
          pos[p * 3 + 2] += d.z;
          if (Math.abs(pos[p * 3]) > 7) pos[p * 3] = (Math.random() - 0.5) * 14;
          if (Math.abs(pos[p * 3 + 1]) > 5) pos[p * 3 + 1] = (Math.random() - 0.5) * 9;
          if (Math.abs(pos[p * 3 + 2]) > 4) pos[p * 3 + 2] = (Math.random() - 0.5) * 6;
        }
        ps.geometry.attributes.position.needsUpdate = true;
        updateLines(pos);
      }
    }

    if (shield && !reduceMotion) {
      var targetX = (mouse.x - 0.5) * 0.4;
      var targetY = -(mouse.y - 0.5) * 0.4;
      shield.rotation.y += (targetX - shield.rotation.y) * CFG.ease;
      shield.rotation.x += (targetY - shield.rotation.x) * CFG.ease;
    }

    renderer.render(scene, camera);
  }

  function updateLines(positions) {
    if (!particles) return;
    var lines = particles.children[1];
    if (!lines) return;
    var attr = lines.geometry.attributes.position;
    var count = 0;
    var threshold = 2.6;
    var total = CFG.particleCount;

    for (var i = 0; i < total; i++) {
      for (var j = i + 1; j < total; j++) {
        var dx = positions[i * 3] - positions[j * 3];
        var dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        var dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < threshold && count < attr.count / 2) {
          attr.setXYZ(count * 2, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          attr.setXYZ(count * 2 + 1, positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
          count++;
        }
      }
    }
    attr.needsUpdate = true;
    lines.geometry.setDrawRange(0, count * 2);
  }

  function onMouseMove(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }

  function onDeviceOrientation(e) {
    if (reduceMotion) return;
    mouse.x = ((e.gamma || 0) / 90 + 1) / 2;
    mouse.y = ((e.beta || 0) / 90 + 1) / 2;
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    scene = null;
    camera = null;
    shield = null;
    rings = null;
    particles = null;
  }

  window.VAKUUS_THREE = { destroy: destroy };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(THREE);
