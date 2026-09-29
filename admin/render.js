/* =====================================================================
   AIOTI — BỘ DỰNG TRANG
   Nhận dữ liệu (data.json) và trả về toàn bộ nội dung index.html.
   Dùng chung cho công cụ quản lý (trình duyệt) và lúc dựng thử (Node).
   ===================================================================== */
(function (root) {
  "use strict";

  const CATS = { solar: "Điện mặt trời", camera: "Camera an ninh", smart: "Nhà thông minh" };

  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // văn bản có **đậm** và xuống dòng
  const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const oneLine = s => String(s || "").replace(/\s*\n\s*/g, ", ");
  const ddmmyyyy = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return d && m && y ? `${d}/${m}/${y}` : ""; };

  const PHONE_SVG = (w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.3 2.2z"/></svg>`;
  const ZALO_SVG = `<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.4 5.1 3.7 6.7-.1.7-.5 2.2-.6 2.6-.1.4.2.4.4.3.2-.1 2.4-1.6 3.3-2.2.9.2 1.8.3 2.8.3h.4c5.5 0 10-3.9 10-8.7S17.5 2 12 2z"/></svg>`;

  const ICONS = {
    solar: `<svg class="ico" viewBox="0 0 64 52" aria-hidden="true" fill="none">
<circle cx="50" cy="9" r="6.4" fill="#fff"/>
<g stroke="#fff" stroke-width="2.1" stroke-linecap="round">
<path d="M50 .6v2.6M50 14.8v2.6M59.3 9h-2.6M43.3 9h-2.6M56.6 2.4l-1.9 1.9M45.3 13.7l-1.9 1.9M56.6 15.6l-1.9-1.9M45.3 4.3l-1.9-1.9"/></g>
<path d="M14.6 20h34.8l8.6 22H6z" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
<g stroke="#fff" stroke-width="1.7" stroke-linecap="round">
<path d="M11.7 31h40.6M25.6 20l-4 22M38.4 20l4 22"/></g>
<path d="M32 42v8M22 50h20" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
</svg>`,
    camera: `<img class="ico" src="img/icon-camera.png" alt="" aria-hidden="true">`,
    smart: `<svg class="ico" viewBox="0 0 60 54" aria-hidden="true" fill="none">
<path d="M6 26.5 30 7l24 19.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.5 23.4V47h37V23.4" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
<rect x="24.5" y="32" width="11" height="15" rx="1.4" fill="#fff"/>
<g stroke="#fff" stroke-width="2.2" stroke-linecap="round">
<path d="M22.6 19.6a10.6 10.6 0 0 1 14.8 0M26.8 24.2a5 5 0 0 1 6.4 0"/></g>
<circle cx="30" cy="28.4" r="1.9" fill="#fff"/>
</svg>`
  };

  /* Ảnh đại diện cho thẻ dịch vụ: ảnh gắn ★ → ảnh chỉ định sẵn → ảnh đầu tiên cùng ngành → ảnh đầu tiên bất kỳ */
  function pickCover(g, gallery) {
    return gallery.find(p => p.cat === g.cat && p.cover)
      || gallery.find(p => p.id === g.img)
      || gallery.find(p => p.cat === g.cat)
      || gallery[0] || null;
  }

  function serviceCard(g, i, gallery) {
    const pic = pickCover(g, gallery);
    const img = pic ? `<img src="anh/t-${esc(pic.id)}.jpg" alt="${esc(pic.cap || g.name)}" loading="lazy">` : "";
    const picBox = `<div class="svc-pic"><span class="rank">NHÓM ${String(i + 1).padStart(2, "0")}</span>${ICONS[g.cat] || ""}${img}</div>`;
    const items = (g.items || []).filter(x => String(x).trim()).map(x => `<li>${rich(x)}</li>`).join("\n                ");
    const txt = `<div class="svc-txt">
              <span class="sub">${esc(g.who)}</span>
              <h3>${esc(g.name)}</h3>
              <p>${rich(g.desc)}</p>
              <ul>
                ${items}
              </ul>
            </div>`;
    if (i === 0) {
      return `      <article class="svc rv">
        <div class="svc-in">
          ${txt}
          ${picBox}
        </div>
      </article>`;
    }
    return `        <article class="svc small rv">
          <div class="svc-in">
            ${picBox}
            ${txt}
          </div>
        </article>`;
  }

  function renderSite(D, opts) {
    opts = opts || {};
    const C = D.contact, S = D.stats, gal = D.gallery || [], prices = D.prices || [];
    const now = opts.now || new Date();
    const ver = opts.version || String(now.getTime());
    const tel = "tel:" + esc(C.phone);
    const zalo = "https://zalo.me/" + esc(C.zalo);
    const years = Math.max(1, now.getFullYear() - (+S.fromYear || now.getFullYear()));
    const groups = (D.services.groups || []);

    const tiles = gal.map((p, i) => {
      const cap = esc(p.cap || CATS[p.cat] || "");
      const h = p.w ? Math.round(700 * p.h / p.w) : 525;
      return `      <button class="shot rv" data-cat="${esc(p.cat)}" data-full="anh/ct-${esc(p.id)}.jpg" data-cap="${cap}" aria-label="${cap}">
        <img src="anh/t-${esc(p.id)}.jpg" alt="${cap}" loading="lazy" width="700" height="${h}">
        <span class="shot-cap">${cap}</span>
      </button>`;
    }).join("\n");

    const priceTiles = prices.map(p => {
      const t = esc(p.title || "Bảng giá");
      const d = ddmmyyyy(p.date);
      return `      <button class="price rv" data-full="gia/${esc(p.id)}.jpg" data-cap="${t}${d ? " · Cập nhật " + d : ""}" aria-label="${t}">
        <span class="price-img"><img src="gia/t-${esc(p.id)}.jpg" alt="${t}" loading="lazy"></span>
        <span class="price-meta"><b>${t}</b>${p.note ? `<em>${esc(p.note)}</em>` : ""}${d ? `<i>Cập nhật ${d}</i>` : ""}</span>
      </button>`;
    }).join("\n");

    const vids = D.videos || [];
    const V = D.video || {};
    const vidTiles = vids.map(v => {
      const cap = esc(v.cap || CATS[v.cat] || "Video công trình");
      return `      <button class="vid rv" data-yt="${esc(v.id)}"${v.short ? ' data-short="1"' : ""} aria-label="Xem video: ${cap}">
        <span class="vid-img"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="${cap}" loading="lazy"><span class="vid-play" aria-hidden="true"></span>${v.short ? '<span class="vid-tag">SHORTS</span>' : ""}</span>
        <span class="vid-cap">${CATS[v.cat] ? `<i>${esc(CATS[v.cat])}</i>` : ""}${cap}</span>
      </button>`;
    }).join("\n");
    const videoSection = vids.length ? `
<!-- ===== VIDEO ===== -->
<section class="vids" id="video">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow light">${esc(V.eyebrow || "Video")}</p>
      <h2>${esc(V.title || "Video công trình")}</h2>
      ${V.intro ? `<p>${rich(V.intro)}</p>` : ""}
    </div>
    <div class="vgrid">
${vidTiles}
    </div>
    ${V.channel ? `<p class="vids-more rv">Xem thêm trên <a href="${esc(V.channel)}" target="_blank" rel="noopener">kênh YouTube AIOTI ›</a></p>` : ""}
  </div>
</section>
` : "";

    const pricingSection = prices.length ? `
<!-- ===== BẢNG GIÁ ===== -->
<section class="pricing" id="banggia">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">${esc(D.pricing.eyebrow || "Bảng giá")}</p>
      <h2>${esc(D.pricing.title)}</h2>
      <p>${rich(D.pricing.intro)}</p>
    </div>
    <div class="prices">
${priceTiles}
    </div>
    ${D.pricing.note ? `<p class="price-note rv">${rich(D.pricing.note)}</p>` : ""}
  </div>
</section>
` : "";

    const vows = (D.why.items || []).map((v, i) =>
      `      <div class="vow rv"><span class="n">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(v.t)}</h3><p>${rich(v.d)}</p></div></div>`
    ).join("\n");

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AIOTI — Công nghệ · An ninh · Năng lượng | TP.HCM</title>
<meta name="description" content="Công ty TNHH AIOTI khảo sát, thiết kế và thi công điện năng lượng mặt trời, camera an ninh và nhà thông minh cho nhà phố, biệt thự, nhà xưởng, trường học, bệnh viện tại TP.HCM.">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Công ty TNHH AIOTI">
<meta property="og:locale" content="vi_VN">
<meta property="og:url" content="${esc(D.site.url)}">
<meta property="og:title" content="AIOTI — Công nghệ · An ninh · Năng lượng">
<meta property="og:description" content="Điện mặt trời · Camera an ninh · Nhà thông minh. Gọi hotline ${esc(C.phoneDisplay)} — tư vấn miễn phí, báo giá ghi rõ hãng và model.">
<meta property="og:image" content="${esc(D.site.url)}thumbnail.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(D.site.url)}">
<meta name="theme-color" content="#6E0A00">
<link rel="icon" type="image/png" href="img/favicon.png">
<link rel="apple-touch-icon" href="img/icon-180.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css?v=${ver}">
</head>
<body>

<header>
  <nav class="nav wrap" id="nav">
    <a class="brand" href="#top"><img class="mark" src="img/logo-trang.png" alt="Logo AIOTI"><span><b>AIOTI</b><i>Công nghệ · An ninh · Năng lượng</i></span></a>
    <a class="lnk" href="#dichvu">Dịch vụ</a>
${gal.length ? `    <a class="lnk" href="#congtrinh">Công trình</a>\n` : ""}${vids.length ? `    <a class="lnk" href="#video">Video</a>\n` : ""}${prices.length ? `    <a class="lnk" href="#banggia">Bảng giá</a>\n` : ""}    <a class="lnk" href="#visao">Vì sao chọn AIOTI</a>
    <a class="lnk" href="#lienhe">Liên hệ</a>
    <a class="btn btn-sun call" href="${tel}"><span>${esc(C.phoneDisplay)}</span></a>
    <button class="burger" id="burger" aria-label="Mở menu">☰</button>
  </nav>
</header>

<main id="top">

<!-- ===== HERO ===== -->
<section class="hero">
  <div class="wrap">
    <p class="eyebrow light">${esc(D.hero.eyebrow)}</p>
    <h1>${esc(D.hero.title)} <span>${esc(D.hero.titleHi)}</span><br>${esc(D.hero.title2)}</h1>
    <p class="lede">${rich(D.hero.lede)}</p>
    <div class="hero-acts">
      <a class="btn btn-red btn-hot" href="${tel}">${PHONE_SVG(20)}<span>${esc(C.phoneDisplay)}</span></a>
      ${gal.length ? `<a class="btn btn-line" href="#congtrinh">Xem công trình đã làm</a>` : `<a class="btn btn-line" href="#dichvu">Xem dịch vụ</a>`}
    </div>
  </div>
  <img class="eagle" src="img/daibang-trang.png" alt="" aria-hidden="true">
  <div class="clouds" aria-hidden="true">
    <svg viewBox="0 0 1440 110" preserveAspectRatio="none">
      <path fill="rgba(255,255,255,.46)" d="M0,74 C150,30 260,96 420,66 C580,36 660,88 820,70 C980,52 1090,96 1240,72 C1330,58 1390,70 1440,64 L1440,110 L0,110 Z"/>
      <path fill="#FFFFFF" d="M0,90 C130,58 250,104 400,84 C560,62 690,102 840,86 C1000,68 1120,104 1280,88 C1350,81 1400,86 1440,84 L1440,110 L0,110 Z"/>
    </svg>
  </div>
</section>

<div class="stats">
  <dl class="wrap stats-g">
    <div><dd id="stY" data-from="${+S.fromYear}">${years}<small> năm</small></dd><dt>Trong nghề từ ${+S.fromYear}</dt></div>
    <div><dd>${esc(S.devices)}</dd><dt>Thiết bị an ninh đã lắp đặt</dt></div>
    <div><dd>${esc(S.kwp)}<small> kWp</small></dd><dt>Điện mặt trời đã hòa lưới</dt></div>
  </dl>
</div>

<!-- ===== DỊCH VỤ ===== -->
<section id="dichvu">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">${esc(D.services.eyebrow || "Dịch vụ")}</p>
      <h2>${esc(D.services.title)}</h2>
      <p>${rich(D.services.intro)}</p>
    </div>

    <div class="svcs">
${groups[0] ? serviceCard(groups[0], 0, gal) : ""}

      <div class="svcs-row">
${groups.slice(1).map((g, i) => serviceCard(g, i + 1, gal)).join("\n\n")}
      </div>
    </div>
  </div>
</section>

${gal.length ? `<!-- ===== CÔNG TRÌNH ===== -->
<section class="works" id="congtrinh">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow light">${esc(D.works.eyebrow || "Công trình")}</p>
      <h2>${esc(D.works.title)}</h2>
      <p>${rich(D.works.intro)}</p>
    </div>
    <div class="filt" id="filt" hidden></div>
    <div class="grid-shots">
${tiles}
    </div>
    ${D.works.note ? `<p class="works-note rv">${rich(D.works.note)}</p>` : ""}
  </div>
</section>` : ""}
${videoSection}${pricingSection}
<div class="mark-div" aria-hidden="true">
  <span></span><img src="img/daibang-do.png" alt=""><span></span>
</div>

<!-- ===== VÌ SAO ===== -->
<section class="why" id="visao">
  <div class="wrap">
    <div class="head rv">
      <p class="eyebrow">${esc(D.why.eyebrow)}</p>
      <h2>${esc(D.why.title)}</h2>
      <p>${rich(D.why.intro)}</p>
    </div>
    <div class="vows">
${vows}
    </div>
  </div>
</section>

<!-- ===== LIÊN HỆ ===== -->
<section class="contact" id="lienhe">
  <div class="wrap">
    <p class="eyebrow ctr">${esc(C.eyebrow || "Liên hệ")}</p>
    <h2 class="ct-h2">${esc(C.title || "Gọi AIOTI")}</h2>
    <div class="ct2 rv">
      <a class="mapcard" href="${esc(C.mapUrl)}" target="_blank" rel="noopener">
        <iframe src="https://maps.google.com/maps?q=${esc(C.mapLat)},${esc(C.mapLng)}&z=17&output=embed" loading="lazy" title="Bản đồ AIOTI trên Google Maps"></iframe>
        ${C.googleNote ? `<span class="mapcard-tag">${esc(C.googleNote)} &nbsp;›</span>` : ""}
      </a>
      <div class="ct-r">
        <a class="hotline" href="${tel}">
          ${PHONE_SVG(26)}
          <span><i>Hotline · Zalo</i><b>${esc(C.phoneDisplay)}</b></span>
        </a>
        <a class="zalo" href="${zalo}">
          ${ZALO_SVG}
          Nhắn Zalo
        </a>
        <dl>
          <dt>Tên công ty</dt><dd>${esc(C.company)}</dd>
          <dt>Mã số thuế</dt><dd class="mono">${esc(C.mst)}</dd>
          <dt>Địa chỉ</dt><dd>${rich(C.address)}</dd>
          <dt>Email</dt><dd><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></dd>
        </dl>
      </div>
    </div>
  </div>
</section>

</main>

<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Xem ảnh">
  <button class="lb-x" id="lbX" aria-label="Đóng">&times;</button>
  <button class="lb-nav lb-prev" id="lbP" aria-label="Ảnh trước">&#8249;</button>
  <button class="lb-nav lb-next" id="lbN" aria-label="Ảnh sau">&#8250;</button>
  <figure class="lb-box">
    <img id="lbImg" alt="">
    <figcaption><span id="lbNum"></span><span id="lbCap"></span><a id="lbOrig" target="_blank" rel="noopener" hidden>Mở ảnh gốc để phóng to ↗</a></figcaption>
  </figure>
</div>

<div class="vb" id="vb" role="dialog" aria-modal="true" aria-label="Xem video">
  <button class="lb-x" id="vbX" aria-label="Đóng">&times;</button>
  <div class="vb-box" id="vbBox"></div>
</div>

<footer>
  <div class="wrap">
    <div class="ft">
      <div class="ft-b">
        <img class="mark-ft" src="img/logo-trang-full.png" alt="AIOTI GROUP">
        <p>Công nghệ · An ninh · Năng lượng.<br>Điện mặt trời, camera an ninh, nhà thông minh và kiểm soát ra vào cho hộ gia đình, doanh nghiệp và nhà xưởng tại TP.HCM.</p>
      </div>
      <div>
        <h4>Dịch vụ</h4>
${groups.map(g => `        <a href="#dichvu">${esc(g.name)}</a>`).join("\n")}
${gal.length ? `        <a href="#congtrinh">Công trình đã làm</a>\n` : ""}${vids.length ? `        <a href="#video">Video công trình</a>\n` : ""}${prices.length ? `        <a href="#banggia">Bảng giá</a>\n` : ""}      </div>
      <div>
        <h4>Liên hệ</h4>
        <a href="${tel}">${esc(C.phoneDisplay)}</a>
        <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>
        <a href="${zalo}">Nhắn Zalo</a>
      </div>
    </div>
    <div class="ft-bot">
      <span>© <span id="yr">${now.getFullYear()}</span> ${esc(C.company)} · MST ${esc(C.mst)}</span>
      <span>${esc(oneLine(C.address))}</span>
    </div>
  </div>
</footer>

<button class="top" id="topBtn" aria-label="Lên đầu trang"><img src="img/daibang-nut.png" alt=""></button>

<div class="dock">
  <a class="btn btn-red" href="${tel}">Gọi ngay</a>
  <a class="btn btn-sun" href="${zalo}">Nhắn Zalo</a>
</div>

<script src="site.js?v=${ver}"><\/script>
</body>
</html>
`;
  }

  const api = { renderSite, CATS, pickCover };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AIOTIRender = api;
})(typeof window !== "undefined" ? window : this);
