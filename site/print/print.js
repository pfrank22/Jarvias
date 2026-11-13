(() => {
  const B = window.PRICING.business;
  document.querySelectorAll("[data-biz]").forEach((el) => (el.textContent = B[el.dataset.biz]));
  const url = "https://" + B.website + "/#quote";
  document.querySelectorAll("[data-qr]").forEach((el) => {
    if (typeof qrcode !== "function") { el.textContent = url; return; }
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  });
})();
