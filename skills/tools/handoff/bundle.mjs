#!/usr/bin/env node
// Every page of a site in ONE self-contained HTML file for the developer. No dependencies.
//
//   bundle.mjs --out <handoff.html> --page "<Tab>=<page.html>" [--page ...] [--interactions <interactions.md>]
//              [--links <links.json>] [--title <name>]
//
// Each page runs in its own frame, so its CSS and its scripts work as they do on their own. Images are
// inlined once and shared by every page (photos as JPEG, cut-outs as WebP when ffmpeg or cwebp is on the
// PATH). Links: an element with data-handoff="<Tab>", or whose text is a key of links.json, opens that tab.
// A Desktop / Mobile switch shows the page at full width or in a 390 px frame. interactions.md becomes the
// last tab: "## Group" headings and "- **Name**: what it does" lines.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

class Failure extends Error {}
const fail = (m) => { throw new Failure(m); };
const onPath = (b) => spawnSync("sh", ["-c", `command -v ${b}`]).status === 0;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif" };
const REF = /(?:src|href)="([^"#:?]+?\.(?:png|jpe?g|gif|webp|svg|avif))"|url\(["']?([^)"'#:?]+?\.(?:png|jpe?g|gif|webp|svg|avif))["']?\)/gi;

function parseArgs(argv) {
  const flags = { page: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; if (!a.startsWith("--") || i + 1 >= argv.length) fail(`unexpected ${a}`);
    const k = a.slice(2), v = argv[++i];
    if (k === "page") flags.page.push(v); else flags[k] = v;
  }
  return flags;
}

function seeThrough(file) {
  const e = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-vf", "alphaextract,signalstats,metadata=print", "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "";
  const m = e.match(/YMIN=(\d+)/); return Boolean(m) && Number(m[1]) < 255;
}
// a data URI; raster images get smaller when ffmpeg is there (photos 1600 px JPEG, cut-outs 900 px WebP)
export function dataUri(file) {
  const ext = file.toLowerCase().split(".").pop();
  const raw = () => `data:${MIME[ext]};base64,${readFileSync(file).toString("base64")}`;
  if (ext === "svg" || ext === "gif" || !onPath("ffmpeg")) return raw();
  const alpha = ext !== "jpg" && ext !== "jpeg" && seeThrough(file);
  const cache = join(tmpdir(), "handoff-bundle"); mkdirSync(cache, { recursive: true });
  const out = join(cache, createHash("md5").update(file + statSync(file).mtimeMs).digest("hex").slice(0, 12) + (alpha ? ".webp" : ".jpg"));
  try {
    if (!existsSync(out)) {
      if (alpha && onPath("cwebp")) execFileSync("cwebp", ["-quiet", "-q", "86", "-alpha_q", "100", "-resize", "900", "0", file, "-o", out]);
      else execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `scale='min(${alpha ? 900 : 1600},iw)':-2:flags=lanczos`, ...(alpha ? ["-c:v", "libwebp", "-quality", "86"] : ["-q:v", "4"]), out]);
    }
    return `data:${alpha ? "image/webp" : "image/jpeg"};base64,${readFileSync(out).toString("base64")}`;
  } catch { return raw(); }
}

export function interactionsHtml(md) {
  let html = "", open = false;
  for (const line of md.split("\n")) {
    const h = line.match(/^##\s+(.+)/), it = line.match(/^-\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (h) { if (open) html += "</section>"; html += `<section><h3>${esc(h[1])}</h3>`; open = true; }
    else if (it) html += `<div class="row"><b>${esc(it[1].replace(/:$/, ""))}</b><span>${esc(it[2])}</span></div>`;
  }
  return html + (open ? "</section>" : "");
}

export function bundle({ out, pages, interactions, links = {}, title = "Website handoff" }) {
  if (!pages.length) fail("at least one --page \"Tab=page.html\"");
  const tabs = pages.map((p) => { const i = p.indexOf("="); if (i < 1) fail(`--page needs "Tab=file": ${p}`); return [p.slice(0, i), resolve(p.slice(i + 1))]; });
  const assets = {}, docs = {};
  const nav = `<script>(()=>{const L=${JSON.stringify(links)};const go=t=>parent.postMessage({handoff:t},"*");
document.querySelectorAll("[data-handoff],a,button,nav span,header span,footer span,footer a").forEach(e=>{const t=e.dataset.handoff||L[e.textContent.trim()];if(t){e.style.cursor="pointer";e.addEventListener("click",v=>{v.preventDefault();v.stopPropagation();go(t)})}});})()</script>`;
  for (const [tab, file] of tabs) {
    const dir = dirname(file); let s = readFileSync(file, "utf8");
    s = s.replace(REF, (m, a, b) => {
      const rel = a ?? b, full = resolve(dir, rel);
      if (!existsSync(full)) return m;
      const key = "@" + createHash("md5").update(full).digest("hex").slice(0, 10);
      assets[key] ??= dataUri(full);
      return m.replace(rel, key);
    });
    docs[tab] = s.includes("</body>") ? s.replace("</body>", nav + "</body>") : s + nav;
  }
  const ix = interactions ? interactionsHtml(readFileSync(interactions, "utf8")) : "";
  const json = (o) => JSON.stringify(o).replace(/<\//g, "<\\/");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0}html,body{height:100%;background:#F4F5F8;color:#1b1f24;font-family:system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif}
.bar{position:fixed;inset:0 0 auto 0;height:60px;background:#fff;border-bottom:1px solid #0001;display:flex;align-items:center;gap:4px;padding:0 14px;z-index:5;overflow-x:auto;scrollbar-width:none}
.bar .t{font-weight:700;font-size:16px;margin-right:12px;white-space:nowrap}
.bar button{border:0;background:none;font:600 13px/1 inherit;padding:9px 13px;border-radius:99px;cursor:pointer;white-space:nowrap;color:inherit}
.bar button.on{background:#1b1f24;color:#fff}.bar button:hover:not(.on){background:#0000000d}.sp{flex:1}
.seg{display:flex;background:#F4F5F8;border-radius:99px;padding:3px}
.stage{position:fixed;inset:60px 0 0 0;display:flex;justify-content:center;overflow:auto}
iframe{border:0;background:#fff;width:100%;height:100%}
.mob iframe{width:390px;height:calc(100% - 40px);margin-top:20px;border-radius:24px;box-shadow:0 30px 80px -30px #0006}
.ix{display:none;max-width:980px;margin:0 auto;padding:50px 20px 120px}.ixon .ix{display:block}.ixon iframe{display:none}
.ix h2{font-size:40px}.ix section{background:#fff;border-radius:20px;padding:26px 30px;margin-top:22px}
.ix h3{font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.ix .row{display:grid;grid-template-columns:220px 1fr;gap:18px;padding:14px 0;border-bottom:1px solid #0000000f;font-size:16px;line-height:1.55}.ix .row:last-child{border:0}
@media(max-width:700px){.ix .row{grid-template-columns:1fr;gap:4px}.mob iframe{width:100%;margin:0;border-radius:0;height:100%}}
</style></head><body>
<div class="bar"><span class="t">${esc(title)}</span>${tabs.map(([t]) => `<button data-p="${esc(t)}">${esc(t)}</button>`).join("")}${ix ? '<button data-p="__ix">Interactions</button>' : ""}
<span class="sp"></span><div class="seg"><button data-w="d" class="on">Desktop</button><button data-w="m">Mobile</button></div></div>
<div class="stage" id="st"><iframe id="fr" title="page"></iframe><div class="ix"><h2>How it works</h2>${ix}</div></div>
<script id="assets" type="application/json">${json(assets)}</script><script id="docs" type="application/json">${json(docs)}</script>
<script>
const A=JSON.parse(document.getElementById("assets").textContent),D=JSON.parse(document.getElementById("docs").textContent),fr=document.getElementById("fr"),st=document.getElementById("st");
const U={},ready=Promise.all(Object.entries(A).map(([k,v])=>fetch(v).then(r=>r.blob()).then(b=>U[k]=URL.createObjectURL(b))));
let cur=null;
async function show(p){if(!(p in D)&&p!=="__ix")p=Object.keys(D)[0];
 document.querySelectorAll("[data-p]").forEach(b=>b.classList.toggle("on",b.dataset.p===p));st.classList.toggle("ixon",p==="__ix");
 if(p!=="__ix"&&p!==cur){await ready;fr.srcdoc=D[p].replace(/@[0-9a-f]{10}/g,k=>U[k]||k)}
 cur=p;history.replaceState(0,"","#"+encodeURIComponent(p))}
addEventListener("message",e=>{if(e.data&&e.data.handoff)show(e.data.handoff)});
document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>show(b.dataset.p));
document.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-w]").forEach(x=>x.classList.toggle("on",x===b));st.classList.toggle("mob",b.dataset.w==="m")});
show(decodeURIComponent(location.hash.slice(1))||Object.keys(D)[0]);
</script></body></html>`;
  writeFileSync(out, html);
  return { bytes: html.length, images: Object.keys(assets).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const f = parseArgs(process.argv.slice(2));
    const r = bundle({ out: f.out ?? fail("--out is required"), pages: f.page, interactions: f.interactions, title: f.title,
      links: f.links ? JSON.parse(readFileSync(f.links, "utf8")) : {} });
    console.log(`${f.out}: ${(r.bytes / 1e6).toFixed(1)} MB, ${r.images} images`);
  } catch (e) { if (!(e instanceof Failure)) throw e; console.error(e.message); process.exit(1); }
}
