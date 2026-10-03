/* AIOTI — mã chạy trang web. Nội dung nằm sẵn trong index.html, file này chỉ lo phần tương tác. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---- số năm trong nghề tự tăng, năm bản quyền ---- */
  const stY = $("stY");
  if (stY && stY.dataset.from) {
    const y = Math.max(1, new Date().getFullYear() - (+stY.dataset.from));
    const u = stY.dataset.unit == null ? "năm" : stY.dataset.unit;
    stY.textContent = y;
    if (u) { const sm = document.createElement("small"); sm.textContent = " " + u; stY.appendChild(sm); }
  }
  const yr = $("yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---- menu điện thoại ---- */
  const nav = $("nav");
  $("burger").addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

  /* ---- xem ảnh lớn: dùng chung cho Công trình và Bảng giá ---- */
  const lb = $("lb"), lbImg = $("lbImg"), lbCap = $("lbCap"), lbNum = $("lbNum"), lbOrig = $("lbOrig");
  let set = [], pos = 0;

  function show(p) {
    if (!set.length) return;
    pos = (p + set.length) % set.length;
    const t = set[pos];
    lbImg.src = t.dataset.full; lbImg.alt = t.dataset.cap || "";
    lbCap.textContent = t.dataset.cap || "";
    lbNum.textContent = String(pos + 1).padStart(2, "0") + " / " + set.length;
    const isPrice = t.classList.contains("price");
    lbOrig.hidden = !isPrice;
    if (isPrice) lbOrig.href = t.dataset.full;
  }
  function open(tile, group) {
    set = group.filter(t => !t.classList.contains("off"));
    show(set.indexOf(tile));
    lb.classList.add("on"); document.body.style.overflow = "hidden";
  }
  function close() { lb.classList.remove("on"); document.body.style.overflow = ""; }

  const shots = [...document.querySelectorAll(".shot")];
  const prices = [...document.querySelectorAll(".price")];
  shots.forEach(t => t.addEventListener("click", () => open(t, shots)));
  prices.forEach(t => t.addEventListener("click", () => open(t, prices)));
  $("lbX").addEventListener("click", close);
  $("lbP").addEventListener("click", e => { e.stopPropagation(); show(pos - 1); });
  $("lbN").addEventListener("click", e => { e.stopPropagation(); show(pos + 1); });
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("on")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(pos - 1);
    if (e.key === "ArrowRight") show(pos + 1);
  });
  // vuốt trái/phải trên điện thoại
  let x0 = null;
  lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
  });

  /* ---- phát video YouTube ngay trên trang ---- */
  const vb = $("vb"), vbBox = $("vbBox");
  function vOpen(id, short) {
    vbBox.classList.toggle("short", !!short);
    vbBox.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
      '?autoplay=1&rel=0&playsinline=1" title="Video công trình AIOTI" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    vb.classList.add("on"); document.body.style.overflow = "hidden";
  }
  function vClose() { vb.classList.remove("on"); vbBox.innerHTML = ""; document.body.style.overflow = ""; }
  if (vb) {
    document.querySelectorAll(".vid").forEach(b => b.addEventListener("click", () => vOpen(b.dataset.yt, b.dataset.short === "1")));
    $("vbX").addEventListener("click", vClose);
    vb.addEventListener("click", e => { if (e.target === vb) vClose(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && vb.classList.contains("on")) vClose(); });
  }

  /* ---- lọc theo ngành — dùng chung cho Công trình và Video ----
     Công trình: hiện khi từ 2 ngành trở lên có ≥ 3 ảnh · Video: hiện khi từ 2 ngành trở lên có video */
  function catFilter(barId, items, min) {
    const NAME = { solar: "Điện mặt trời", camera: "Camera an ninh", smart: "Nhà thông minh" };
    const cnt = {};
    items.forEach(t => { const c = t.dataset.cat || "solar"; cnt[c] = (cnt[c] || 0) + 1; });
    const big = Object.keys(NAME).filter(c => (cnt[c] || 0) >= min);
    const bar = $(barId);
    if (!bar || big.length < 2) return;
    bar.hidden = false;
    bar.innerHTML = '<button class="on" data-c="all">Tất cả<i>' + items.length + '</i></button>' +
      big.map(c => `<button data-c="${c}">${NAME[c]}<i>${cnt[c]}</i></button>`).join("");
    bar.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      bar.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      items.forEach(t => t.classList.toggle("off", !(b.dataset.c === "all" || (t.dataset.cat || "solar") === b.dataset.c)));
    });
  }
  catFilter("filt", shots, 3);
  catFilter("vfilt", [...document.querySelectorAll(".vid")], 1);

  /* ---- nút lên đầu trang ---- */
  const top = $("topBtn");
  top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  let tick = false;
  window.addEventListener("scroll", () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => { top.classList.toggle("on", window.scrollY > 640); tick = false; });
  }, { passive: true });

  /* ---- hiện dần khi cuộn ---- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".rv").forEach((el, i) => { el.style.transitionDelay = (i % 6) * 55 + "ms"; io.observe(el); });
  } else {
    document.querySelectorAll(".rv").forEach(el => el.classList.add("in"));
  }
})();
