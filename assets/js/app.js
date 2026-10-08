/* ==========================================================================
   VAKUUS — app.js
   Navigation, reveal-on-scroll, contact data injection, Calendly booking.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.VAKUUS_CONFIG || {};

  /* ------------------------- helpers ------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ------------------------- header ------------------------- */
  function header() {
    var el = $(".site-header");
    if (!el) return;
    var onScroll = function () {
      el.classList.toggle("is-stuck", window.scrollY > 18);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------- mobile nav ------------------------- */
  function nav() {
    var toggle = $(".nav-toggle");
    var menu = $("#site-nav");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      menu.classList.toggle("is-open", open);
      document.body.style.overflow = open && window.innerWidth < 940 ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 940) setOpen(false);
    });
  }

  /* ------------------- active link marking ------------------- */
  function activeLink() {
    var file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (file === "" || file === "/") file = "index.html";
    $$("[data-nav] a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      a.classList.toggle("is-active", href === file);
    });
  }

  /* ------------------------- reveal ------------------------- */
  function reveal() {
    var items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window) ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      items.forEach(function (i) { i.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ------------- inject contact data (placeholders) ------------- */
  function contactData() {
    var c = CFG.contact || {};
    $$("[data-contact]").forEach(function (node) {
      var key = node.getAttribute("data-contact");
      var value = c[key];
      if (!value) return;
      if (node.tagName === "A" && (key === "email" || key === "phone")) {
        node.setAttribute("href", key === "email" ? "mailto:" + value : "tel:" + (c.phoneHref || value));
        if (node.hasAttribute("data-href-only")) return;
      }
      if (node.tagName === "A" && key === "linkedin") {
        /* href comes from config, the visible label stays as authored
           (footer "LinkedIn", contact card "linkedin.com/in/...") */
        node.setAttribute("href", value);
        return;
      }
      node.textContent = value;
    });
    $$("[data-company]").forEach(function (node) {
      var key = node.getAttribute("data-company");
      if (CFG.company && CFG.company[key]) node.textContent = CFG.company[key];
    });
    $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  /* ------------------------- Calendly ------------------------- */
  function booking() {
    var mount = $("#calendly-mount");
    var fallback = $("#book-fallback");
    if (!mount && !fallback) return;

    var cal = CFG.calendly || {};
    var ready = cal.url && cal.placeholder === false;

    if (!ready) {
      // Keep the designed fallback panel; make sure the link points at Calendly.
      $$("[data-calendly-link]").forEach(function (a) {
        a.setAttribute("href", cal.url || "#");
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
      });
      $$("[data-calendly-url]").forEach(function (n) { n.textContent = cal.url || "—"; });
      if (mount) mount.style.display = "none";
      return;
    }

    if (fallback) fallback.style.display = "none";
    mount.style.display = "block";
    mount.className = "calendly-inline-widget";
    mount.setAttribute("data-url", cal.url);
    mount.setAttribute("aria-label", "Meeting scheduler");

    var s = document.createElement("script");
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    s.onerror = function () {
      mount.style.display = "none";
      if (fallback) fallback.style.display = "block";
      $$("[data-calendly-link]").forEach(function (a) {
        a.setAttribute("href", cal.url); a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
      });
      $$("[data-calendly-url]").forEach(function (n) { n.textContent = cal.url; });
    };
    document.head.appendChild(s);
  }

  /* ------------------------- boot ------------------------- */
  function init() {
    header();
    nav();
    activeLink();
    reveal();
    contactData();
    booking();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
