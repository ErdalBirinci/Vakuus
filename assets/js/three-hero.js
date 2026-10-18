/* ==========================================================================
   VAKUUS — three-hero.js
   Premium 3D hero background (WebGL / Three.js).
   Decorative only: all real content stays in HTML for SEO / accessibility.
   Respects prefers-reduced-motion; degrades to a static gradient if WebGL fails.
   ========================================================================== */

(function () {
  "use strict";

  import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

  var canvas, scene, camera, renderer, shield, rings, particles, mouse, raycaster, clock;
  var rafId, width, height, reduceMotion;

  /* ------------------------- config ------------------------- */
  var CFG = {
    shieldRadius: 2.6,
    shieldSegments: 44,
    ringCount: 3,
    particleCount: 120,
    rotateSpeed: 0.18,
    floatSpeed: 0.5,
    ease: 0.08
  };

  /* ------------------------- palette ------------------------- */
  var COLORS = {
    cyan: 0x35c8ff,
    blue: 0x2e6bff,
    violet: 0x7c5cff,
    aurora: 0x14d6b0,
    dark: 0x070d1a,
    white: 0xffffff
  };

  /* ------------------------- init ------------------------- */
  function init() {
    canvas = document.getElementById("hero-3d");
    if (!canvas) return;

    reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      buildScene();
      animate();
      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("deviceorientation", onDeviceOrientation, {
        passive: true
      });
    } catch (e) {
      // WebGL not available — hero keeps its CSS gradient background.
      console.warn("[Vakuus] Three.js hero disabled:", e && e.message ? e.message : e);
      canvas.style.display = "none";
    }
  }

  /* ------------------------- scene ------------------------- */
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

    /* ---- Ambient + aurora rim light ---- */
    var ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    var rimLight = new THREE.PointLight(COLORS.cyan, 2.5, 20);
    rimLight.position.set(-4, 3, 2);
    scene.add(rimLight);

    var fillLight = new THREE.PointLight(COLORS.violet, 1.8, 20);
    fillLight.position.set(4, -2, 3);
    scene.add(fillLight);

    /* ---- Central shield / vault polyhedron (wireframe) ---- */
    shield = new THREE.Group();

    var geo = new THREE.IcosahedronGeometry(CFG.shieldRadius, 1);
    // Stretch vertically to feel like a vault / shield door.
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
    var shieldMesh = new THREE.Mesh(geo, wireMat);
    var shieldSolid = new THREE.Mesh(geo, solidMat);
    shield.add(shieldMesh);
    shield.add(shieldSolid);
    scene.add(shield);

    /* ---- Floating rings (orbits) ---- */
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
        speed: 0.06 + i * 0.025,
        radius: radius
      };
      rings.add(ring);
    }
    scene.add(rings);

    /* ---- Particle constellation ---- */
    particles = new THREE.Group();
    var ptsGeo = new THREE.BufferGeometry();
    var positions = new Float32Array(CFG.particleCount * 3);
    var colors = new Float32Array(CFG.particleCount * 3);
    var pc = new THREE.Color();

    for (var p = 0; p < CFG.particleCount; p++) {
      positions[p * 3] = (Math.random() - 0.5) * 14;
      positions[p * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[p * 3 + 2] = (Math.random() - 0.5) * 6;

      var c =
        p % 3 === 0
          ? COLORS.cyan
          : p % 3 === 1
          ? COLORS.blue
          : COLORS.violet;
      pc.set(c);
      colors[p * 3] = pc.r;
      colors[p * 3 + 1] = pc.g;
      colors[p * 3 + 2] = pc.b;
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
    particleSystem.userData = { drift: [] };
    for (var p2 = 0; p2 < CFG.particleCount; p2++) {
      particleSystem.userData.drift.push({
        x: (Math.random() - 0.5) * 0.004,
        y: (Math.random() - 0.5) * 0.004,
        z: (Math.random() - 0.5) * 0.004
      });
    }
    particles.add(particleSystem);
    scene.add(particles);

    /* ---- Connecting lines between nearby particles ---- */
    var lineGeo = new THREE.BufferGeometry();
    var lineCount = CFG.particleCount * 2;
    var linePos = new Float32Array(lineCount * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    var lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.06
      })
    );
    lines.userData = { positions: positions, geo: lineGeo };
    particles.add(lines);

    /* ---- Interaction state ---- */
    mouse = new THREE.Vector2(0, 0);
    raycaster = new THREE.Raycaster();
    clock = new THREE.Clock();
    particleDrift = [];

    width = canvas.clientWidth;
    height = canvas.clientHeight;
  }

  /* ------------------------- animation ------------------------- */
  function animate() {
    rafId = requestAnimationFrame(animate);

    var delta = clock.getDelta();
    var time = clock.getElapsedTime();
    var move = reduceMotion ? 0 : 0.05;

    /* Slow auto-rotation */
    if (shield) {
      shield.rotation.y += CFG.rotateSpeed * delta * 1.6;
      shield.rotation.x += CFG.rotateSpeed * delta * 0.9;
      shield.position.y = Math.sin(time * CFG.floatSpeed) * 0.12;
    }

    /* Rings counter-rotate */
    if (rings) {
      rings.children.forEach(function (ring, i) {
        ring.rotation.z =
          ring.userData.baseRotationZ +
          Math.sin(time * ring.userData.speed + i) * 0.12;
        ring.rotation.x =
          ring.userData.baseRotationX + Math.cos(time * 0.4 + i) * 0.08;
      });
    }

    /* Particles drift slowly */
    if (particles) {
      var ps = particles.children[0];
      if (ps) {
        var pos = ps.geometry.attributes.position.array;
        for (var p = 0; p < CFG.particleCount; p++) {
          var d = particleDrift[p] || { x: 0, y: 0, z: 0 };
          pos[p * 3] += d.x;
          pos[p * 3 + 1] += d.y;
          pos[p * 3 + 2] += d.z;
          if (Math.abs(pos[p * 3]) > 7) pos[p * 3] = (Math.random() - 0.5) * 14;
          if (Math.abs(pos[p * 3 + 1]) > 5) pos[p * 3 + 1] = (Math.random() - 0.5) * 9;
          if (Math.abs(pos[p * 3 + 2]) > 4) pos[p * 3 + 2] = (Math.random() - 0.5) * 6;
        }
        ps.geometry.attributes.position.needsUpdate = true;

        /* Rebuild connecting lines */
        updateLines(lines, pos);
      }
    }

    /* Mouse parallax */
    if (shield && !reduceMotion) {
      var targetX = (mouse.x - 0.5) * 0.4;
      var targetY = -(mouse.y - 0.5) * 0.4;
      shield.rotation.y += (targetX - shield.rotation.y) * CFG.ease;
      shield.rotation.x += (targetY - shield.rotation.x) * CFG.ease;
    }

    renderer.render(scene, camera);
  }

  var particleDrift = [];

  /* ------------------------- lines ------------------------- */
  function updateLines(lines, positions) {
    if (!lines) return;
    var geo = lines.userData.geo;
    var attr = geo.attributes.position;
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
          attr.setXYZ(
            count * 2 + 1,
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2]
          );
          count++;
        }
      }
    }
    attr.needsUpdate = true;
    geo.setDrawRange(0, count * 2);
  }

  /* ------------------------- input ------------------------- */
  function onMouseMove(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }

  function onDeviceOrientation(e) {
    if (reduceMotion) return;
    var x = (e.gamma || 0) / 90; // -1 .. 1
    var y = (e.beta || 0) / 90;
    mouse.x = (x + 1) / 2;
    mouse.y = (y + 1) / 2;
  }

  /* ------------------------- resize ------------------------- */
  function onResize() {
    if (!camera || !renderer) return;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  /* ------------------------- teardown ------------------------- */
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

  /* ------------------------- boot ------------------------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Expose for app.js */
  window.VAKUUS_THREE = { destroy: destroy };
})();
