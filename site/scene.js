// Shared drawing helpers: the North Star mark and a house with permanent
// roofline lights. Used by the website and the print materials.
window.NS = (() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  let uid = 0;
  const el = (t, a, p) => { const n = document.createElementNS(SVGNS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };

  const SCENES = [
    { name: "Christmas", colors: ["#ff3b3b", "#2bd46a", "#ffd27a"] },
    { name: "Warm white", colors: ["#ffd9a0"] },
    { name: "Game day", colors: ["#7b3fe4", "#ffc62f"] },
    { name: "Halloween", colors: ["#ff7a00", "#8c3cff"] },
    { name: "4th of July", colors: ["#ff3b3b", "#ffffff", "#3b6bff"] },
    { name: "Valentine's", colors: ["#ff4f8b", "#ffffff"] },
    { name: "St. Patrick's", colors: ["#2bd46a", "#9dff8a"] },
    { name: "Aurora", colors: ["#3ce6a2", "#2bb8e0", "#8b6bff"] },
  ];

  // Draws a house into an <svg>. Returns the light circles so they can be recolored.
  function house(svg, w, h, opts = {}) {
    const day = !!opts.day;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const id = "sky" + (++uid);
    const g = el("linearGradient", { id, x1: 0, x2: 0, y1: 0, y2: 1 }, el("defs", {}, svg));
    el("stop", { offset: 0, "stop-color": day ? "#8fc3ee" : "#050b16" }, g);
    el("stop", { offset: 1, "stop-color": day ? "#dcecf8" : "#12284a" }, g);
    el("rect", { width: w, height: h, fill: `url(#${id})` }, svg);
    if (!day && opts.stars !== false) for (let i = 0; i < 46; i++) el("circle", { cx: (i * 137.5) % w, cy: (i * 53.3) % (h * .45), r: i % 7 === 0 ? 1.2 : .6, fill: "#cfe3ff", opacity: .55 }, svg);
    if (!day && opts.polaris !== false) {
      const s = w * .05, x = w * .82, y = h * .12;
      el("path", { d: `M${x} ${y - s}L${x + s * .16} ${y - s * .16}L${x + s * .7} ${y}L${x + s * .16} ${y + s * .16}L${x} ${y + s}L${x - s * .16} ${y + s * .16}L${x - s * .7} ${y}L${x - s * .16} ${y - s * .16}Z`, fill: "#ffc94a", style: "filter:drop-shadow(0 0 6px rgba(255,201,74,.7))" }, svg);
    }
    const gy = h * .86, cx = w * .4, hw = w * .25, peak = h * .32, eave = h * .55;
    const wall = day ? "#c9b9a3" : "#16263f", wall2 = day ? "#bfae97" : "#132239", trim = day ? "#f4f1ea" : "#1c3050";
    el("rect", { y: gy, width: w, height: h - gy, fill: day ? "#f4f7f9" : "#dfe8ef" }, svg);
    // roof slabs
    el("path", { d: `M${cx - hw - 10} ${eave + 2}L${cx} ${peak - 10}L${cx + hw + 10} ${eave + 2}`, fill: day ? "#4a4f57" : "#0d1828", stroke: "none" }, svg);
    el("path", { d: `M${cx - hw} ${gy}V${eave}L${cx} ${peak}L${cx + hw} ${eave}V${gy}Z`, fill: wall }, svg);
    const gx = cx + hw, gw = w * .22;
    el("path", { d: `M${gx - 4} ${eave + h * .05}L${gx + gw / 2} ${eave - h * .05 - 8}L${gx + gw + 8} ${eave + h * .05}`, fill: day ? "#4a4f57" : "#0d1828" }, svg);
    el("path", { d: `M${gx} ${gy}V${eave + h * .05}L${gx + gw / 2} ${eave - h * .05}L${gx + gw} ${eave + h * .05}V${gy}Z`, fill: wall2 }, svg);
    // fascia trim line (where the channel lives)
    const trimW = Math.max(1.5, w / 260);
    el("path", { d: `M${cx - hw} ${eave + 2}L${cx} ${peak + 2}L${cx + hw} ${eave + 2}M${gx} ${eave + h * .05 + 2}L${gx + gw / 2} ${eave - h * .05 + 2}L${gx + gw} ${eave + h * .05 + 2}`, fill: "none", stroke: trim, "stroke-width": trimW * 2 }, svg);
    // windows + door
    [[cx - hw * .62, eave + h * .07], [cx + hw * .22, eave + h * .07], [gx + gw * .3, eave + h * .12]].forEach(([x, y]) => el("rect", { x, y, width: hw * .36, height: h * .12, rx: 2, fill: day ? "#9cb6c9" : "#f4c56a", opacity: day ? 1 : .85 }, svg));
    el("rect", { x: cx - hw * .1, y: gy - h * .17, width: hw * .2, height: h * .17, fill: day ? "#5b3d2b" : "#0c1626" }, svg);
    if (!day) el("path", { d: `M${cx - hw - 8} ${gy}q${hw * .6} -14 ${hw * 2.4} 0z`, fill: "#f2f5f7", opacity: .9 }, svg);
    // lights
    const lights = [];
    const r = Math.max(1.5, w / 210);
    const run = (a, b, n) => { for (let i = 0; i <= n; i++) lights.push(el("circle", { cx: a[0] + (b[0] - a[0]) * i / n, cy: a[1] + (b[1] - a[1]) * i / n + 4, r: day ? r * .55 : r, fill: day ? "#e6e2d8" : "#ffd9a0" }, svg)); };
    const n = Math.round(w / 22);
    run([cx - hw, eave], [cx, peak], n); run([cx, peak], [cx + hw, eave], n);
    run([gx, eave + h * .05], [gx + gw / 2, eave - h * .05], n / 2 | 0); run([gx + gw / 2, eave - h * .05], [gx + gw, eave + h * .05], n / 2 | 0);
    // tree
    const tx = w * .9;
    el("path", { d: `M${tx} ${gy - h * .36}l${w * .045} ${h * .14}h-${w * .02}l${w * .04} ${h * .12}h-${w * .02}l${w * .035} ${h * .1}h-${w * .17}l${w * .035} -${h * .1}h-${w * .02}l${w * .04} -${h * .12}h-${w * .02}z`, fill: day ? "#2f5d46" : "#0f2a22" }, svg);
    return lights;
  }

  function paint(lights, colors, glow = true) {
    lights.forEach((c, i) => {
      const col = colors[i % colors.length];
      c.setAttribute("fill", col);
      c.style.filter = glow ? `drop-shadow(0 0 3px ${col})` : "";
      c.style.transition = "fill .5s";
    });
  }

  return { el, house, paint, SCENES };
})();
