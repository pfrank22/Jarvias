// ─────────────────────────────────────────────────────────────
//  PRICING CONFIG — the single source of truth for the quote
//  calculator. Edit numbers here; the site updates automatically.
//
//  price      = what the customer pays (lease model: install,
//               maintenance, takedown, and storage included)
//  matCost    = your amortized material cost per unit per season
//               (lights reused ~3 seasons, so ~1/3 of purchase cost
//               plus clips, cords, timers, and spoilage)
//  laborHrs   = crew-hours per unit (install + takedown combined)
// ─────────────────────────────────────────────────────────────
window.PRICING = {
  business: {
    name: "North Star Holiday Lighting",
    phone: "(555) 555-0142",
    email: "hello@example.com",
    website: "northstarholidaylighting.com",  // used on print materials + QR codes
    serviceArea: "Your City, Minnesota & surrounding suburbs",
  },

  minimumJob: 599,        // smallest job you'll take
  rangeSpread: 0.10,      // estimate shown as ±10%
  laborCostPerHr: 28,     // loaded wage (pay + payroll tax + workers' comp)

  roofline: {
    perFoot: 4.75,        // C9 LED on roofline/gutters, includes clips
    matCostPerFoot: 0.85,
    laborHrsPerFoot: 0.035,
    presets: [            // "Not sure?" helper
      { label: "Small ranch / townhome", feet: 110 },
      { label: "Average one-story", feet: 150 },
      { label: "Average two-story", feet: 190 },
      { label: "Large / complex roof", feet: 260 },
    ],
  },

  // Multipliers applied to roofline only
  roofFactors: {
    steep: 1.20,          // pitch over 8/12 or needs roof harness
    secondStory: 1.10,    // significant second-story runs
  },

  items: [
    // id, label, unit, price, matCost, laborHrs
    { id: "peaks",    label: "Roof peaks & ridgelines",        unit: "peak",   price: 85,  matCost: 12, laborHrs: 0.6 },
    { id: "windows",  label: "Window / door outlines",         unit: "window", price: 65,  matCost: 8,  laborHrs: 0.4 },
    { id: "treeSm",   label: "Tree wrap, small (under 10 ft)", unit: "tree",   price: 135, matCost: 22, laborHrs: 1.0 },
    { id: "treeMd",   label: "Tree wrap, medium (10–20 ft)",   unit: "tree",   price: 275, matCost: 45, laborHrs: 2.0 },
    { id: "treeLg",   label: "Tree wrap, large (20 ft+)",      unit: "tree",   price: 475, matCost: 80, laborHrs: 3.5 },
    { id: "trunk",    label: "Trunk-only wrap",                unit: "tree",   price: 85,  matCost: 12, laborHrs: 0.6 },
    { id: "bushes",   label: "Bushes / shrubs (net lights)",   unit: "bush",   price: 60,  matCost: 9,  laborHrs: 0.3 },
    { id: "wreaths",  label: "Lit wreaths (36\")",             unit: "wreath", price: 145, matCost: 35, laborHrs: 0.4 },
    { id: "garland",  label: "Lit garland (door/railing)",     unit: "ft",     price: 16,  matCost: 3,  laborHrs: 0.08 },
    { id: "pathway",  label: "Pathway stakes (before ground freezes)", unit: "ft",     price: 10,  matCost: 1.6,laborHrs: 0.05 },
  ],

  addons: [
    { id: "own",      label: "Keep the lights (purchase instead of lease)", pct: 0.35, desc: "+35%: the lights are yours after takedown" },
    { id: "smart",    label: "Smart timer / app control",   flat: 95,  matCost: 30, laborHrs: 0.3, desc: "Wi-Fi plug with schedule & app" },
    { id: "power",    label: "Extra outdoor outlet needed", flat: 0,   desc: "We'll assess on-site (licensed electrician if required)" },
  ],

  discounts: [
    { id: "early",    label: "Early-bird (booked before Oct 1)", pct: 0.10 },
    { id: "returning",label: "Returning customer / 3-year agreement", pct: 0.10 },
    { id: "neighbor", label: "Neighbor referral (2+ homes on same street)", pct: 0.05 },
  ],
};
