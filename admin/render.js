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


  /* =====================================================================
     MÀU SẮC — bộ màu mẫu + tự tính toàn bộ tông màu từ 4 màu gốc
     brand: màu chủ đạo · sun: màu nhấn · sky: màu phụ · ink: nền tối
     ===================================================================== */
  const THEME_DEFAULT = { preset: "hoang-hon", brand: "#A31000", sun: "#FFB300", sky: "#1C79A8", ink: "#1A0805" };
  const PRESETS = [
    { id: "hoang-hon",  name: "Đỏ hoàng hôn (mặc định)", group: "Đỏ – cam",   brand: "#A31000", sun: "#FFB300", sky: "#1C79A8", ink: "#1A0805" },
    { id: "do-tet",     name: "Đỏ Tết",                  group: "Đỏ – cam",   brand: "#C8102E", sun: "#FFD000", sky: "#1C79A8", ink: "#1E0508" },
    { id: "do-do",      name: "Đỏ đô sang trọng",        group: "Đỏ – cam",   brand: "#8B0A1E", sun: "#D9A441", sky: "#2E5E7E", ink: "#1A0609" },
    { id: "do-cam",     name: "Đỏ cam",                  group: "Đỏ – cam",   brand: "#B3260A", sun: "#FFB300", sky: "#0E7490", ink: "#1C0A04" },
    { id: "cam",        name: "Cam năng động",           group: "Đỏ – cam",   brand: "#C2410C", sun: "#FFC233", sky: "#1971C2", ink: "#1D0C05" },
    { id: "ho-phach",   name: "Hổ phách nắng",           group: "Đỏ – cam",   brand: "#A14A06", sun: "#FCD34D", sky: "#0369A1", ink: "#1C1004" },
    { id: "nau",        name: "Nâu cà phê",              group: "Đỏ – cam",   brand: "#7C2D12", sun: "#E0A955", sky: "#3F6E8C", ink: "#1A0D07" },
    { id: "xanh-la",    name: "Xanh lá năng lượng",      group: "Xanh lá",    brand: "#15803D", sun: "#FACC15", sky: "#0E7490", ink: "#06180D" },
    { id: "xanh-rung",  name: "Xanh rừng",               group: "Xanh lá",    brand: "#166534", sun: "#EAB308", sky: "#2B6CB0", ink: "#05140A" },
    { id: "xanh-reu",   name: "Xanh rêu",                group: "Xanh lá",    brand: "#4D6B12", sun: "#FACC15", sky: "#0E7490", ink: "#0E1505" },
    { id: "xanh-la-ma", name: "Xanh lá mạ",              group: "Xanh lá",    brand: "#3F7D20", sun: "#FFC233", sky: "#1C79A8", ink: "#0B1607" },
    { id: "teal",       name: "Xanh ngọc",               group: "Xanh ngọc",  brand: "#0F766E", sun: "#FBBF24", sky: "#0369A1", ink: "#04161A" },
    { id: "cyan",       name: "Xanh cyan hiện đại",      group: "Xanh ngọc",  brand: "#0E7490", sun: "#FDE047", sky: "#2563EB", ink: "#031519" },
    { id: "xanh-cn",    name: "Xanh dương công nghệ",    group: "Xanh dương", brand: "#0B5FA5", sun: "#FFB300", sky: "#0891B2", ink: "#061423" },
    { id: "navy",       name: "Xanh navy doanh nghiệp",  group: "Xanh dương", brand: "#1E3A8A", sun: "#F59E0B", sky: "#0EA5E9", ink: "#070D1F" },
    { id: "xanh-bien",  name: "Xanh biển",               group: "Xanh dương", brand: "#0369A1", sun: "#FDBA74", sky: "#0D9488", ink: "#04121C" },
    { id: "xanh-dien",  name: "Xanh điện",               group: "Xanh dương", brand: "#1D4ED8", sun: "#22D3EE", sky: "#7C3AED", ink: "#070B1F" },
    { id: "an-ninh",    name: "Xanh an ninh",            group: "Xanh dương", brand: "#1F4E79", sun: "#F2C14E", sky: "#3A8FB7", ink: "#08121C" },
    { id: "tim-than",   name: "Tím than",                group: "Tím – hồng", brand: "#4C1D95", sun: "#F5B83D", sky: "#0891B2", ink: "#110822" },
    { id: "tim-hong",   name: "Tím hồng",                group: "Tím – hồng", brand: "#86198F", sun: "#FBBF24", sky: "#2563EB", ink: "#1A0619" },
    { id: "hong",       name: "Hồng đậm",                group: "Tím – hồng", brand: "#BE185D", sun: "#FCD34D", sky: "#0284C7", ink: "#1E0610" },
    { id: "than-chi",   name: "Than chì",                group: "Trung tính", brand: "#374151", sun: "#F59E0B", sky: "#2563EB", ink: "#0B0F14" },
    { id: "den-vang",   name: "Đen vàng cao cấp",        group: "Trung tính", brand: "#1C1917", sun: "#EAB308", sky: "#0E7490", ink: "#0C0A09" },
    { id: "xam-xanh",   name: "Xám xanh thép",           group: "Trung tính", brand: "#334E68", sun: "#F0B429", sky: "#2680C2", ink: "#0A121B" }
  ];

  /* các biến màu gốc trong style.css — dùng khi theme là mặc định */
  const ORIGINAL_VARS = {"brand": "#A31000", "brand-lt": "#BE1400", "brand-dk": "#7C0C00", "brand-deep": "#6E0A00", "hz-1": "#6E0A00", "hz-2": "#A31000", "hz-3": "#B32407", "hz-4": "#C4400A", "hz-5": "#D9700E", "hz-6": "#EFA43A", "hz-7": "#F6CE84", "hz-8": "#E4EFF6", "sun": "#FFB300", "sun-lt": "#FFC933", "sun-hi": "#FFD666", "on-sun": "#3E2200", "sky": "#1C79A8", "sky-dk": "#0B4A7A", "sky-pale": "#EAF3F9", "sky-tint": "#F4F9FC", "ink": "#1A0805", "ink-2": "#2A100A", "ink-3": "#120503", "line-d": "#4A1F14", "soft": "#FBE3DC", "soft-2": "#EDC6BC", "soft-3": "#CFA79D", "soft-4": "#A9837A", "cloud": "#FFFFFF", "cloud-2": "#FFFAF4", "cloud-3": "#F6EEE5", "line": "#E7DACC", "text": "#241310", "muted": "#71564F", "brand-rgb": "163,16,0", "deep-rgb": "110,10,0", "ink3-rgb": "16,5,3", "text-rgb": "36,19,16", "glow-rgb": "255,238,178", "glow2-rgb": "255,196,80"};

  /* ---- công cụ màu ---- */
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function hexToRgb(h) {
    h = String(h || "").trim().replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  const rgbToHex = c => "#" + c.map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  const mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const rgbStr = h => hexToRgb(h).join(",");
  function lum(h) {
    return hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); })
      .reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

  /* chuẩn hóa theme lưu trong data.json; thiếu / sai thì về mặc định */
  function normTheme(t) {
    const o = Object.assign({}, THEME_DEFAULT);
    if (t) ["brand", "sun", "sky", "ink"].forEach(k => { const c = hexToRgb(t[k]); if (c) o[k] = rgbToHex(c); });
    o.preset = t && t.preset ? String(t.preset) : o.preset;
    return o;
  }
  const isDefaultTheme = t => { const n = normTheme(t); return ["brand", "sun", "sky", "ink"].every(k => n[k] === THEME_DEFAULT[k]); };

  /* Tính toàn bộ biến màu của web từ 4 màu gốc */
  function themeVars(t) {
    if (isDefaultTheme(t)) return Object.assign({}, ORIGINAL_VARS);
    t = normTheme(t);
    const B = rgbToHsl(hexToRgb(t.brand)), S = rgbToHsl(hexToRgb(t.sun)),
          K = rgbToHsl(hexToRgb(t.sky)), I = rgbToHsl(hexToRgb(t.ink));
    const v = {};
    // chủ đạo
    v.brand = t.brand;
    v["brand-lt"] = hsl(B.h, B.s, Math.min(B.l + 5, 62));
    v["brand-dk"] = hsl(B.h, B.s, Math.max(B.l - 8, 7));
    v["brand-deep"] = hsl(B.h, B.s, Math.max(B.l - 10.5, 5));
    // nhấn
    v.sun = t.sun;
    v["sun-lt"] = mix(t.sun, "#FFFFFF", .2);
    v["sun-hi"] = mix(t.sun, "#FFFFFF", .4);
    v["on-sun"] = contrast("#FFFFFF", t.sun) >= 4.5 ? "#FFFFFF" : hsl(S.h, Math.min(S.s, 100), 12);
    // phụ
    v.sky = t.sky;
    v["sky-dk"] = hsl(K.h, K.s, Math.max(K.l - 14, 10));
    v["sky-pale"] = mix(t.sky, "#FFFFFF", .9);
    v["sky-tint"] = mix(t.sky, "#FFFFFF", .95);
    // dải chuyển màu đầu trang
    v["hz-1"] = v["brand-deep"]; v["hz-2"] = t.brand;
    const sunset = hueDist(B.h, S.h) <= 100 && B.s > 25;
    if (sunset) {           // chủ đạo và màu nhấn gần nhau → hoàng hôn chuyển sang màu nhấn
      v["hz-3"] = mix(t.brand, t.sun, .12); v["hz-4"] = mix(t.brand, t.sun, .28);
      v["hz-5"] = mix(t.brand, t.sun, .55); v["hz-6"] = mix(mix(t.sun, t.brand, .08), "#FFFFFF", .15);
      v["hz-7"] = mix(t.sun, "#FFFFFF", .5);
    } else {                // khác xa nhau → nhạt dần theo màu chủ đạo, không pha ra màu bẩn
      v["hz-3"] = hsl(B.h, B.s, B.l + 5);  v["hz-4"] = hsl(B.h, B.s * .95, B.l + 11);
      v["hz-5"] = hsl(B.h, B.s * .9, B.l + 19); v["hz-6"] = hsl(B.h, B.s * .8, Math.min(B.l + 31, 78));
      v["hz-7"] = hsl(B.h, B.s * .7, Math.min(B.l + 45, 88));
    }
    v["hz-8"] = mix(t.sky, "#FFFFFF", .88);
    // nền tối
    v.ink = t.ink;
    v["ink-2"] = hsl(I.h, I.s, I.l + 4);
    v["ink-3"] = hsl(I.h, I.s, Math.max(I.l - 2.5, 1.5));
    v["line-d"] = hsl(I.h, I.s * .85, I.l + 12);
    // chữ trên nền tối
    const f = clamp(I.s / 68, 0, 1);
    v.soft = hsl(I.h, 82 * f, 92); v["soft-2"] = hsl(I.h, 62 * f, 83);
    v["soft-3"] = hsl(I.h, 35 * f, 71); v["soft-4"] = hsl(I.h, 22 * f, 57);
    // nền sáng: tông ấm (đỏ/cam/nâu) dùng màu kem, tông khác ngả nhẹ theo nền tối
    const warm = I.h < 50 || I.h > 340, Lh = warm ? 32 : I.h;
    v.cloud = "#FFFFFF";
    v["cloud-2"] = hsl(Lh, (warm ? 100 : 60) * f, 98);
    v["cloud-3"] = hsl(Lh, (warm ? 52 : 35) * f, 93.5);
    v.line = hsl(Lh, (warm ? 37 : 25) * f, 85);
    v.text = hsl(I.h, 38 * f, 10);
    v.muted = hsl(I.h, 18 * f, 38);
    // biến dạng "r,g,b" cho bóng đổ, lớp phủ mờ
    v["brand-rgb"] = rgbStr(t.brand);
    v["deep-rgb"] = rgbStr(v["brand-deep"]);
    v["ink3-rgb"] = rgbStr(v["ink-3"]);
    v["text-rgb"] = rgbStr(v.text);
    v["glow-rgb"] = rgbStr(mix(t.sun, "#FFFFFF", .6));
    v["glow2-rgb"] = rgbStr(t.sun);
    return v;
  }
  /* Thẻ <style> chèn vào index.html — màu mặc định thì không chèn gì (dùng nguyên style.css) */
  function themeStyle(t) {
    if (!t || isDefaultTheme(t)) return "";
    const v = themeVars(t);
    return `<style id="aioti-theme">:root{${Object.keys(v).map(k => `--${k}:${v[k]}`).join(";")}}</style>\n`;
  }
  /* Kiểm tra màu dễ đọc — trả về danh sách cảnh báo */
  function themeChecks(t) {
    const v = themeVars(t), out = [];
    const chk = (a, b, min, txt) => { const c = contrast(a, b); if (c < min) out.push({ txt, ratio: Math.round(c * 10) / 10 }); };
    chk("#FFFFFF", v.brand, 4.5, "Chữ trắng trên nút Gọi (màu chủ đạo) hơi khó đọc — nên chọn màu chủ đạo đậm hơn.");
    chk(v.brand, v["cloud-2"], 4.5, "Tiêu đề nhỏ và con số (màu chủ đạo) trên nền sáng hơi nhạt — nên chọn màu chủ đạo đậm hơn.");
    chk(v["on-sun"], v.sun, 4.5, "Chữ trên nút màu nhấn khó đọc — nên chọn màu nhấn sáng hơn hoặc đậm hẳn.");
    chk(v["sun-lt"], v.ink, 4.5, "Chữ màu nhấn trên nền tối hơi khó đọc — nên chọn màu nhấn sáng hơn.");
    chk(v["soft-2"], v.ink, 7, "Chữ trên phần nền tối chưa đủ rõ — nên chọn màu nền tối đậm hơn.");
    chk("#FFFFFF", v["brand-deep"], 7, "Thanh menu trên cùng chưa đủ tối để chữ trắng nổi rõ — nên chọn màu chủ đạo đậm hơn.");
    return out;
  }

  /* =====================================================================
     LOGO & HÌNH ẢNH — các ô ảnh thay được từ trang quản lý
     Ảnh tải lên lưu ở img/u/… ; ảnh gốc trong img/ luôn giữ nguyên để khôi phục.
     recolor: không tải ảnh riêng thì tự đổi màu theo màu chủ đạo (khi không dùng màu gốc)
     ===================================================================== */
  const IMG_SLOTS = [
    { k: "logo",       file: "img/logo-trang.png",      name: "Logo nhỏ — thanh menu trên cùng", hint: "PNG nền trong suốt, hình màu trắng. Ngang khoảng 240–480px.", w: 480, white: true },
    { k: "logoFull",   file: "img/logo-trang-full.png", name: "Logo lớn — chân trang",            hint: "PNG nền trong suốt, hình màu trắng. Ngang khoảng 600px.", w: 600, white: true },
    { k: "eagleBg",    file: "img/daibang-trang.png",   name: "Đại bàng mờ — nền đầu trang",       hint: "PNG nền trong suốt, hình màu trắng (web tự làm mờ).", w: 840, white: true },
    { k: "eagleBtn",   file: "img/daibang-nut.png",     name: "Đại bàng trên nút lên đầu trang",   hint: "PNG nền trong suốt, hình màu trắng, nhỏ gọn.", w: 180, white: true },
    { k: "eagleSmall", file: "img/daibang-do.png",      name: "Đại bàng nhỏ — phía trên mục Cam kết", hint: "Không tải ảnh thì tự đổi theo màu chủ đạo. Ảnh riêng: PNG nền trong suốt.", w: 240, recolor: true },
    { k: "camera",     file: "img/icon-camera.png",     name: "Biểu tượng camera — thẻ dịch vụ",   hint: "PNG nền trong suốt, hình màu trắng.", w: 160, white: true },
    { k: "favicon",    file: "img/icon-180.png",        name: "Biểu tượng web — tab trình duyệt, màn hình điện thoại", hint: "Không tải ảnh thì tự đổi theo màu chủ đạo. Ảnh riêng: hình vuông, tự cắt giữa.", w: 180, square: true, recolor: true },
    { k: "share",      file: "thumbnail.jpg",           name: "Ảnh khi gửi link qua Zalo / Facebook", hint: "Ảnh ngang 1200×630, tự cắt cho vừa. Zalo/Facebook có thể vài ngày sau mới đổi.", w: 1200, h: 630, jpg: true }
  ];
  const brandHex = D => normTheme(D && D.theme).brand.slice(1);
  /* đường dẫn ảnh đang dùng cho một ô */
  function imgPath(D, k) {
    const up = D && D.images && D.images[k];
    if (up) return up;
    const sl = IMG_SLOTS.find(x => x.k === k);
    if (sl.recolor && D && D.theme && !isDefaultTheme(D.theme)) return `img/u/${k}-${brandHex(D)}${k === "favicon" ? "-180" : ""}.png`;
    return sl.file;
  }
  const favSmall = p => p === "img/icon-180.png" ? "img/favicon.png" : p.replace(/-180\.png$/, "-64.png");
  /* các file ảnh tự đổi màu cần có trên GitHub (trang quản lý tạo khi đăng) */
  function recolorNeeds(D) {
    const out = [];
    IMG_SLOTS.filter(s => s.recolor).forEach(s => {
      const p = imgPath(D, s.k);
      if (!p.startsWith(`img/u/${s.k}-`) || (D.images && D.images[s.k])) return;
      out.push({ k: s.k, path: p, src: s.file, size: s.k === "favicon" ? 180 : 0 });
      if (s.k === "favicon") out.push({ k: s.k, path: favSmall(p), src: "img/favicon.png", size: 64 });
    });
    return out;
  }
  /* mọi file trong img/u/ đang được web dùng — để dọn file cũ khi đăng */
  function imgUsed(D) {
    const u = new Set();
    IMG_SLOTS.forEach(s => { const p = imgPath(D, s.k); if (p.startsWith("img/u/")) { u.add(p); if (s.k === "favicon") u.add(favSmall(p)); } });
    return u;
  }

  /* Ảnh đại diện cho thẻ dịch vụ: ảnh gắn ★ → ảnh chỉ định sẵn → ảnh đầu tiên cùng ngành → ảnh đầu tiên bất kỳ */
  function pickCover(g, gallery) {
    return gallery.find(p => p.cat === g.cat && p.cover)
      || gallery.find(p => p.id === g.img)
      || gallery.find(p => p.cat === g.cat)
      || gallery[0] || null;
  }

  function serviceCard(g, i, gallery, P) {
    const pic = pickCover(g, gallery);
    const img = pic ? `<img src="anh/t-${esc(pic.id)}.jpg" alt="${esc(pic.cap || g.name)}" loading="lazy">` : "";
    const picBox = `<div class="svc-pic"><span class="rank">NHÓM ${String(i + 1).padStart(2, "0")}</span>${(ICONS[g.cat] || "").replace("img/icon-camera.png", esc(P.camera))}${img}</div>`;
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
    const P = {}; IMG_SLOTS.forEach(s => { P[s.k] = imgPath(D, s.k); });

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
      return `      <button class="vid rv" data-cat="${esc(v.cat)}" data-yt="${esc(v.id)}"${v.short ? ' data-short="1"' : ""} aria-label="Xem video: ${cap}">
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
    <div class="filt" id="vfilt" hidden></div>
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
<meta property="og:image" content="${esc(D.site.url)}${esc(P.share)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(D.site.url)}">
<meta name="theme-color" content="${D.theme && !isDefaultTheme(D.theme) ? themeVars(D.theme)["brand-deep"] : "#6E0A00"}">
<link rel="icon" type="image/png" href="${esc(favSmall(P.favicon))}">
<link rel="apple-touch-icon" href="${esc(P.favicon)}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css?v=${ver}">
${themeStyle(D.theme)}</head>
<body>

<header>
  <nav class="nav wrap" id="nav">
    <a class="brand" href="#top"><img class="mark" src="${esc(P.logo)}" alt="Logo AIOTI"><span><b>AIOTI</b><i>Công nghệ · An ninh · Năng lượng</i></span></a>
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
  <img class="eagle" src="${esc(P.eagleBg)}" alt="" aria-hidden="true">
  <div class="clouds" aria-hidden="true">
    <svg viewBox="0 0 1440 110" preserveAspectRatio="none">
      <path fill="rgba(255,255,255,.46)" d="M0,74 C150,30 260,96 420,66 C580,36 660,88 820,70 C980,52 1090,96 1240,72 C1330,58 1390,70 1440,64 L1440,110 L0,110 Z"/>
      <path fill="#FFFFFF" d="M0,90 C130,58 250,104 400,84 C560,62 690,102 840,86 C1000,68 1120,104 1280,88 C1350,81 1400,86 1440,84 L1440,110 L0,110 Z"/>
    </svg>
  </div>
</section>

<div class="stats">
  <dl class="wrap stats-g">
    <div><dd id="stY" data-from="${+S.fromYear}">${years}<small> năm</small></dd><dt>${esc(S.labelYear != null && S.labelYear !== "" ? S.labelYear : "Trong nghề từ {năm}").replace(/\{n[aă]m\}/gi, +S.fromYear)}</dt></div>
    <div><dd>${esc(S.devices)}</dd><dt>${esc(S.labelDevices || "Thiết bị an ninh đã lắp đặt")}</dt></div>
    <div><dd>${esc(S.kwp)}<small> kWp</small></dd><dt>${esc(S.labelKwp || "Điện mặt trời đã hòa lưới")}</dt></div>
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
${groups[0] ? serviceCard(groups[0], 0, gal, P) : ""}

      <div class="svcs-row">
${groups.slice(1).map((g, i) => serviceCard(g, i + 1, gal, P)).join("\n\n")}
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
  <span></span><img src="${esc(P.eagleSmall)}" alt=""><span></span>
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
        <img class="mark-ft" src="${esc(P.logoFull)}" alt="AIOTI GROUP">
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

<button class="top" id="topBtn" aria-label="Lên đầu trang"><img src="${esc(P.eagleBtn)}" alt=""></button>

<div class="dock">
  <a class="btn btn-red" href="${tel}">Gọi ngay</a>
  <a class="btn btn-sun" href="${zalo}">Nhắn Zalo</a>
</div>

<script src="site.js?v=${ver}"><\/script>
</body>
</html>
`;
  }

  const api = { renderSite, CATS, pickCover, THEME_DEFAULT, PRESETS, normTheme, isDefaultTheme, themeVars, themeStyle, themeChecks, contrast, IMG_SLOTS, imgPath, favSmall, recolorNeeds, imgUsed };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AIOTIRender = api;
})(typeof window !== "undefined" ? window : this);
