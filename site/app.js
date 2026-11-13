(() => {
  const P = window.PRICING;
  const $ = (s, r = document) => r.querySelector(s);
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const ownerMode = new URLSearchParams(location.search).has("owner");
  const MAX_DISCOUNT = 0.20;

  // ── Business info ───────────────────────────────────────────
  document.querySelectorAll("[data-biz]").forEach((el) => (el.textContent = P.business[el.dataset.biz]));
  document.querySelectorAll("[data-biz-href]").forEach((el) => {
    const v = P.business[el.dataset.bizHref];
    el.href = el.dataset.bizHref === "phone" ? "tel:" + v.replace(/[^\d+]/g, "") : "mailto:" + v;
  });
  $("#year").textContent = new Date().getFullYear();

  // ── Hero bulbs along the roofline ───────────────────────────
  const bulbs = $("#bulbs");
  const colors = ["#ff5a5f", "#ffd27a", "#3ddc97", "#6cb8ff", "#ffd27a"];
  const roofPts = [[120, 150], [240, 70], [360, 150]];
  const addBulbs = (a, b, n, offset = 0) => {
    for (let i = 0; i <= n; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y + 4); c.setAttribute("r", 4);
      c.setAttribute("fill", colors[(i + offset) % colors.length]);
      c.style.animationDelay = ((i * 0.37) % 2.4) + "s";
      c.style.filter = "drop-shadow(0 0 4px " + colors[(i + offset) % colors.length] + ")";
      bulbs.appendChild(c);
    }
  };
  addBulbs(roofPts[0], roofPts[1], 14);
  addBulbs(roofPts[1], roofPts[2], 14, 3);
  addBulbs([350, 175], [435, 120], 10, 1);
  addBulbs([435, 120], [520, 175], 10, 2);

  // ── Build form ──────────────────────────────────────────────
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
    row.innerHTML = `<span>${it.label}<small>${money(it.price)} / ${it.unit}</small></span>
      <span class="stepper">
        <button type="button" aria-label="Fewer">−</button>
        <input type="number" min="0" value="0" inputmode="numeric" aria-label="${it.label} quantity">
        <button type="button" aria-label="More">+</button>
      </span>`;
    const [minus, input, plus] = row.querySelectorAll("button, input");
    const step = it.unit === "ft" ? 5 : 1;
    const set = (v) => { qty[it.id] = Math.max(0, +v || 0); input.value = qty[it.id]; update(); };
    minus.onclick = () => set(qty[it.id] - step);
    plus.onclick = () => set(qty[it.id] + step);
    input.oninput = () => set(input.value);
    it._set = set;
    $("#itemRows").appendChild(row);
  });

  const checkRow = (opt, container) => {
    const l = document.createElement("label");
    l.className = "check";
    const detail = opt.desc || (opt.pct ? `Save ${Math.round(opt.pct * 100)}%` : "");
    l.innerHTML = `<input type="checkbox" id="opt-${opt.id}"><span>${opt.label}<small>${detail}</small></span>`;
    l.querySelector("input").onchange = update;
    container.appendChild(l);
  };
  P.addons.forEach((a) => checkRow(a, $("#addonRows")));
  P.discounts.forEach((d) => checkRow(d, $("#discountRows")));

  [roofFeet, $("#steep"), $("#secondStory")].forEach((el) => el.addEventListener("input", update));

  // ── Pricing engine (pure, so packages can reuse it) ─────────
  function calc(state) {
    const lines = [];
    let sub = 0, mat = 0, hrs = 0;

    let roofMult = 1;
    if (state.steep) roofMult *= P.roofFactors.steep;
    if (state.secondStory) roofMult *= P.roofFactors.secondStory;
    if (state.roofFeet > 0) {
      const amt = state.roofFeet * P.roofline.perFoot * roofMult;
      lines.push([`Roofline, ${state.roofFeet} ft${roofMult > 1 ? " (roof adj.)" : ""}`, amt]);
      sub += amt;
      mat += state.roofFeet * P.roofline.matCostPerFoot;
      hrs += state.roofFeet * P.roofline.laborHrsPerFoot * roofMult;
    }
    P.items.forEach((it) => {
      const q = state.qty[it.id] || 0;
      if (!q) return;
      lines.push([`${it.label} × ${q}${it.unit === "ft" ? " ft" : ""}`, q * it.price]);
      sub += q * it.price; mat += q * it.matCost; hrs += q * it.laborHrs;
    });
    P.addons.forEach((a) => {
      if (!state.addons[a.id] || !a.flat) return;
      lines.push([a.label, a.flat]);
      sub += a.flat; mat += a.matCost || 0; hrs += a.laborHrs || 0;
    });
    if (sub > 0 && sub < P.minimumJob) {
      lines.push(["Minimum job adjustment", P.minimumJob - sub, "min"]);
      sub = P.minimumJob;
    }
    const own = P.addons.find((a) => a.id === "own");
    if (state.addons.own && sub) {
      const amt = sub * own.pct;
      lines.push(["Purchase lights (yours to keep)", amt]);
      sub += amt;
      mat *= 3; // you're selling the lights, not amortizing them
    }
    let discPct = P.discounts.reduce((s, d) => s + (state.discounts[d.id] ? d.pct : 0), 0);
    discPct = Math.min(discPct, MAX_DISCOUNT);
    if (discPct && sub) {
      const amt = -sub * discPct;
      lines.push([`Discounts (${Math.round(discPct * 100)}%${discPct === MAX_DISCOUNT ? ", max" : ""})`, amt, "disc"]);
      sub += amt;
    }
    return { total: sub, lines, mat, hrs };
  }

  function readState() {
    const s = { roofFeet: Math.max(0, +roofFeet.value || 0), steep: $("#steep").checked, secondStory: $("#secondStory").checked, qty: { ...qty }, addons: {}, discounts: {} };
    P.addons.forEach((a) => (s.addons[a.id] = $("#opt-" + a.id).checked));
    P.discounts.forEach((d) => (s.discounts[d.id] = $("#opt-" + d.id).checked));
    return s;
  }

  function update() {
    const { total, lines, mat, hrs } = calc(readState());
    $("#total").textContent = money(total);
    const lo = total * (1 - P.rangeSpread), hi = total * (1 + P.rangeSpread);
    $("#range").textContent = total ? `Typical range ${money(lo)} – ${money(hi)}` : "Add some lights to see a price";
    $("#breakdown").innerHTML = lines.map(([l, a, cls]) => `<tr class="${cls || ""}"><td>${l}</td><td>${a < 0 ? "−" + money(-a) : money(a)}</td></tr>`).join("");
    $("#estimateField").value = total ? `${money(total)} (${lines.map((l) => l[0]).join("; ")})` : "";

    if (ownerMode) {
      const labor = hrs * P.laborCostPerHr, gp = total - mat - labor;
      const panel = $("#ownerPanel");
      panel.hidden = false;
      panel.innerHTML = `<h4>Owner view (hidden from customers)</h4><dl>
        <dt>Crew-hours (install + takedown)</dt><dd>${hrs.toFixed(1)} h</dd>
        <dt>On-site install time, 3-person crew</dt><dd>~${(hrs * 0.7 / 3).toFixed(1)} h</dd>
        <dt>Materials (amortized)</dt><dd>${money(mat)}</dd>
        <dt>Labor @ ${money(P.laborCostPerHr)}/h</dt><dd>${money(labor)}</dd>
        <dt><strong>Gross profit</strong></dt><dd><strong>${money(gp)}</strong></dd>
        <dt>Gross margin</dt><dd>${total ? Math.round((gp / total) * 100) : 0}%</dd></dl>`;
    }
  }

  // ── Packages: price cards computed from the same engine ─────
  const packages = {
    classic:     { roofFeet: 110, qty: {} },
    signature:   { roofFeet: 150, qty: { peaks: 2, treeMd: 1, bushes: 3, garland: 12 } },
    showstopper: { roofFeet: 220, secondStory: true, qty: { peaks: 3, windows: 4, treeLg: 1, treeMd: 1, bushes: 4, wreaths: 2, garland: 20, pathway: 40 }, addons: { smart: true } },
  };
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    const pkg = packages[btn.dataset.preset];
    const t = calc({ steep: false, secondStory: false, addons: {}, discounts: {}, ...pkg }).total;
    btn.closest(".card").querySelector(".price strong").textContent = money(t <= P.minimumJob ? t : Math.round(t / 5) * 5);
    btn.addEventListener("click", () => {
      roofFeet.value = pkg.roofFeet;
      $("#steep").checked = false;
      $("#secondStory").checked = !!pkg.secondStory;
      P.addons.forEach((a) => ($("#opt-" + a.id).checked = !!(pkg.addons || {})[a.id]));
      P.items.forEach((it) => it._set(pkg.qty[it.id] || 0));
      update();
    });
  });

  $("#printBtn").onclick = () => window.print();

  // ── Contact form: opens an email by default. ────────────────
  // To collect leads automatically, set the form's action to a
  // Formspree/Netlify/Getform endpoint and delete this handler.
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = [...f.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
    location.href = `mailto:${P.business.email}?subject=${encodeURIComponent("Install request: " + f.get("name"))}&body=${encodeURIComponent(body)}`;
    $("#contactMsg").textContent = "Thanks! Your email app should open with your request ready to send.";
  });

  update();
})();
