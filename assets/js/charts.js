/* ==========================================================================
   VAKUUS — charts.js
   Zero-dependency SVG chart kit: donut, bars, grouped bars, area/line,
   radar, gantt, stacked bars. Everything animates when scrolled into view.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PALETTE = ["#2e6bff", "#14d6b0", "#7c5cff", "#ffb020", "#35c8ff", "#ff5c7a", "#0aa88a"];
  var DARK_INK = "#0a1526";
  var LIGHT_INK = "#ffffff";

  /* ------------------------- helpers ------------------------- */

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function txt(parent, content, attrs) {
    var t = el("text", attrs, parent);
    t.textContent = content;
    return t;
  }

  function svgRoot(host) {
    var svg = host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg.chart");
    if (!svg) {
      svg = el("svg", { class: "chart", preserveAspectRatio: "xMidYMid meet" }, host);
    }
    return svg;
  }

  function cfg(host, defaults) {
    var raw = host.getAttribute("data-chart-config");
    var conf = {};
    if (raw) {
      try { conf = JSON.parse(raw); } catch (e) { conf = {}; }
    }
    // merge simple data-* fallbacks
    var map = {
      value: "value", label: "label", sub: "sub", color: "color", unit: "unit",
      title: "title", max: "max"
    };
    for (var key in map) {
      var v = host.getAttribute("data-" + key);
      if (v !== null && conf[key] === undefined) conf[key] = isNaN(+v) ? v : +v;
    }
    var out = {};
    for (var d in defaults) out[d] = defaults[d];
    for (var c in conf) if (conf[c] !== undefined && conf[c] !== "") out[c] = conf[c];
    return out;
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function tween(duration, step, done) {
    if (REDUCED) { step(1); if (done) done(); return; }
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      step(easeOut(p));
      if (p < 1) requestAnimationFrame(frame);
      else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  function fmt(n, decimals) {
    var v = decimals ? n.toFixed(decimals) : Math.round(n);
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  /* Nice axis: percentage charts cap at 100, small integer sets use step 1,
     otherwise round the step up to a readable number. */
  function niceUp(v) {
    if (v <= 0) return 1;
    var exp = Math.floor(Math.log(v) / Math.log(10));
    var pow = Math.pow(10, exp);
    var f = v / pow;
    var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) {
      if (f <= steps[i] + 1e-9) return steps[i] * pow;
    }
    return 10 * pow;
  }

  function axisScale(values, grid, unit, headroom) {
    var mv = Math.max.apply(null, values);
    if (unit === "%" && mv <= 100) return { max: 100, grid: grid };
    var allInt = values.every(function (v) { return Math.abs(v - Math.round(v)) < 1e-9; });
    if (allInt && mv > 0 && mv <= 14) return { max: mv, grid: Math.min(grid, mv) };
    var raw = mv * (headroom || 1.14);
    var step = niceUp(raw / grid);
    return { max: step * grid, grid: grid };
  }

  function isDark(host) {
    return !!host.closest(".panel--dark, .section--dark, .hero, .page-hero, .cta-band, .site-footer, .console");
  }

  /* ======================= DONUT ======================= */
  function donut(host) {
    var c = cfg(host, { value: 70, max: 100, label: "", sub: "", color: "#2e6bff", size: 220, thickness: 17, track: true });
    var svg = svgRoot(host);
    var S = c.size, cx = S / 2, cy = S / 2;
    var r = S / 2 - c.thickness - 6;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var trackCol = isDark(host) ? "rgba(255,255,255,.10)" : "rgba(10,21,38,.09)";

    svg.setAttribute("viewBox", "0 0 " + S + " " + S);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", (c.label || "chart") + ": " + c.value + "/" + c.max);

    var defs = el("defs", null, svg);
    var grad = el("linearGradient", { id: "dg" + Math.random().toString(36).slice(2, 8), x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
    el("stop", { offset: "0%", "stop-color": c.color }, grad);
    el("stop", { offset: "100%", "stop-color": PALETTE[3] === c.color ? "#ff8a5c" : PALETTE[2] }, grad);
    var stroke = "url(#" + grad.getAttribute("id") + ")";

    var circ = 2 * Math.PI * r;
    var g = el("g", { transform: "rotate(-90 " + cx + " " + cy + ")" }, svg);
    if (c.track) el("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: trackCol, "stroke-width": c.thickness }, g);
    var arc = el("circle", {
      cx: cx, cy: cy, r: r, fill: "none", stroke: stroke, "stroke-width": c.thickness,
      "stroke-linecap": "round", "stroke-dasharray": circ, "stroke-dashoffset": circ
    }, g);

    var centerVal = txt(svg, "0%", {
      x: cx, y: cy - (c.label ? 4 : -6), "text-anchor": "middle",
      "font-family": "Sora, sans-serif", "font-size": S * 0.235, "font-weight": "800",
      fill: ink, "letter-spacing": "-0.03em"
    });
    if (c.label) {
      txt(svg, c.label, {
        x: cx, y: cy + 20, "text-anchor": "middle",
        "font-size": S * 0.062, "font-weight": "600", fill: muted,
        "letter-spacing": "0.14em"
      }).textContent = String(c.label).toUpperCase();
    }
    if (c.sub) {
      txt(svg, c.sub, {
        x: cx, y: cy + (c.label ? 40 : 30), "text-anchor": "middle",
        "font-size": S * 0.052, fill: muted, "letter-spacing": "0.04em"
      });
    }

    var pct = Math.max(0, Math.min(1, c.value / c.max));
    return function () {
      tween(1500, function (p) {
        arc.setAttribute("stroke-dashoffset", circ * (1 - pct * p));
        centerVal.textContent = Math.round(pct * p * 100) + "%";
      });
    };
  }

  /* ================= MULTI-SEGMENT DONUT ================= */
  function donutMulti(host) {
    var c = cfg(host, { segments: [], size: 230, thickness: 22, label: "", center: "" });
    var segs = c.segments || [];
    var svg = svgRoot(host);
    var S = c.size, cx = S / 2, cy = S / 2, r = S / 2 - c.thickness - 8;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var total = segs.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var circ = 2 * Math.PI * r;

    svg.setAttribute("viewBox", "0 0 " + S + " " + S);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", c.label || "segment chart");

    var g = el("g", { transform: "rotate(-90 " + cx + " " + cy + ")" }, svg);
    el("circle", {
      cx: cx, cy: cy, r: r, fill: "none",
      stroke: isDark(host) ? "rgba(255,255,255,.09)" : "rgba(10,21,38,.07)",
      "stroke-width": c.thickness
    }, g);

    var arcs = [];
    var offset = 0;
    segs.forEach(function (s, i) {
      var frac = s.value / total;
      var a = el("circle", {
        cx: cx, cy: cy, r: r, fill: "none",
        stroke: s.color || PALETTE[i % PALETTE.length],
        "stroke-width": c.thickness,
        "stroke-linecap": "butt",
        "stroke-dasharray": "0 " + circ,
        "stroke-dashoffset": -offset * circ
      }, g);
      arcs.push({ node: a, len: frac * circ });
      offset += frac;
    });

    txt(svg, c.center || fmt(total), {
      x: cx, y: cy + 2, "text-anchor": "middle",
      "font-family": "Sora, sans-serif", "font-size": S * 0.21, "font-weight": "800",
      fill: ink, "letter-spacing": "-0.03em"
    });
    if (c.label) {
      txt(svg, String(c.label).toUpperCase(), {
        x: cx, y: cy + 24, "text-anchor": "middle",
        "font-size": S * 0.058, fill: muted, "letter-spacing": "0.14em"
      });
    }

    return function () {
      tween(1300, function (p) {
        arcs.forEach(function (a) {
          a.node.setAttribute("stroke-dasharray", (a.len * p) + " " + circ);
        });
      });
    };
  }

  /* ======================= BARS ======================= */
  function bars(host) {
    var c = cfg(host, {
      labels: [], values: [], unit: "", horizontal: false, colors: null,
      highlight: -1, grid: 4, valueLabels: true, width: 460, height: 240, sort: false
    });
    var labels = c.labels.slice(), values = c.values.slice();
    if (c.sort) {
      var idx = labels.map(function (l, i) { return i; }).sort(function (a, b) { return values[b] - values[a]; });
      labels = idx.map(function (i) { return labels[i]; });
      values = idx.map(function (i) { return values[i]; });
    }
    var svg = svgRoot(host);
    var W = c.width, H = c.height;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var gridCol = isDark(host) ? "rgba(255,255,255,.12)" : "rgba(10,21,38,.09)";
    var max = Math.max.apply(null, values) * 1.12 || 1;
    var sc = axisScale(values, c.grid, c.unit, 1.12);
    max = sc.max;
    var gridN = sc.grid;

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "bar chart");

    var pad = { t: 24, r: 16, b: 46, l: 46 };
    if (c.horizontal) {
      pad = { t: 8, r: 58, b: 26, l: c.valueLabels && !c.labels.every(function (l) { return String(l).length < 9; }) ? 132 : 118 };
    }
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    // grid + axis labels
    if (!c.horizontal) {
      for (var i = 0; i <= gridN; i++) {
        var y = pad.t + ih - (ih / gridN) * i;
        el("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: gridCol, "stroke-width": 1 }, svg);
        txt(svg, fmt((max / gridN) * i) + c.unit, {
          x: pad.l - 9, y: y + 4, "text-anchor": "end",
          "font-size": 9.5, fill: muted, "letter-spacing": ".02em"
        });
      }
    } else {
      for (var j = 0; j <= gridN; j++) {
        var x = pad.l + (iw / gridN) * j;
        el("line", { x1: x, y1: pad.t, x2: x, y2: H - pad.b, stroke: gridCol, "stroke-width": 1 }, svg);
        txt(svg, fmt((max / gridN) * j) + c.unit, {
          x: x, y: H - pad.b + 16, "text-anchor": "middle",
          "font-size": 9.5, fill: muted
        });
      }
    }

    var nodes = [];
    if (!c.horizontal) {
      var slot = iw / values.length;
      var bw = Math.min(58, slot * 0.56);
      values.forEach(function (v, i) {
        var x = pad.l + slot * i + (slot - bw) / 2;
        var color = (c.colors && c.colors[i]) || (c.highlight === i ? PALETTE[1] : PALETTE[0]);
        var rct = el("rect", {
          x: x, y: pad.t + ih, width: bw, height: 0, rx: Math.min(8, bw / 3),
          fill: color, opacity: c.highlight === -1 || c.highlight === i ? 1 : .38
        }, svg);
        var lbl = txt(svg, labels[i], {
          x: x + bw / 2, y: pad.t + ih + 19, "text-anchor": "middle",
          "font-size": 10, fill: muted
        });
        wrapLabel(lbl, labels[i], 11, pad.t + ih + 19, 11);
        var val = c.valueLabels ? txt(svg, "", {
          x: x + bw / 2, y: pad.t + ih - 8, "text-anchor": "middle",
          "font-size": 11, "font-weight": "700", fill: ink
        }) : null;
        nodes.push({ node: rct, val: val, v: v, h: (v / max) * ih, y: pad.t + ih });
      });
    } else {
      var rowH = ih / values.length;
      var bh = Math.min(30, rowH * 0.6);
      values.forEach(function (v, i) {
        var y = pad.t + rowH * i + (rowH - bh) / 2;
        var color = (c.colors && c.colors[i]) || PALETTE[0];
        el("rect", { x: pad.l, y: y, width: iw, height: bh, rx: bh / 2, fill: isDark(host) ? "rgba(255,255,255,.07)" : "rgba(10,21,38,.06)" }, svg);
        var rct = el("rect", { x: pad.l, y: y, width: 0, height: bh, rx: bh / 2, fill: color }, svg);
        txt(svg, labels[i], {
          x: pad.l - 12, y: y + bh / 2 + 4, "text-anchor": "end",
          "font-size": 11, fill: ink, "font-weight": "600"
        });
        var val = txt(svg, fmt(v) + c.unit, {
          x: pad.l + 8, y: y + bh / 2 + 4, "text-anchor": "start",
          "font-size": 11, "font-weight": "700", fill: ink, opacity: 0
        });
        nodes.push({ node: rct, val: val, v: v, w: (v / max) * iw, horizontal: true, x0: pad.l, y: y, bh: bh, ink: ink });
      });
    }

    return function () {
      tween(1350, function (p) {
        nodes.forEach(function (n) {
          if (n.horizontal) {
            n.node.setAttribute("width", n.w * p);
            if (n.val) {
              n.val.setAttribute("x", n.x0 + n.w * p + 8);
              n.val.setAttribute("opacity", p);
            }
          } else {
            var h = n.h * p;
            n.node.setAttribute("height", h);
            n.node.setAttribute("y", n.y - h);
            if (n.val) {
              n.val.setAttribute("y", n.y - h - 8);
              n.val.textContent = fmt(n.v * p) + c.unit;
            }
          }
        });
      });
    };
  }

  function wrapLabel(node, text, perLine, y, lineHeight) {
    if (String(text).length <= perLine) return;
    var words = String(text).split(" ");
    var line = "", lines = [];
    words.forEach(function (w) {
      if ((line + " " + w).trim().length > perLine) { lines.push(line.trim()); line = w; }
      else line += " " + w;
    });
    if (line.trim()) lines.push(line.trim());
    node.textContent = "";
    lines.slice(0, 2).forEach(function (l, i) {
      var ts = el("tspan", { x: node.getAttribute("x"), dy: i === 0 ? 0 : lineHeight }, node);
      ts.textContent = l;
    });
    node.setAttribute("y", y - (lines.length > 1 ? lineHeight : 0));
  }

  /* =================== GROUPED (2 series) =================== */
  function grouped(host) {
    var c = cfg(host, {
      labels: [], series: [], unit: "", width: 470, height: 250, grid: 4, legend: true
    });
    var svg = svgRoot(host);
    var W = c.width, H = c.height;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var gridCol = isDark(host) ? "rgba(255,255,255,.12)" : "rgba(10,21,38,.09)";
    var all = [];
    c.series.forEach(function (s) { all = all.concat(s.values); });
    var sc = axisScale(all, c.grid, c.unit, 1.15);
    var max = sc.max || 1;
    var gridN = sc.grid;
    var pad = { t: 26, r: 14, b: 48, l: 46 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "grouped bar chart");

    for (var i = 0; i <= gridN; i++) {
      var y = pad.t + ih - (ih / gridN) * i;
      el("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: gridCol, "stroke-width": 1 }, svg);
      txt(svg, fmt((max / gridN) * i) + c.unit, {
        x: pad.l - 9, y: y + 4, "text-anchor": "end", "font-size": 9.5, fill: muted
      });
    }

    var slot = iw / c.labels.length;
    var groupW = slot * 0.66;
    var bw = groupW / c.series.length;
    var nodes = [];
    c.labels.forEach(function (lab, li) {
      var gx = pad.l + slot * li + (slot - groupW) / 2;
      var lbl = txt(svg, lab, {
        x: gx + groupW / 2, y: pad.t + ih + 19, "text-anchor": "middle", "font-size": 10, fill: muted
      });
      wrapLabel(lbl, lab, 12, pad.t + ih + 19, 11);
      c.series.forEach(function (s, si) {
        var v = s.values[li];
        var x = gx + bw * si;
        var rct = el("rect", {
          x: x + 1.5, y: pad.t + ih, width: bw - 3, height: 0, rx: 4,
          fill: s.color || PALETTE[si % PALETTE.length], opacity: .95
        }, svg);
        nodes.push({ node: rct, h: (v / max) * ih, y: pad.t + ih });
      });
    });

    return function () {
      tween(1300, function (p) {
        nodes.forEach(function (n) {
          var h = n.h * p;
          n.node.setAttribute("height", h);
          n.node.setAttribute("y", n.y - h);
        });
      });
    };
  }

  /* ======================= LINE / AREA ======================= */
  function line(host) {
    var c = cfg(host, {
      labels: [], values: [], unit: "", color: "#2e6bff", area: true,
      width: 470, height: 250, grid: 4, target: null, targetLabel: ""
    });
    var svg = svgRoot(host);
    var W = c.width, H = c.height;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var gridCol = isDark(host) ? "rgba(255,255,255,.12)" : "rgba(10,21,38,.09)";
    var vals = c.values.slice();
    if (c.target !== null && c.target !== undefined) vals = vals.concat([c.target]);
    var sc = axisScale(vals, c.grid, c.unit, 1.18);
    var max = sc.max || 1;
    var gridN = sc.grid;
    var pad = { t: 26, r: 22, b: 48, l: 46 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "line chart");

    var defs = el("defs", null, svg);
    var gid = "ag" + Math.random().toString(36).slice(2, 8);
    var lg = el("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    el("stop", { offset: "0%", "stop-color": c.color, "stop-opacity": ".42" }, lg);
    el("stop", { offset: "100%", "stop-color": c.color, "stop-opacity": "0" }, lg);

    for (var i = 0; i <= gridN; i++) {
      var y = pad.t + ih - (ih / gridN) * i;
      el("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: gridCol, "stroke-width": 1 }, svg);
      txt(svg, fmt((max / gridN) * i) + c.unit, {
        x: pad.l - 9, y: y + 4, "text-anchor": "end", "font-size": 9.5, fill: muted
      });
    }

    var step = c.values.length > 1 ? iw / (c.values.length - 1) : 0;
    function px(i) { return pad.l + step * i; }
    function py(v) { return pad.t + ih - (v / max) * ih; }

    // clip for reveal
    var cid = "cp" + Math.random().toString(36).slice(2, 8);
    var cp = el("clipPath", { id: cid }, defs);
    var clipRect = el("rect", { x: pad.l, y: 0, width: 0, height: H }, cp);

    var d = "";
    c.values.forEach(function (v, i) {
      d += (i === 0 ? "M" : "L") + px(i).toFixed(1) + " " + py(v).toFixed(1) + " ";
    });

    var gClip = el("g", { "clip-path": "url(#" + cid + ")" }, svg);
    if (c.area) {
      el("path", {
        d: d + "L" + px(c.values.length - 1).toFixed(1) + " " + (pad.t + ih) + " L" + pad.l + " " + (pad.t + ih) + " Z",
        fill: "url(#" + gid + ")"
      }, gClip);
    }
    var path = el("path", {
      d: d.trim(), fill: "none", stroke: c.color, "stroke-width": 3,
      "stroke-linecap": "round", "stroke-linejoin": "round"
    }, gClip);

    // target line
    if (c.target !== null && c.target !== undefined) {
      var ty = py(c.target);
      el("line", {
        x1: pad.l, y1: ty, x2: W - pad.r, y2: ty,
        stroke: PALETTE[3], "stroke-width": 1.6, "stroke-dasharray": "6 5", opacity: .85
      }, svg);
      var nearTop = ty <= pad.t + 20;
      txt(svg, (c.targetLabel || "target") + " " + fmt(c.target) + c.unit, {
        x: nearTop ? pad.l + 4 : W - pad.r,
        y: nearTop ? ty + 15 : ty - 8,
        "text-anchor": nearTop ? "start" : "end", "font-size": 9.5,
        fill: isDark(host) ? PALETTE[3] : "#a86f00", "letter-spacing": ".05em",
        "font-weight": "600"
      });
    }

    // x labels + dots
    var dots = [];
    c.values.forEach(function (v, i) {
      txt(svg, c.labels[i], {
        x: px(i), y: pad.t + ih + 19, "text-anchor": "middle", "font-size": 9.5, fill: muted
      });
      var dot = el("circle", {
        cx: px(i), cy: py(v), r: 4.5, fill: isDark(host) ? "#0a1526" : "#fff",
        stroke: c.color, "stroke-width": 2.5, opacity: 0
      }, svg);
      dots.push(dot);
      var vlbl = txt(svg, fmt(v) + c.unit, {
        x: px(i), y: py(v) - 13, "text-anchor": "middle", "font-size": 10,
        "font-weight": "700", fill: ink, opacity: 0
      });
      dots.push(vlbl);
    });

    var len = path.getTotalLength ? path.getTotalLength() : iw;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;

    return function () {
      tween(1600, function (p) {
        clipRect.setAttribute("width", pad.l + iw * p - pad.l + 2);
        path.style.strokeDashoffset = len * (1 - p);
        dots.forEach(function (dnode, i) {
          var show = (i % 2 === 0) ? (i / 2) : ((i - 1) / 2);
          var threshold = (show + 0.4) / c.values.length;
          dnode.setAttribute("opacity", p >= threshold ? 1 : 0);
        });
      });
    };
  }

  /* ======================= RADAR ======================= */
  function radar(host) {
    var c = cfg(host, { labels: [], series: [], size: 340, rings: 4 });
    var svg = svgRoot(host);
    var S = c.size, cx = S / 2, cy = S / 2, R = S / 2 - 54;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var gridCol = isDark(host) ? "rgba(255,255,255,.14)" : "rgba(10,21,38,.11)";
    var n = c.labels.length;
    var max = c.max || 100;

    svg.setAttribute("viewBox", "0 0 " + S + " " + S);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "radar chart");

    function angle(i) { return (Math.PI * 2 * i) / n - Math.PI / 2; }
    function pt(i, r) { return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r]; }

    for (var ring = 1; ring <= c.rings; ring++) {
      var rr = (R / c.rings) * ring;
      var d = "";
      for (var i = 0; i < n; i++) {
        var p = pt(i, rr);
        d += (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1) + " ";
      }
      el("path", { d: d + "Z", fill: "none", stroke: gridCol, "stroke-width": 1 }, svg);
    }
    for (var k = 0; k < n; k++) {
      var e = pt(k, R);
      el("line", { x1: cx, y1: cy, x2: e[0], y2: e[1], stroke: gridCol, "stroke-width": 1 }, svg);
      var lp = pt(k, R + 26);
      var anchor = Math.abs(lp[0] - cx) < 6 ? "middle" : (lp[0] > cx ? "start" : "end");
      txt(svg, c.labels[k], {
        x: lp[0], y: lp[1] + 4, "text-anchor": anchor, "font-size": 10.5,
        fill: ink, "font-weight": "600"
      });
    }

    var polys = [];
    c.series.forEach(function (s, si) {
      var color = s.color || PALETTE[si % PALETTE.length];
      var poly = el("polygon", {
        points: s.values.map(function () { return cx + "," + cy; }).join(" "),
        fill: color, "fill-opacity": s.filled === false ? 0 : .17,
        stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round"
      }, svg);
      var dotsG = el("g", null, svg);
      var sdots = s.values.map(function () {
        return el("circle", { cx: cx, cy: cy, r: 3.6, fill: color, opacity: 0 }, dotsG);
      });
      polys.push({ node: poly, dots: sdots, values: s.values, color: color });
    });

    return function () {
      tween(1400, function (p) {
        polys.forEach(function (pl) {
          var pts = pl.values.map(function (v, i) {
            var q = pt(i, (Math.max(0, Math.min(max, v)) / max) * R * p);
            return q[0].toFixed(1) + "," + q[1].toFixed(1);
          });
          pl.node.setAttribute("points", pts.join(" "));
          pl.dots.forEach(function (dt, i) {
            var q = pt(i, (Math.max(0, Math.min(max, pl.values[i])) / max) * R * p);
            dt.setAttribute("cx", q[0]); dt.setAttribute("cy", q[1]);
            dt.setAttribute("opacity", p);
          });
        });
      });
    };
  }

  /* ======================= GANTT ======================= */
  function gantt(host) {
    var c = cfg(host, { rows: [], total: 24, unit: "week", width: 620, rowH: 40, barH: 22 });
    var svg = svgRoot(host);
    var W = c.width;
    var pad = { t: 34, r: 18, b: 30, l: 158 };
    var H = pad.t + c.rows.length * c.rowH + pad.b;
    var iw = W - pad.l - pad.r;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var gridCol = isDark(host) ? "rgba(255,255,255,.12)" : "rgba(10,21,38,.09)";

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "timeline chart");

    // vertical gridlines every 4 units
    var ticks = Math.ceil(c.total / 4);
    for (var t = 0; t <= ticks; t++) {
      var x = pad.l + (iw / c.total) * (t * 4);
      if (x > W - pad.r) break;
      el("line", { x1: x, y1: pad.t - 12, x2: x, y2: H - pad.b + 4, stroke: gridCol, "stroke-width": 1 }, svg);
      txt(svg, (t * 4 === 0 ? "start" : t * 4 + " " + c.unit + (t * 4 > 1 ? "s" : "")), {
        x: x, y: pad.t - 18, "text-anchor": "middle", "font-size": 9.5, fill: muted, "letter-spacing": ".05em"
      });
    }

    var nodes = [];
    c.rows.forEach(function (row, i) {
      var y = pad.t + i * c.rowH;
      var bh = Math.min(c.barH, c.rowH - 14);
      var by = y + (c.rowH - bh) / 2;
      el("rect", { x: pad.l, y: by, width: iw, height: bh, rx: bh / 2, fill: isDark(host) ? "rgba(255,255,255,.05)" : "rgba(10,21,38,.045)" }, svg);
      txt(svg, row.label, {
        x: pad.l - 14, y: by + bh / 2 + 4, "text-anchor": "end",
        "font-size": 11, fill: ink, "font-weight": "600"
      });
      var x0 = pad.l + (iw / c.total) * row.start;
      var w = (iw / c.total) * row.dur;
      var bar = el("rect", { x: x0, y: by, width: 0, height: bh, rx: bh / 2, fill: row.color || PALETTE[i % PALETTE.length] }, svg);
      if (row.note) {
        txt(svg, row.note, {
          x: x0 + w + 9, y: by + bh / 2 + 4, "font-size": 9.5, fill: muted, opacity: 0, class: "gantt-note"
        });
      }
      nodes.push({ node: bar, w: w });
    });

    return function () {
      tween(1300, function (p) {
        nodes.forEach(function (n) { n.node.setAttribute("width", n.w * p); });
        var notes = svg.querySelectorAll(".gantt-note");
        for (var i = 0; i < notes.length; i++) notes[i].setAttribute("opacity", p > .8 ? (p - .8) * 5 : 0);
      });
    };
  }

  /* ================== STACKED (per-category) ================== */
  function stack(host) {
    var c = cfg(host, { labels: [], series: [], unit: "", width: 470, height: 260, grid: 4 });
    var svg = svgRoot(host);
    var W = c.width, H = c.height;
    var ink = isDark(host) ? LIGHT_INK : DARK_INK;
    var muted = isDark(host) ? "#a9bcd4" : "#55657f";
    var gridCol = isDark(host) ? "rgba(255,255,255,.12)" : "rgba(10,21,38,.09)";
    var totals = c.labels.map(function (_, i) {
      return c.series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0);
    });
    var sc = axisScale(totals, c.grid, c.unit, 1.15);
    var max = sc.max || 1;
    var gridN = sc.grid;
    var pad = { t: 30, r: 16, b: 52, l: 48 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "stacked bar chart");

    for (var i = 0; i <= gridN; i++) {
      var y = pad.t + ih - (ih / gridN) * i;
      el("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: gridCol, "stroke-width": 1 }, svg);
      txt(svg, fmt((max / gridN) * i) + c.unit, {
        x: pad.l - 9, y: y + 4, "text-anchor": "end", "font-size": 9.5, fill: muted
      });
    }

    var slot = iw / c.labels.length;
    var bw = Math.min(64, slot * 0.55);
    var segs = [];
    c.labels.forEach(function (lab, li) {
      var x = pad.l + slot * li + (slot - bw) / 2;
      var lbl = txt(svg, lab, {
        x: x + bw / 2, y: pad.t + ih + 19, "text-anchor": "middle", "font-size": 10, fill: muted
      });
      wrapLabel(lbl, lab, 12, pad.t + ih + 19, 11);

      var acc = 0;
      var total = totals[li];
      c.series.forEach(function (s, si) {
        var v = s.values[li] || 0;
        var segH = (v / max) * ih;
        var yTop = pad.t + ih - (acc / max) * ih - segH;
        var rct = el("rect", {
          x: x, y: pad.t + ih, width: bw, height: 0, rx: 3,
          fill: s.color || PALETTE[si % PALETTE.length], opacity: .95
        }, svg);
        segs.push({ node: rct, h: segH, y: yTop });
        acc += v;
      });
      // total label
      txt(svg, fmt(total) + c.unit, {
        x: x + bw / 2, y: pad.t + ih - (total / max) * ih - 9, "text-anchor": "middle",
        "font-size": 11, "font-weight": "700", fill: ink, opacity: 0, class: "stack-total"
      });
    });

    return function () {
      tween(1350, function (p) {
        segs.forEach(function (s) {
          var h = s.h * p;
          s.node.setAttribute("height", h);
          s.node.setAttribute("y", s.y + s.h - h);
        });
        var tt = svg.querySelectorAll(".stack-total");
        for (var i = 0; i < tt.length; i++) tt[i].setAttribute("opacity", p > .7 ? (p - .7) / .3 : 0);
      });
    };
  }

  /* ==================== REGISTER / RUN ==================== */

  var RENDERERS = {
    donut: donut,
    "donut-multi": donutMulti,
    bars: bars,
    grouped: grouped,
    line: line,
    area: function (h) {
      var conf = h.getAttribute("data-chart-config");
      if (!conf) h.setAttribute("data-chart-config", '{"area":true}');
      else if (conf.indexOf('"area"') === -1) h.setAttribute("data-chart-config", conf.replace(/^\{/, '{"area":true,'));
      return line(h);
    },
    radar: radar,
    gantt: gantt,
    stack: stack
  };

  function runCounter(node) {
    var to = parseFloat(node.getAttribute("data-count-to")) || 0;
    var dec = parseInt(node.getAttribute("data-count-decimals") || "0", 10);
    var suffix = node.getAttribute("data-count-suffix") || "";
    var prefix = node.getAttribute("data-count-prefix") || "";
    if (REDUCED) { node.textContent = prefix + fmt(to, dec) + suffix; return; }
    tween(1600, function (p) {
      node.textContent = prefix + fmt(to * p, dec) + suffix;
    });
  }

  function activate(node) {
    if (node.dataset.animated === "1") return;
    node.dataset.animated = "1";

    if (node.hasAttribute("data-count-to")) { runCounter(node); return; }

    if (node.hasAttribute("data-fill")) {
      var v = node.getAttribute("data-fill");
      requestAnimationFrame(function () { node.style.width = v; });
      return;
    }

    var type = node.getAttribute("data-chart");
    if (type && RENDERERS[type]) {
      var play = RENDERERS[type](node);
      if (play) requestAnimationFrame(play);
    }
  }

  function init() {
    var targets = document.querySelectorAll("[data-chart], [data-count-to], [data-fill]");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, activate);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var node = entry.target;
          var delay = parseInt(node.getAttribute("data-delay") || "0", 10) + i * 60;
          setTimeout(function () { activate(node); }, Math.min(delay, 600));
          io.unobserve(node);
        }
      });
    }, { threshold: 0.22, rootMargin: "0px 0px -8% 0px" });

    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  window.VakuusCharts = { init: init, palette: PALETTE };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
