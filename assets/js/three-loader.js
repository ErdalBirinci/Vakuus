/* ==========================================================================
   VAKUUS — three-loader.js
   Dynamically imports Three.js ES module, exposes it as window.THREE, then
   runs the hero scene. Works as a classic <script> — no type="module" needed.
   ========================================================================== */

(function () {
  "use strict";

  function load() {
    var canvas = document.getElementById("hero-3d");
    if (!canvas) return;

    import("./assets/vendor/three/three.module.js")
      .then(function (THREE) {
        window.THREE = THREE;
        return import("./assets/js/three-hero-entry.js");
      })
      .catch(function (e) {
        console.warn("[Vakuus] Three.js hero disabled:", e && e.message ? e.message : e);
        canvas.style.display = "none";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
