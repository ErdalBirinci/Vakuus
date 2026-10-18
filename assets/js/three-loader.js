/* ==========================================================================
   VAKUUS — three-loader.js
   Loads Three.js ES module and exposes it as window.THREE, then runs the
   hero scene. Three.js r160+ is ESM-only, so this script itself is a module.
   ========================================================================== */

import * as THREE from "./assets/vendor/three/three.module.js";

window.THREE = THREE;

import "./assets/js/three-hero-entry.js";
