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

  /* ----------------------- readiness checklist ----------------------- */
  function checklist() {
    var root = $("[data-checklist]");
    if (!root) return;
    var out = $("[data-checklist-out]", root);
    var boxes = $$('input[type="checkbox"]', root);
    if (!out || !boxes.length) return;

    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function render() {
      var picked = boxes.filter(function (b) { return b.checked; });
      if (!picked.length) {
        out.innerHTML =
          '<p class="checklist-empty">Nothing ticked yet — start with the statement that costs you sleep.</p>';
        return;
      }
      var head = picked.length === 1
        ? "one phase to confirm"
        : picked.length + " phases to work through";
      var html = '<p class="checklist-kicker">Your starting point — ' + head + '</p>';
      html += '<ul class="checklist-list">';
      picked.forEach(function (b) {
        html += '<li><span class="checklist-phase">Phase ' + esc(b.getAttribute("data-phase")) + '</span>' +
          '<div><strong>' + esc(b.getAttribute("data-name")) + '</strong>' +
          '<span>' + esc(b.getAttribute("data-rec")) + '</span></div></li>';
      });
      html += '</ul><p class="checklist-note">This is not a score — it only marks where the work ' +
        'begins. The exact starting point is confirmed in phase 02, in a meeting.</p>';
      out.innerHTML = html;
    }

    boxes.forEach(function (b) { b.addEventListener("change", render); });
    render();
  }

  /* --------------------- mobile sticky booking bar --------------------- */
  function stickyCTA() {
    if (!document.body) return;
    var bar = document.createElement("div");
    bar.className = "cta-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Book a discovery meeting");
    var onContact = /contact\.html?$/.test(location.pathname);
    bar.innerHTML =
      '<span class="cta-bar-text"><strong>30 minutes, video</strong>' +
      '<span>Discovery meeting — no obligation</span></span>' +
      '<a class="btn btn-primary btn-sm" href="' + (onContact ? "#book" : "contact.html") + '">Book a Meeting</a>';
    document.body.appendChild(bar);
    document.body.classList.add("has-cta-bar");

    var menu = $("#site-nav");
    var update = function () {
      var mobile = window.innerWidth <= 720;
      var navOpen = !!(menu && menu.classList.contains("is-open"));
      var show = mobile && !navOpen && window.scrollY > 480;
      bar.classList.toggle("is-visible", show);
      document.body.classList.toggle("cta-bar-on", mobile && show);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* ------------------- scroll progress + back to top ------------------- */
  function scrollUI() {
    if (!document.body) return;
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.title = "Back to top";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    var doc = document.documentElement;
    var update = function () {
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.width = (p * 100).toFixed(2) + "%";
      btn.classList.toggle("is-visible", window.scrollY > 700);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    btn.addEventListener("click", function () {
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      var skip = document.querySelector(".skip-link");
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  /* ------------------- premium GSAP animations ------------------- */
  function premiumAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    /* Stats counters */
    gsap.utils.toArray("[data-count-to]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      gsap.fromTo(el,
        { innerText: 0 },
        {
          innerText: target,
          duration: 1.4,
          ease: "power2.out",
          snap: { innerText: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    /* Tile progress bars */
    gsap.utils.toArray(".tile-bar i").forEach(function (el) {
      gsap.fromTo(el,
        { width: 0 },
        {
          width: el.getAttribute("data-fill") || "100%",
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }

  /* ------------------------- boot ------------------------- */
  function init() {
    header();
    nav();
    activeLink();
    reveal();
    premiumAnimations();
    contactData();
    booking();
    checklist();
    stickyCTA();
    scrollUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
