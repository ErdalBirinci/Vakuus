/* ==========================================================================
   VAKUUS — three-loader.js
   Loads Three.js ES module and exposes it as window.THREE, then runs the
   hero scene. Used because Three.js r160+ is ESM-only (no UMD build).
   ========================================================================== */

(function () {
  "use strict";

  var THREE_MODULE_URL = "assets/vendor/three/three.module.js";
  var HERO_MODULE_URL = "assets/js/three-hero-entry.js";

  function load() {
    // Create a module script tag to import Three.js
    var moduleScript = document.createElement("script");
    moduleScript.type = "module";
    moduleScript.textContent =
      'import * as THREE from "' +
      THREE_MODULE_URL +
      '";\n' +
      'window.THREE = THREE;\n' +
      'import "' +
      HERO_MODULE_URL +
      '";\n';
    document.head.appendChild(moduleScript);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
