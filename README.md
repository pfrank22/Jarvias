# North Star Holiday Lighting

Permanent, app-controlled roofline lighting for homes in Minneapolis–St. Paul and about 70 miles around.
Legal entity: **North Star Lighting LLC**. Public name (Minnesota assumed name): **North Star Holiday Lighting**.

| Path | What's inside |
|---|---|
| [`docs/business-plan.md`](docs/business-plan.md) | Market, competitors, sourcing, pricing, unit economics, startup costs, MN licensing, operations, marketing, financials |
| [`docs/launch-kit.md`](docs/launch-kit.md) | LLC + DBA setup checklist, brand basics, ready-to-use copy, customer agreement template, crew checklists |
| [`docs/brand-guide.html`](docs/brand-guide.html) | Visual brand guide: logo, colors, type, voice, mockups (open in a browser) |
| [`docs/brand-directions.html`](docs/brand-directions.html) | Earlier name explorations (Borealis, Eaveline, Ten Thousand Lights), kept for reference |
| [`site/`](site/) | Website with holiday scene switcher and **instant price calculator** |
| [`site/brand/`](site/brand/) | Logo mark (`mark.svg` for dark backgrounds, `mark-light.svg` for light) |
| [`site/print/`](site/print/) | Print-ready **door hanger** (4.25″×11″) and **yard sign** (24″×18″) with QR codes |

## The website

Static HTML/CSS/JS with no build step. Open `site/index.html` to preview it.

- **One file to edit:** `site/pricing.js` holds the business name, phone, email, website, per-foot price, options, discounts, financing example and warranty. The site, calculator and print pieces all read it.
- **Owner mode:** `index.html?owner` shows materials, crew-hours, labor and gross margin for any quote.
- **Lead form:** opens the customer's email app by default. To collect leads automatically, point `#contactForm` at Formspree or your CRM's web form and remove the submit handler at the bottom of `app.js`.

### Print materials

Open `site/print/door-hanger.html` or `site/print/yard-sign.html` in Chrome and choose **Print → Save as PDF** (margins: none, background graphics: on). Update the phone and domain in `pricing.js` first; the QR code points to `https://<website>/#quote`.

### Deploy

Any static host works. Point it at the `site/` folder (Vercel: set the root directory to `site`; Netlify: drag and drop `site`).
