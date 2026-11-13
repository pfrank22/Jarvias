// ─────────────────────────────────────────────────────────────
//  PRICING & BUSINESS CONFIG: the single source of truth for the
//  website, the quote calculator, and the print materials.
//  Edit numbers here; everything else updates automatically.
//
//  price     = what the customer pays (installed, one-time)
//  matCost   = your material cost per unit (track/channel, pixel
//              LEDs, wire, power supply share, fasteners, waste)
//  laborHrs  = crew-hours per unit (2-person crew = 2 crew-hours/hour)
//
//  Starting assumptions for the Twin Cities market (2026). Replace
//  them with your supplier quotes and your own install times.
// ─────────────────────────────────────────────────────────────
window.PRICING = {
  business: {
    name: "North Star Holiday Lighting",          // public name (MN assumed name / DBA)
    legal: "North Star Lighting LLC",             // legal entity
    tagline: "Light the way home.",
    phone: "(612) 555-0142",                      // ← replace with your real number
    email: "hello@northstarholidaylighting.com",  // ← replace once the domain is set up
    website: "northstarholidaylighting.com",      // used on print materials + QR codes
    serviceArea: "Minneapolis–St. Paul and communities within about 70 miles",
  },

  minimumJob: 2495,        // smallest job you'll take (covers controller + setup + travel)
  rangeSpread: 0.08,       // estimate shown as ±8%
  laborCostPerHr: 32,      // loaded wage (pay + payroll tax + workers' comp)

  roofline: {
    perFoot: 29,           // installed: color-matched channel, RGBW pixels, 1 controller
    matCostPerFoot: 7.5,
    laborHrsPerFoot: 0.09,
    presets: [
      { label: "Front of house", feet: 80 },
      { label: "Front + garage", feet: 115 },
      { label: "Front + sides", feet: 170 },
      { label: "Whole home", feet: 240 },
    ],
  },

  // Multipliers applied to the roofline price
  roofFactors: {
    twoStory: 1.12,        // second-story runs: taller ladders, lift, more time
    steep: 1.08,           // pitch over 8/12 or many dormers and peaks
  },

  items: [
    { id: "zones",   label: "Extra control zone",           note: "e.g. garage or back of house on its own schedule", unit: "zone", price: 295, matCost: 120, laborHrs: 1.0 },
    { id: "accent",  label: "Patio, deck or soffit accent", note: "Same system, under a porch, deck rail or overhang",  unit: "ft",   price: 24,  matCost: 6,   laborHrs: 0.07, step: 5 },
    { id: "garage",  label: "Detached garage or shed",      note: "Separate run with its own power supply",            unit: "building", price: 650, matCost: 210, laborHrs: 3.0 },
  ],

  addons: [
    { id: "outlet",   label: "New outdoor outlet",          flat: 375, matCost: 300, laborHrs: 0, desc: "Only if needed. Installed by a licensed electrician" },
    { id: "warranty", label: "10-year labor warranty",      flat: 395, matCost: 60,  laborHrs: 0, desc: "Extends the standard 2-year labor coverage" },
    { id: "voice",    label: "Voice assistant setup",       flat: 0,   matCost: 0,   laborHrs: 0.3, desc: "Free: Alexa / Google Home scenes" },
  ],

  discounts: [
    { id: "neighbor", label: "Neighbor referral",               flat: 250,  desc: "$250 off when a neighbor on your street has North Star" },
    { id: "offseason",label: "Off-season install (Jan–Aug)",    pct: 0.07,  desc: "Save 7% when you install outside the fall rush" },
    { id: "service",  label: "Veteran or first responder",      pct: 0.05,  desc: "Save 5%, our thanks" },
  ],
  maxDiscountPct: 0.15,

  // Example financing shown in the estimate. Use your lender's real terms.
  financing: { apr: 0.0999, months: 60, label: "with approved financing" },

  warranty: "5-year product · 2-year labor",
};
