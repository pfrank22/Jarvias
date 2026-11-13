(() => {
  const P = window.PRICING, B = P.business, NS = window.NS;
  const $ = (s, r = document) => r.querySelector(s);
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const ownerMode = new URLSearchParams(location.search).has("owner");

  // ── Business info ───────────────────────────────────────────
  document.querySelectorAll("[data-biz]").forEach((el) => (el.textContent = B[el.dataset.biz] || ""));
  document.querySelectorAll("[data-biz-href]").forEach((el) => {
    const v = B[el.dataset.bizHref];
    el.href = el.dataset.bizHref === "phone" ? "tel:" + v.replace(/[^\d+]/g, "") : "mailto:" + v;
  });
  document.querySelectorAll("[data-warranty]").forEach((el) => (el.textContent = P.warranty));
  $("#year").textContent = new Date().getFullYear();

  // ── Scenes ──────────────────────────────────────────────────
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroLights = NS.house($("#heroHouse"), 560, 340);
  const sw = $("#sceneSwitch");
  let cur = 0, timer;
  const show = (i, user) => {
    cur = i;
    NS.paint(heroLights, NS.SCENES[i].colors);
    $("#sceneName").textContent = NS.SCENES[i].name;
    [...sw.children].forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
    if (user) clearInterval(timer);
  };
  NS.SCENES.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = s.name; b.onclick = () => show(i, true);
    sw.appendChild(b);
  });
  show(0);
  if (!reduce) timer = setInterval(() => show((cur + 1) % NS.SCENES.length), 2600);

  NS.house($("#dayHouse"), 360, 230, { day: true });
  NS.paint(NS.house($("#nightHouse"), 360, 230), ["#ffd9a0"]);

  // ── Build the calculator form ───────────────────────────────
  const roofFeet = $("#roofFeet");
  P.roofline.presets.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = `${p.label} (~${p.feet} ft)`;
    b.onclick = () => { roofFeet.value = p.feet; update(); };
    $("#roofPresets").appendChild(b);
  });

  const qty = {};
  P.items.forEach((it) => {
    qty[it.id] = 0;
    const row = document.createElement("div");
    row.className = "row";
    const unit = it.unit === "ft" ? "ft" : it.unit;
    row.innerHTML = `<span>${it.label}<small>${money(it.price)} / ${unit} · ${it.note}</small></span>
      <span class="stepper">
        <button type="button" aria-label="Less ${it.label}">−</button>
        <input type="number" min="0" value="0" inputmode="numeric" id="q-${it.id}" aria-label="${it.label} quantity">
        <button type="button" aria-label="More ${it.label}">+</button>
      </span>`;
    const [minus, input, plus] = row.querySelectorAll("button, input");
    const step = it.step || 1;
    const set = (v) => { qty[it.id] = Math.max(0, +v || 0); input.value = qty[it.id]; update(); };
    minus.onclick = () => set(qty[it.id] - step);
    plus.onclick = () => set(qty[it.id] + step);
    input.oninput = () => set(input.value);
    $("#itemRows").appendChild(row);
  });

  const checkRow = (opt, container, isAddon) => {
    const l = document.createElement("label");
    l.className = "check";
    l.htmlFor = "opt-" + opt.id;
    const price = isAddon && opt.flat ? ` · +${money(opt.flat)}` : "";
    l.innerHTML = `<input type="checkbox" id="opt-${opt.id}"><span>${opt.label}<small>${opt.desc || ""}${price}</small></span>`;
    l.querySelector("input").onchange = update;
    container.appendChild(l);
  };
  P.addons.forEach((a) => checkRow(a, $("#addonRows"), true));
  P.discounts.forEach((d) => checkRow(d, $("#discountRows"), false));
  [roofFeet, $("#twoStory"), $("#steep")].forEach((el) => el.addEventListener("input", update));

  // ── Pricing engine ──────────────────────────────────────────
  function calc(s) {
    const lines = [];
    let sub = 0, mat = 0, hrs = 0;
    let mult = 1;
    if (s.twoStory) mult *= P.roofFactors.twoStory;
    if (s.steep) mult *= P.roofFactors.steep;
    if (s.roofFeet > 0) {
      const amt = s.roofFeet * P.roofline.perFoot * mult;
      lines.push([`Roofline lighting, ${s.roofFeet} ft${mult > 1 ? " (height/pitch adj.)" : ""}`, amt]);
      sub += amt; mat += s.roofFeet * P.roofline.matCostPerFoot; hrs += s.roofFeet * P.roofline.laborHrsPerFoot * mult;
    }
    P.items.forEach((it) => {
      const q = s.qty[it.id] || 0;
      if (!q) return;
      lines.push([`${it.label} × ${q}${it.unit === "ft" ? " ft" : ""}`, q * it.price]);
      sub += q * it.price; mat += q * it.matCost; hrs += q * it.laborHrs;
    });
    P.addons.forEach((a) => {
      if (!s.addons[a.id]) return;
      lines.push([a.label, a.flat || 0]);
      sub += a.flat || 0; mat += a.matCost || 0; hrs += a.laborHrs || 0;
    });
    if (sub > 0 && sub < P.minimumJob) { lines.push(["Minimum project", P.minimumJob - sub, "min"]); sub = P.minimumJob; }
    let pct = 0, flat = 0;
    P.discounts.forEach((d) => { if (s.discounts[d.id]) { pct += d.pct || 0; flat += d.flat || 0; } });
    let disc = sub * pct + flat;
    disc = Math.min(disc, sub * P.maxDiscountPct);
    if (disc && sub) { lines.push(["Savings", -disc, "disc"]); sub -= disc; }
    return { total: sub, lines, mat, hrs };
  }
  const monthly = (amt) => {
    const r = P.financing.apr / 12, n = P.financing.months;
    return r ? amt * r / (1 - Math.pow(1 + r, -n)) : amt / n;
  };

  function readState() {
    const s = { roofFeet: Math.max(0, +roofFeet.value || 0), twoStory: $("#twoStory").checked, steep: $("#steep").checked, qty: { ...qty }, addons: {}, discounts: {} };
    P.addons.forEach((a) => (s.addons[a.id] = $("#opt-" + a.id).checked));
    P.discounts.forEach((d) => (s.discounts[d.id] = $("#opt-" + d.id).checked));
    return s;
  }

  $("#finTerms").textContent = `${(P.financing.apr * 100).toFixed(2)}% APR for ${P.financing.months} months`;

  function update() {
    const { total, lines, mat, hrs } = calc(readState());
    $("#total").textContent = money(total);
    const lo = total * (1 - P.rangeSpread), hi = total * (1 + P.rangeSpread);
    $("#range").textContent = total ? `Typical range ${money(lo)} – ${money(hi)}` : "Enter your roofline to see a price";
    $("#monthly").innerHTML = total ? `or about <b>${money(monthly(total))}/mo</b> ${P.financing.label}` : "";
    $("#breakdown").innerHTML = lines.map(([l, a, cls]) => `<tr class="${cls || ""}"><td>${l}</td><td>${a < 0 ? "−" + money(-a) : money(a)}</td></tr>`).join("");
    $("#estimateField").value = total ? `${money(total)} (${lines.map((l) => l[0]).join("; ")})` : "";
    if (ownerMode) {
      const labor = hrs * P.laborCostPerHr, gp = total - mat - labor;
      const panel = $("#ownerPanel");
      panel.hidden = false;
      panel.innerHTML = `<h4>Owner view (customers don't see this)</h4><dl>
        <dt>Crew-hours</dt><dd>${hrs.toFixed(1)} h</dd>
        <dt>Install days, 2-person crew</dt><dd>${(hrs / 16).toFixed(1)}</dd>
        <dt>Materials</dt><dd>${money(mat)}</dd>
        <dt>Labor @ ${money(P.laborCostPerHr)}/h</dt><dd>${money(labor)}</dd>
        <dt><strong>Gross profit</strong></dt><dd><strong>${money(gp)}</strong></dd>
        <dt>Gross margin</dt><dd>${total ? Math.round(gp / total * 100) : 0}%</dd></dl>`;
    }
  }
  $("#printBtn").onclick = () => window.print();

  // ── Contact form: opens an email by default ─────────────────
  // To collect leads automatically, point the form at Formspree /
  // Netlify Forms / your CRM's web form and remove this handler.
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = [...f.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
    location.href = `mailto:${B.email}?subject=${encodeURIComponent("Design visit request: " + f.get("name"))}&body=${encodeURIComponent(body)}`;
    $("#contactMsg").textContent = "Thanks! Your email app should open with your request ready to send. Or call or text us anytime.";
  });

  update();
})();
