/* ==========================================================================
   VAKUUS — site configuration
   Edit THIS file only. Nothing else needs to change when the Calendly link
   or contact details change.
   ========================================================================== */
window.VAKUUS_CONFIG = {
  /* ------------------------------------------------------------------
     Meeting booking (Calendly) — CONNECTED
     `url` is the live Calendly scheduling page; with
     `placeholder: false` the contact page embeds the real scheduler
     (every "Book a Meeting" button opens the same link).
     Set `placeholder: true` to fall back to the built-in booking panel.
     ------------------------------------------------------------------ */
  calendly: {
    url: "https://calendly.com/erdalbirinci/30min",
    placeholder: false,
    text: "Pick a time that suits you — 30 minutes, video call, no obligation."
  },

  contact: {
    name: "Erdal Birinci",
    role: "Founder & Principal Compliance Consultant",
    email: "erdalbirinci@gmail.com",
    phone: "+358 413191446",
    phoneHref: "+358413191446",
    linkedin: "https://linkedin.com/in/codeforwhat/",
    location: "Espoo, Finland",
    timezone: "Europe/Helsinki (EET/EEST)",
    languages: "English · Turkish · Finnish market focus"
  },

  company: {
    name: "Vakuus",
    tagline: "Certification Advisory for Finnish startups & SMEs",
    legal: "Vakuus — independent certification advisory",
    domain: "vakuus.fi"
  }
};
