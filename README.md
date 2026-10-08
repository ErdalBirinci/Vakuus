# Vakuus — Certification Advisory (static site)

English-language marketing site for **Vakuus**: end-to-end certification consulting for Finnish
startups and small / mid-sized companies — from the first gap analysis to every surveillance audit.
The site contains **no pricing information anywhere**; every page points the visitor to a
discovery meeting instead.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home: positioning, 7-phase journey preview, services overview, audience, credibility, FAQ |
| `services.html` | Six service blocks (`#gap`, `#isms`, `#risk`, `#audit`, `#stage`, `#regulatory`) |
| `process.html` | Detailed 7-phase process, gantt timeline, effort split, sign-off gates, FAQ |
| `standards.html` | Standards library (ISO 27001/42001/27701/20000-1, SOC 2, NIST CSF, NIS2, EU AI Act, GDPR) |
| `about.html` | Erdal Birinci: story, professional competencies, credentials, working principles |
| `contact.html` | Booking page: agenda, Calendly slot picker, contact routes, FAQ |

## Assets

```
assets/css/style.css   design system (Aurora/Nordic), responsive, print + reduced-motion safe
assets/js/config.js    ← the only file you normally need to edit
assets/js/charts.js    zero-dependency SVG chart kit (donut, donut-multi, bars, grouped,
                       line/area, radar, gantt, stacked) + animated counters
assets/js/app.js       header, mobile nav, reveal-on-scroll, contact data injection, Calendly
```

No build step, no framework, no npm. Copy the folder to any static host.

## 1. Calendly — connected

`assets/js/config.js` holds the scheduling link used by the booking panel:

```js
calendly: {
  url: "https://calendly.com/erdalbirinci/30min",   // live scheduling page
  placeholder: false,                               // true = built-in fallback panel
  text: "…"
}
```

With `placeholder: false`, `contact.html` embeds the real Calendly scheduler in place (if the
script fails to load, the designed panel with an “Open the calendar” button comes back
automatically). The widget sizes its iframe from the container's **explicit height**:
`.calendly-inline-widget` in `assets/css/style.css` sets `height: 700px` (780px on mobile).
Removing that height makes the scheduler fall back to a 150px iframe and hang behind its
loading spinner — keep it.

Contact details, company name and domain live in the same file — they are injected into every
page through `data-contact` / `data-company` attributes, so nothing needs to be changed page by page.

## 2. Run locally

```powershell
python -m http.server 8098 --bind 127.0.0.1   # from this folder
# open http://127.0.0.1:8098/index.html
```

Opening the `.html` files directly (double-click) also works — there is no fetch/XHR anywhere.

## 3. Deploy

Works as-is on Netlify, Vercel, Cloudflare Pages, GitHub Pages or any nginx/Apache folder.
`robots.txt` and `sitemap.xml` are included; change `https://vakuus.fi` to the final domain
(also the `<link rel="canonical">` tags in each page head).

## Design notes

- **Colour**: deep navy base, aurora gradient accents (cyan → blue → violet, teal highlights).
- **Type**: Sora (headings) / Inter (body) / JetBrains Mono (labels), loaded from Google Fonts
  with system fallbacks, so the site still renders correctly offline.
- **Charts**: hand-built SVG, animated when scrolled into view. Every chart carries a
  footnote stating whether the numbers are *reference values*, *indicative* or a *model* —
  no invented market statistics are presented as facts.
- **Accessibility**: semantic landmarks, skip link, `aria-label` on every chart, visible focus
  rings, `prefers-reduced-motion` honoured (animations switch off), AA-level contrast.
- **Print**: header/footer/actions are hidden, dark sections invert for printing.
- **Price information**: none. Verified by grep — no price, fee, rate, currency or quotation
  wording exists in any page; commercial scoping always happens inside a meeting.
