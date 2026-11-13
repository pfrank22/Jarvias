(() => {
  const P = window.PRICING, B = P.business;
  document.querySelectorAll("[data-biz]").forEach((el) => (el.textContent = B[el.dataset.biz] || ""));
  document.querySelectorAll("[data-warranty]").forEach((el) => (el.textContent = P.warranty));
  const url = "https://" + B.website + "/#quote";
  document.querySelectorAll("[data-qr]").forEach((el) => {
    if (typeof qrcode !== "function") { el.textContent = url; return; }
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  });
  // Houses drawn with the shared scene helper
  document.querySelectorAll("[data-house]").forEach((svg) => {
    const [w, h] = svg.dataset.house.split("x").map(Number);
    const scene = window.NS.SCENES.find((s) => s.name === svg.dataset.scene) || window.NS.SCENES[0];
    window.NS.paint(window.NS.house(svg, w, h), scene.colors);
  });
})();
