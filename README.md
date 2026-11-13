# North Star Holiday Lighting

Everything needed to launch **North Star Holiday Lighting**, a residential Christmas light installation company in Minnesota.

| Folder | What's inside |
|---|---|
| [`docs/business-plan.md`](docs/business-plan.md) | Model, pricing, startup costs, operations, marketing, financials, risks, and a fast-start plan for this season |
| [`docs/launch-kit.md`](docs/launch-kit.md) | Name ideas, branding, flyer and social copy, a customer agreement template, crew checklists |
| [`site/`](site/) | Marketing website with a built-in **instant quote calculator** |
| [`site/print/`](site/print/) | Print-ready **door hanger** (4.25″×11″) and **yard sign** (24″×18″) with QR codes |

## The website

A static site (HTML/CSS/JS, no build step). Open `site/index.html` in a browser to preview it.

- **Change prices, business name, phone, or email:** edit `site/pricing.js`. Package prices on the page are calculated from these numbers too.
- **Owner mode:** open `index.html?owner` to see crew-hours, material cost, and gross margin for any quote. Use it on a tablet when quoting at the door.
- **Print a quote:** the "Print / save quote" button prints a clean, customer-ready estimate (or save it as a PDF).
- **Lead form:** by default it opens the customer's email app with the request filled in. To collect leads automatically, create a free [Formspree](https://formspree.io) form, set `action="https://formspree.io/f/XXXX" method="POST"` on `#contactForm` in `index.html`, and remove the submit handler at the bottom of `app.js`.

### Print materials

Open `site/print/door-hanger.html` or `site/print/yard-sign.html` in Chrome and choose **Print → Save as PDF** (margins: none, background graphics: on). Send the PDF to a print shop. The phone number, website and QR code come from `site/pricing.js`, so update that file first.

### Deploy

Any static host works. Point it at the `site/` folder:
- **Vercel:** import the repo and set the root directory to `site`
- **Netlify:** drag and drop the `site` folder
- **GitHub Pages:** serve from `/site`
