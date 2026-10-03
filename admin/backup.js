/* =====================================================================
   AIOTI — SAO LƯU & KHÔI PHỤC
   1. Lịch sử các lần đăng (GitHub tự lưu mỗi lần đăng) → xem lại, khôi phục
   2. Tải bản sao lưu .zip về máy (chủ động bấm)
   3. Khôi phục web từ file .zip (cả khi kho GitHub bị xóa sạch)
   Dùng chung các hàm của trang quản lý: gh, cfg, base, D, load, dialog, esc, friendly, $
   ===================================================================== */
"use strict";
const BK_KEY = () => `aioti_backup_${cfg.owner}/${cfg.repo}`;
const BK_EXCLUDE = new Set(["sao-luu.json", "DOC-KHOI-PHUC.txt"]);
const pad2 = n => String(n).padStart(2, "0");
const fmtTime = d => { d = new Date(d); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const sleep = ms => new Promise(r => setTimeout(r, ms));
function bkLast() { try { return JSON.parse(localStorage.getItem(BK_KEY()) || "null"); } catch (_) { return null; } }
function bkSetLast(o) { try { localStorage.setItem(BK_KEY(), JSON.stringify(o)); } catch (_) { } }
function hasUnsaved() { return !!(D && base && (JSON.stringify(D) !== base.snap || newFiles.size || junk.length)); }

/* ---------- đọc GitHub ---------- */
async function headCommit() { const r = await gh(`/git/ref/heads/${cfg.branch}`); return r.object.sha; }
async function treeOf(commitSha) {
  const c = await gh(`/git/commits/${commitSha}`);
  const t = await gh(`/git/trees/${c.tree.sha}?recursive=1`);
  return { tree: c.tree.sha, files: t.tree.filter(x => x.type === "blob"), date: c.author && c.author.date, message: c.message };
}
async function fileText(path, ref) {
  const r = await gh(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${ref}`);
  return b64ToText(r.content || "");
}
/* tải nội dung một file (nhị phân) ở một phiên bản */
async function fileBytes(f, commitSha) {
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${commitSha}/${f.path.split("/").map(encodeURIComponent).join("/")}`, { cache: "no-store" });
    if (r.ok) { const b = new Uint8Array(await r.arrayBuffer()); if (f.size == null || b.length === f.size) return b; }
  } catch (_) { }
  const j = await gh(`/git/blobs/${f.sha}`);                 // kho riêng tư / raw lỗi → lấy qua API
  return Uint8Array.from(atob(j.content.replace(/\s/g, "")), c => c.charCodeAt(0));
}

/* ======================= ZIP (tự viết, không cần thư viện) ======================= */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {           // files: [{name, data:Uint8Array}] — lưu nguyên (ảnh JPG/PNG vốn đã nén)
  const enc = new TextEncoder(), parts = [], cen = [];
  const now = new Date(), dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF,
        dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  let off = 0;
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true);
    h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true);
    c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + sz;
  }
  const cenSize = cen.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cenSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/zip" });
}
async function readZip(blob) {      // đọc được file .zip của công cụ này, của GitHub, của Windows / điện thoại (nén thường)
  const buf = new Uint8Array(await blob.arrayBuffer()), v = new DataView(buf.buffer);
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("File này không phải file .zip hợp lệ.");
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const out = [], dec8 = new TextDecoder("utf-8");
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("File .zip bị hỏng.");
    const method = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true),
          xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
    const name = dec8.decode(buf.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (name.endsWith("/")) continue;
    const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true);
    const raw = buf.subarray(ds, ds + csz);
    out.push({ name, method, raw });
  }
  for (const f of out) {
    if (f.method === 0) f.data = f.raw;
    else if (f.method === 8) {
      if (!window.DecompressionStream) throw new Error("Trình duyệt này không giải nén được file .zip. Hãy dùng Chrome hoặc Safari bản mới.");
      f.data = new Uint8Array(await new Response(new Blob([f.raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    } else throw new Error("File .zip dùng kiểu nén không hỗ trợ (" + f.name + ").");
    delete f.raw;
  }
  return out;
}
/* git blob sha — để biết file nào GitHub đã có sẵn, khỏi tải lên lại */
async function gitSha(data) {
  const h = new TextEncoder().encode(`blob ${data.length}\0`), all = new Uint8Array(h.length + data.length);
  all.set(h); all.set(data, h.length);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-1", all))].map(x => x.toString(16).padStart(2, "0")).join("");
}
const u8ToB64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

/* ======================= TẢI BẢN SAO LƯU ======================= */
async function downloadBackup() {
  if (hasUnsaved() && !confirm("Có thay đổi CHƯA ĐĂNG. Bản sao lưu chỉ gồm những gì đã đăng lên web.\n\nVẫn tải bản sao lưu?")) return;
  const ov = dialog(`<h3>Tải bản sao lưu</h3><p>Đang chuẩn bị… Giữ màn hình mở cho tới khi xong.</p>
    <div class="prog"><i id="bkI"></i></div><p class="plog" id="bkLog">Đọc danh sách file…</p>`);
  const log = (t, c) => { const x = ov.querySelector("#bkLog"); x.textContent = t; x.className = "plog" + (c ? " " + c : ""); };
  const bar = p => { ov.querySelector("#bkI").style.width = Math.round(p * 100) + "%"; };
  try {
    const head = await headCommit(), T = await treeOf(head);
    const files = T.files.filter(f => !BK_EXCLUDE.has(f.path));
    const total = files.reduce((s, f) => s + (f.size || 0), 0);
    const out = new Array(files.length); let done = 0, idx = 0;
    log(`Tải ${files.length} file (${fmtSize(total)})…`);
    async function worker() {
      while (idx < files.length) {
        const i = idx++; const f = files[i];
        out[i] = { name: f.path, data: await fileBytes(f, head) };
        done++; bar(done / files.length * .95); log(`Đang tải ${done}/${files.length} file…`);
      }
    }
    await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
    const when = new Date();
    const manifest = { app: "AIOTI website", backup: 1, repo: `${cfg.owner}/${cfg.repo}`, branch: cfg.branch, commit: head,
      commitDate: T.date, createdAt: when.toISOString(), files: files.length, bytes: total };
    const guide = `BẢN SAO LƯU WEBSITE AIOTI
Tạo lúc: ${fmtTime(when)}
Kho: ${cfg.owner}/${cfg.repo} · phiên bản ${head.slice(0, 7)} (đăng lúc ${fmtTime(T.date)})
Gồm ${files.length} file (${fmtSize(total)}): chữ, ảnh công trình, bảng giá, video, màu sắc, logo, công cụ quản lý.

CÁCH KHÔI PHỤC
1. Mở công cụ quản lý: ${(D && D.site && D.site.url) || "https://<tài khoản>.github.io/<kho>/"}admin/
2. Tab "Sao lưu" -> "Khôi phục từ file sao lưu" -> chọn file .zip này.
   (Chưa vào được công cụ quản lý? Ở màn hình Kết nối GitHub có nút
    "Khôi phục web từ file sao lưu".)
3. Kho GitHub bị xóa hẳn: tạo kho mới (tick "Add a README file"), bật GitHub Pages,
   tạo mã khóa mới cho kho đó, rồi làm như bước 2.

KHÔNG giải nén rồi sửa file bên trong — giữ nguyên file .zip.
Nên cất 1 bản trên máy tính + 1 bản trên NAS / ổ cứng ngoài.
`;
    const enc = new TextEncoder();
    out.push({ name: "sao-luu.json", data: enc.encode(JSON.stringify(manifest, null, 1)) }, { name: "DOC-KHOI-PHUC.txt", data: enc.encode(guide) });
    log("Đóng gói file .zip…");
    const zip = makeZip(out);
    const fname = `AIOTI-SaoLuu Website -${when.getFullYear()}-${pad2(when.getMonth() + 1)}-${pad2(when.getDate())}-${pad2(when.getHours())}${pad2(when.getMinutes())}.zip`;
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    bar(1);
    bkSetLast({ at: when.toISOString(), commit: head, file: fname, bytes: zip.size });
    ov.querySelector(".dlg").innerHTML = `<h3>Đã tạo bản sao lưu</h3>
      <div class="msg good">File <b>${esc(fname)}</b> (${fmtSize(zip.size)}) đã được tải về máy.</div>
      <p>Không thấy file? Bấm nút dưới để tải lại. Nên cất 1 bản trên máy tính và 1 bản trên NAS / ổ cứng ngoài.</p>
      <div class="row"><a class="btn btn-line" href="${url}" download="${esc(fname)}">Tải lại file</a><button class="btn btn-red" id="bkOk">Xong</button></div>`;
    ov.querySelector("#bkOk").onclick = () => ov.remove();
    renderBackup();
  } catch (e) {
    console.error(e); log(friendly(e), "err");
    ov.querySelector(".dlg").insertAdjacentHTML("beforeend", `<div class="row"><button class="btn btn-line" id="bkX">Đóng</button></div>`);
    ov.querySelector("#bkX").onclick = () => ov.remove();
  }
}

/* ======================= LỊCH SỬ CÁC LẦN ĐĂNG ======================= */
let hist = [], histPage = 0, histEnd = false;
function niceMsg(m) {
  m = String(m || "").split("\n")[0];
  if (/^Cập nhật website:\s*/.test(m)) return m.replace(/^Cập nhật website:\s*/, "");
  if (/^Add files via upload/i.test(m)) return "Tải file trực tiếp trên GitHub";
  if (/^(Update|Create|Delete) /i.test(m)) return "Sửa trực tiếp trên GitHub: " + m;
  return m;
}
async function loadHistory(more) {
  const L = $("bkHist"); if (!more) { hist = []; histPage = 0; histEnd = false; L.innerHTML = '<p class="hint">Đang tải lịch sử…</p>'; }
  try {
    const pg = more ? histPage + 1 : 1;
    const r = await gh(`/commits?sha=${encodeURIComponent(cfg.branch)}&per_page=30&page=${pg}`);
    histPage = pg; hist = more ? hist.concat(r.filter(c => !hist.some(h => h.sha === c.sha))) : r;   // tải lại thì thay hẳn, không cộng dồn
    histEnd = r.length < 30;
    renderHistory();
  } catch (e) { L.innerHTML = `<div class="msg bad">${esc(friendly(e))}</div>`; }
}
function renderHistory() {
  const L = $("bkHist"), last = bkLast();
  if (!hist.length) { L.innerHTML = '<p class="hint">Chưa có lần đăng nào.</p>'; return; }
  L.innerHTML = hist.map((c, i) => {
    const d = c.commit.author && c.commit.author.date, cur = i === 0;
    return `<div class="hrow${cur ? " cur" : ""}" data-sha="${c.sha}">
      <div class="hmeta"><b>${fmtTime(d)}</b>${cur ? '<span class="tag cov">ĐANG DÙNG</span>' : ""}${last && last.commit === c.sha ? '<span class="tag new">ĐÃ TẢI VỀ</span>' : ""}
        <span class="hmsg">${esc(niceMsg(c.commit.message))}</span><code>${c.sha.slice(0, 7)}</code></div>
      <div class="hact"><button class="ib" data-h="view" type="button">Xem ↗</button>${cur ? "" : '<button class="ib" data-h="restore" type="button">Khôi phục</button>'}</div></div>`;
  }).join("") + (histEnd ? "" : '<button class="btn btn-line btn-w" id="bkMore" type="button" style="margin-top:8px">Xem thêm các lần đăng cũ hơn</button>');
}
/* xem lại web đúng như lúc đăng bản đó */
async function viewVersion(sha) {
  const w = window.open("", "_blank");
  if (!w) { alert("Trình duyệt chặn cửa sổ mới. Hãy cho phép mở cửa sổ bật lên cho trang này."); return; }
  try { w.document.write('<p style="font:16px sans-serif;padding:20px">Đang tải bản cũ…</p>'); } catch (_) { }
  try {
    const c = hist.find(x => x.sha === sha), when = c ? fmtTime(c.commit.author.date) : sha.slice(0, 7);
    let html = await fileText("index.html", sha);
    let css = "", js = "";
    try { css = await fileText("style.css", sha); } catch (_) { }
    try { js = await fileText("site.js", sha); } catch (_) { }
    html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, () => `<style>${css}</style>`)
               .replace(/<script src="site\.js[^"]*"><\/script>/, () => `<script>${js.replace(/<\/script/gi, "<\\/script")}<\/script>`)
               .replace("<head>", `<head><base href="https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${sha}/">`)
               .replace("<body>", `<body><div style="position:sticky;top:0;z-index:999;background:#1C6E8C;color:#fff;font:600 14px sans-serif;padding:8px 12px;text-align:center">BẢN CŨ — đăng lúc ${esc(when)} · chỉ để xem</div>`);
    w.location = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  } catch (e) { try { w.document.body.innerHTML = `<p style="font:16px sans-serif;padding:20px;color:#A31000">Không mở được bản này: ${esc(friendly(e))}</p>`; } catch (_) { } }
}
/* cây file mới = cây bản cũ, nhưng (tùy chọn) giữ nguyên công cụ quản lý hiện tại */
function adminKeepEntries(oldFiles, curFiles) {
  const ent = [], curAdmin = curFiles.filter(f => f.path.startsWith("admin/"));
  if (!curAdmin.some(f => f.path === "admin/index.html")) return null;
  const curSet = new Set(curAdmin.map(f => f.path));
  curAdmin.forEach(f => ent.push({ path: f.path, mode: f.mode || "100644", type: "blob", sha: f.sha }));
  oldFiles.filter(f => f.path.startsWith("admin/") && !curSet.has(f.path)).forEach(f => ent.push({ path: f.path, mode: "100644", type: "blob", sha: null }));
  return ent;
}
async function restoreVersion(sha) {
  const c = hist.find(x => x.sha === sha), when = c ? fmtTime(c.commit.author.date) : sha.slice(0, 7);
  const o = dialog(`<h3>Khôi phục về bản ${esc(when)}?</h3>
    <p>Toàn bộ web (chữ, ảnh, video, bảng giá, màu sắc, logo) sẽ quay về đúng như lúc đăng bản này.</p>
    <div class="msg warn">Bản hiện tại <b>không bị mất</b> — vẫn nằm trong lịch sử, khôi phục lại được bất cứ lúc nào.</div>
    ${hasUnsaved() ? '<div class="msg bad">Các thay đổi <b>chưa đăng</b> trên màn hình sẽ bị bỏ.</div>' : ""}
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;margin:8px 0"><input type="checkbox" id="rsKeep" checked style="margin-top:4px">
      <span>Giữ nguyên <b>công cụ quản lý</b> bản mới nhất (nên giữ — chỉ bỏ chọn khi nghi công cụ quản lý bị sửa bậy)</span></label>
    <div class="row"><button class="btn btn-line" id="rsNo">Thôi</button><button class="btn btn-red" id="rsYes">Khôi phục</button></div>`);
  o.querySelector("#rsNo").onclick = () => o.remove();
  o.querySelector("#rsYes").onclick = async () => {
    const keep = o.querySelector("#rsKeep").checked;
    o.querySelector(".dlg").innerHTML = '<h3>Đang khôi phục…</h3><p class="plog" id="rsLog">Đọc bản cũ…</p>';
    const log = t => { o.querySelector("#rsLog").textContent = t; };
    try {
      const head = await headCommit();
      const Old = await treeOf(sha), Cur = await treeOf(head);
      let treeSha = Old.tree;
      const keepEnt = keep ? adminKeepEntries(Old.files, Cur.files) : null;
      if (keepEnt && keepEnt.length) { log("Giữ công cụ quản lý hiện tại…"); treeSha = (await gh("/git/trees", { method: "POST", body: { base_tree: Old.tree, tree: keepEnt } })).sha; }
      log("Lưu lên GitHub…");
      const cm = await gh("/git/commits", { method: "POST", body: { message: `Khôi phục về bản ${when} (${sha.slice(0, 7)})`, tree: treeSha, parents: [head] } });
      await gh(`/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: { sha: cm.sha } });
      o.querySelector(".dlg").innerHTML = `<h3>Đã khôi phục</h3><div class="msg good">Web đã quay về bản ${esc(when)}. Khoảng <b>1–2 phút</b> sau web tự cập nhật.</div>
        <div class="row"><button class="btn btn-red" id="rsOk">Xong</button></div>`;
      o.querySelector("#rsOk").onclick = () => o.remove();
      await load(); switchTab("backup");
    } catch (e) {
      console.error(e);
      o.querySelector(".dlg").innerHTML = `<h3>Chưa khôi phục được</h3><div class="msg bad">${esc(friendly(e))}</div><div class="row"><button class="btn btn-line" id="rsX">Đóng</button></div>`;
      o.querySelector("#rsX").onclick = () => o.remove();
    }
  };
}

/* ======================= KHÔI PHỤC TỪ FILE .ZIP ======================= */
function pickZip() {
  return new Promise(res => {
    const i = document.createElement("input"); i.type = "file"; i.accept = ".zip,application/zip";
    i.onchange = () => res(i.files[0] || null); i.click();
  });
}
async function restoreFromZip(file, onDone) {
  const o = dialog('<h3>Khôi phục từ file sao lưu</h3><p class="plog" id="zLog">Đọc file .zip…</p>');
  const q = s => o.querySelector(s);
  const fail = e => { console.error(e); q(".dlg").innerHTML = `<h3>Chưa khôi phục được</h3><div class="msg bad">${esc(e.message && !e.status ? e.message : friendly(e))}</div><div class="row"><button class="btn btn-line" id="zX">Đóng</button></div>`; q("#zX").onclick = () => o.remove(); };
  let entries, man = null, files;
  try {
    entries = await readZip(file);
    // tìm thư mục chứa web (có data.json + index.html) — chấp nhận file .zip có thêm thư mục bọc ngoài
    const cands = entries.filter(f => /(^|\/)data\.json$/.test(f.name)).map(f => f.name.slice(0, -"data.json".length))
      .filter(pre => entries.some(f => f.name === pre + "index.html")).sort((a, b) => a.length - b.length);
    if (!cands.length) throw new Error("File .zip này không phải bản sao lưu website (không thấy data.json và index.html).");
    const pre = cands[0];
    const m = entries.find(f => f.name === pre + "sao-luu.json");
    if (m) { try { man = JSON.parse(new TextDecoder().decode(m.data)); } catch (_) { } }
    files = entries.filter(f => f.name.startsWith(pre)).map(f => ({ path: f.name.slice(pre.length), data: f.data }))
      .filter(f => f.path && !BK_EXCLUDE.has(f.path) && !/(^|\/)(\.DS_Store|Thumbs\.db|__MACOSX\/.*)$/.test(f.path) && !f.path.startsWith("__MACOSX/") && !f.path.startsWith(".git/"));
    const dj = files.find(f => f.path === "data.json");
    const data = JSON.parse(new TextDecoder().decode(dj.data));
    if (!data.contact || !data.hero) throw new Error("data.json trong file .zip không đúng dạng.");
    const total = files.reduce((s, f) => s + f.data.length, 0);
    const info = [`${files.length} file · ${fmtSize(total)}`];
    if (man && man.createdAt) info.unshift(`Sao lưu lúc <b>${fmtTime(man.createdAt)}</b>` + (man.repo ? ` từ kho <b>${esc(man.repo)}</b>` : ""));
    info.push(`${(data.gallery || []).length} ảnh công trình · ${(data.videos || []).length} video · ${(data.prices || []).length} bảng giá`);
    q(".dlg").innerHTML = `<h3>Khôi phục từ file sao lưu?</h3>
      <p>${info.join("<br>")}</p>
      <div class="msg warn">Toàn bộ web hiện tại trên kho <b>${esc(cfg.owner)}/${esc(cfg.repo)}</b> sẽ được thay bằng nội dung trong file này. Bản hiện tại vẫn còn trong lịch sử, khôi phục lại được.</div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;margin:8px 0"><input type="checkbox" id="zKeep" checked style="margin-top:4px">
        <span>Giữ nguyên <b>công cụ quản lý</b> đang dùng (nên giữ). Kho chưa có công cụ quản lý thì tự lấy từ file sao lưu.</span></label>
      <div class="row"><button class="btn btn-line" id="zNo">Thôi</button><button class="btn btn-red" id="zYes">Khôi phục</button></div>`;
    q("#zNo").onclick = () => o.remove();
    await new Promise(res => { q("#zYes").onclick = res; });
  } catch (e) { fail(e); return; }
  const keep = q("#zKeep").checked;
  q(".dlg").innerHTML = `<h3>Đang khôi phục</h3><p>Giữ màn hình mở. Kho trống hoặc nhiều ảnh mới có thể mất vài phút (GitHub giới hạn tốc độ tải lên).</p>
    <div class="prog"><i id="zI"></i></div><p class="plog" id="zLog">Kiểm tra kho GitHub…</p>`;
  const log = t => { q("#zLog").textContent = t; }, bar = p => { q("#zI").style.width = Math.round(p * 100) + "%"; };
  try {
    // 1. phiên bản hiện tại (kho trống thì tạo bản đầu tiên)
    let head;
    try { head = await headCommit(); }
    catch (e) {
      if (e.status !== 404 && e.status !== 409) throw e;
      log("Kho đang trống — tạo bản đầu tiên…");
      await gh("/contents/README.md", { method: "PUT", body: { message: "Khởi tạo kho", content: btoa("Website AIOTI\n"), branch: cfg.branch } });
      head = await headCommit();
    }
    const Cur = await treeOf(head);
    const have = new Set(Cur.files.map(f => f.sha));
    const keepAdmin = keep && Cur.files.some(f => f.path === "admin/index.html");
    const up = keepAdmin ? files.filter(f => !f.path.startsWith("admin/")) : files;
    // 2. tính mã từng file, chỉ tải lên file GitHub chưa có
    const ent = [];
    let k = 0;
    for (const f of up) {
      k++; bar(k / up.length * .25); log(`Kiểm tra file ${k}/${up.length}…`);
      f.sha = await gitSha(f.data);
      ent.push({ path: f.path, mode: "100644", type: "blob", sha: f.sha });
    }
    const need = [];
    for (const f of up) {
      if (have.has(f.sha) || need.some(x => x.sha === f.sha)) continue;
      let exists = false;
      try { const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/blobs/${f.sha}`, { method: "HEAD", headers: { Authorization: "Bearer " + cfg.token } }); exists = r.ok; } catch (_) { }
      if (!exists) need.push(f);
    }
    let n = 0;
    for (const f of need) {
      n++; bar(.25 + n / Math.max(1, need.length) * .65); log(`Tải lên ${n}/${need.length} file…`);
      for (let tries = 0; ; tries++) {
        try { await gh("/git/blobs", { method: "POST", body: { content: u8ToB64(f.data), encoding: "base64" } }); break; }
        catch (e) {
          if ((e.status === 403 || e.status === 429) && tries < 6) { for (let s = 60; s > 0; s--) { log(`GitHub yêu cầu chờ — tiếp tục sau ${s} giây… (${n}/${need.length})`); await sleep(1000); } continue; }
          throw e;
        }
      }
      if (need.length > 60) await sleep(800);          // giữ dưới giới hạn ~80 lần/phút của GitHub
    }
    if (keepAdmin) Cur.files.filter(f => f.path.startsWith("admin/")).forEach(f => ent.push({ path: f.path, mode: f.mode || "100644", type: "blob", sha: f.sha }));
    // 3. tạo phiên bản mới = đúng nội dung file sao lưu
    log("Lưu lên GitHub…"); bar(.95);
    const tree = await gh("/git/trees", { method: "POST", body: { tree: ent } });
    const when = man && man.createdAt ? fmtTime(man.createdAt) : file.name;
    const cm = await gh("/git/commits", { method: "POST", body: { message: `Khôi phục từ file sao lưu ${when}`, tree: tree.sha, parents: [head] } });
    await gh(`/git/refs/heads/${cfg.branch}`, { method: "PATCH", body: { sha: cm.sha } });
    bar(1);
    q(".dlg").innerHTML = `<h3>Đã khôi phục</h3><div class="msg good">Web đã được khôi phục từ file sao lưu${need.length ? ` (tải lên ${need.length} file)` : ""}. Khoảng <b>1–2 phút</b> sau web tự cập nhật.</div>
      <p>Kho mới tạo? Nhớ bật GitHub Pages: Settings → Pages → Branch <b>${esc(cfg.branch)}</b> → Save.</p>
      <div class="row"><button class="btn btn-red" id="zOk">Xong</button></div>`;
    q("#zOk").onclick = () => o.remove();
    if (onDone) await onDone();
  } catch (e) { fail(e); }
}

/* ======================= GIAO DIỆN TAB SAO LƯU ======================= */
function renderBackup() {
  const last = bkLast();
  $("bkLast").innerHTML = last
    ? `Lần tải gần nhất trên máy này: <b>${fmtTime(last.at)}</b> · ${esc(last.file || "")} (${fmtSize(last.bytes || 0)})`
    : "Máy này chưa tải bản sao lưu nào.";
  if (hist.length) renderHistory();
}
$("bkDown").addEventListener("click", downloadBackup);
$("bkHistLoad").addEventListener("click", () => loadHistory(false));
$("bkHist").addEventListener("click", e => {
  if (e.target.id === "bkMore") { e.target.disabled = true; loadHistory(true); return; }
  const b = e.target.closest("[data-h]"); if (!b) return;
  const sha = b.closest(".hrow").dataset.sha;
  if (b.dataset.h === "view") viewVersion(sha); else restoreVersion(sha);
});
$("bkZip").addEventListener("click", async () => {
  if (hasUnsaved() && !confirm("Có thay đổi CHƯA ĐĂNG — khôi phục sẽ bỏ các thay đổi này. Tiếp tục?")) return;
  const f = await pickZip(); if (!f) return;
  restoreFromZip(f, async () => { await load(); switchTab("backup"); });
});
/* màn hình Kết nối: khôi phục khi chưa vào được công cụ quản lý (kho trống / mất data.json) */
$("btnLoginZip").addEventListener("click", async () => {
  const token = $("inTok").value.trim() || (cfg && cfg.token) || "";
  if (!token) { $("loginMsg").innerHTML = '<div class="msg bad">Hãy dán mã khóa GitHub trước.</div>'; return; }
  cfg = { token, owner: $("inOwner").value.trim() || "khoantm", repo: $("inRepo").value.trim() || "website-aioti", branch: $("inBranch").value.trim() || "main" };
  const f = await pickZip(); if (!f) return;
  restoreFromZip(f, async () => {
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (_) { }
    $("inTok").value = "";
    try { await load(); } catch (e) { show("vLogin"); $("loginMsg").innerHTML = `<div class="msg bad">${esc(friendly(e))}</div>`; }
  });
});
