// Runs inside the rendered page (figma.mjs injects it) and writes the layout as JSON into <pre id="__out">:
// every box, text run, SVG, image crop, clip-path and mask with page coordinates. No dependencies.
(async () => { try {
  const T = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))])
  await T(document.fonts.ready, 2000)
  await T(Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))), 3000)
  const page = document.querySelector('.page'), P = page.getBoundingClientRect()
  const nat = {}
  const natSize = async url => { if (nat[url]) return nat[url]; const im = new Image(); im.src = url; try { await T(im.decode(), 3000) } catch (e) {} return nat[url] = { w: im.naturalWidth, h: im.naturalHeight } }
  const zkey = el => { for (let e = el; e && e !== page; e = e.parentElement) { const z = getComputedStyle(e).zIndex; if (z !== 'auto') return +z } return 0 }
  const rot = cs => { const t = cs.transform; if (!t || t === 'none') return 0; const m = t.match(/matrix\(([^)]+)\)/); if (!m) return 0; const [a, b] = m[1].split(',').map(Number); return Math.atan2(b, a) * 180 / Math.PI }
  // cumulative scale from CSS transforms on the element's ancestors (e.g. .prod{transform:scale(.78)})
  const scaleOf = el => { let k = 1; for (let e = el.parentElement; e && e !== page; e = e.parentElement) { const t = getComputedStyle(e).transform; const m = t && t.match(/matrix\(([^)]+)\)/); if (m) { const [a, b] = m[1].split(',').map(Number); k *= Math.hypot(a, b) } } return k }
  const ownScale = el => { const t = getComputedStyle(el).transform; const m = t && t.match(/matrix\(([^)]+)\)/); if (!m) return 1; const [a, b] = m[1].split(',').map(Number); return Math.hypot(a, b) }
  const geom = el => { const r = el.getBoundingClientRect(); let w = el.offsetWidth, h = el.offsetHeight, k = 1
    if (w === undefined) { w = r.width; h = r.height }  // svg: drawn size already includes every transform
    else k = scaleOf(el) * ownScale(el)
    return { cx: r.left - P.left + r.width / 2, cy: r.top - P.top + r.height / 2, w: w * k, h: h * k, k } }
  const tags = () => []
  const base0 = location.href.replace(/[^/]*$/, '')
  const rel = u => decodeURIComponent(new URL(u, location.href).href.replace(base0, ''))
  // ribbon text on a path: one entry per rendered glyph, in page coordinates
  const glyphsOf = svg => {
    const out = []
    for (const t of svg.querySelectorAll('text')) {
      const tp = t.querySelector('textPath'); if (!tp) continue
      const cs = getComputedStyle(t), M = t.getScreenCTM(), sc = Math.hypot(M.a, M.b), txt = tp.textContent, n = t.getNumberOfChars()
      const vb = svg.viewBox.baseVal
      for (let i = 0; i < n; i++) {
        const ch = txt[i]; if (!ch || !ch.trim()) continue
        let s0, s1, ex
        try { s0 = t.getStartPositionOfChar(i); s1 = t.getEndPositionOfChar(i); ex = t.getExtentOfChar(i) } catch (e) { continue }
        if (!ex.width || (s0.x === 0 && s0.y === 0 && s1.x === 0)) continue
        const cx = ex.x + ex.width / 2, cy = ex.y + ex.height / 2
        if (vb && (cx < vb.x - 40 || cx > vb.x + vb.width + 40)) continue
        const p = new DOMPoint(cx, cy).matrixTransform(M)
        const ang = Math.atan2(s1.y - s0.y, s1.x - s0.x) * 180 / Math.PI + Math.atan2(M.b, M.a) * 180 / Math.PI
        out.push([ch, p.x - P.left, p.y - P.top, ang])
      }
      out.push({ size: parseFloat(cs.fontSize) * sc, weight: +cs.fontWeight, family: cs.fontFamily, color: cs.fill, ls: parseFloat(t.getAttribute('letter-spacing') || 0) * sc })
    }
    return out
  }
  const out = [], ids = new Map(), done = new Set(); let nid = 0
  const clipOf = el => { for (let e = el.parentElement; e && e !== page; e = e.parentElement) if (ids.has(e)) return ids.get(e); return null }
  const INL = ['BR', 'EM', 'SPAN', 'B', 'STRONG', 'I']
  const isLeafText = el => {
    if (el.tagName === 'svg' || !el.childNodes.length) return false
    let has = false
    for (const c of el.childNodes) {
      if (c.nodeType === 3) { if (c.textContent.trim()) has = true }
      else if (c.nodeType === 1) {
        if (!INL.includes(c.tagName)) return false
        if (c.tagName !== 'BR') { const d = getComputedStyle(c).display; if (d !== 'inline') return false; if (c.querySelector('svg,div,img')) return false; if (c.textContent.trim()) has = true }
      }
    }
    return has
  }
  const runsOf = el => {
    const ws = getComputedStyle(el).whiteSpace, chars = []
    const st = n => { const cs = getComputedStyle(n); return { color: cs.color, weight: +cs.fontWeight, italic: cs.fontStyle === 'italic', family: cs.fontFamily, size: parseFloat(cs.fontSize) } }
    const walk = n => {
      if (n.nodeType === 3) { let t = n.textContent; t = ws.startsWith('pre') ? t.replace(/[ \t]+/g, ' ') : t.replace(/\s+/g, ' '); const s = st(n.parentElement); for (const ch of t) chars.push([ch, s]) }
      else if (n.tagName === 'BR') chars.push(['\n', st(el)])
      else n.childNodes.forEach(walk)
    }
    el.childNodes.forEach(walk)
    // trim spaces around newlines and at the ends
    const keep = chars.filter((c, i) => !(c[0] === ' ' && ((chars[i - 1] || ['\n'])[0] === '\n' || (chars[i + 1] || ['\n'])[0] === '\n' || (chars[i - 1] || [' '])[0] === ' ')))
    while (keep.length && /\s/.test(keep[0][0])) keep.shift()
    while (keep.length && /\s/.test(keep[keep.length - 1][0])) keep.pop()
    const segs = []
    for (const [ch, s] of keep) { const l = segs[segs.length - 1]; if (l && JSON.stringify(l.s) === JSON.stringify(s)) l.t += ch; else segs.push({ t: ch, s }) }
    return segs
  }
  const textItem = (el, cs, base) => {
    const rg = document.createRange(); rg.selectNodeContents(el)
    const rects = [...rg.getClientRects()].filter(r => r.width > 0)
    const tops = [...new Set(rects.map(r => Math.round(r.top / 4)))]
    const rb = rg.getBoundingClientRect(), segs = runsOf(el)
    const lh = cs.lineHeight === 'normal' ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.lineHeight)
    const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), er = el.getBoundingClientRect()
    const explicit = segs.map(s => s.t).join('').split('\n').filter(l => l.trim()).length
    return { type: 'text', z: base.z, tags: base.tags, parent: base.parent, segs, size: parseFloat(cs.fontSize), lh, ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing),
      align: cs.textAlign, auto: tops.length <= explicit, lines: tops.length,
      x: er.left - P.left + pl, width: el.clientWidth - pl - pr, rx: rb.left - P.left, rw: rb.width,
      y: rects.length ? rects[0].top - P.top - (lh - rects[0].height) / 2 : rb.top - P.top, opacity: +cs.opacity }
  }
  // buttons/pills: a rounded box whose only content is text -> becomes a hug auto-layout frame in Figma
  const isPill = el => { if (el.tagName === 'svg' || !isLeafText(el)) return false; const cs = getComputedStyle(el)
    return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(cs.borderTopLeftRadius) >= el.offsetHeight / 2 - 1 && parseFloat(cs.paddingLeft) > 0 }
  const pillOf = new Map(), rowOf = new Map()
  const anchorOf = el => { const p = el.parentElement, pc = getComputedStyle(p)
    if (pc.display.includes('flex') && pc.flexDirection.startsWith('column') && pc.alignItems === 'center') return 'center'
    if (!pc.display.includes('flex') && pc.textAlign === 'center') return 'center'
    return 'left' }
  const els = [...page.querySelectorAll('*')]
  for (const el of els) {
    if (el.closest('svg') && el.tagName !== 'svg') continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const g = geom(el), base = { z: zkey(el), tags: tags(el), parent: clipOf(el), ...g, rot: rot(cs), opacity: +cs.opacity, filter: cs.filter }
    const kids = [...el.children]
    if (cs.display.includes('flex') && cs.flexDirection === 'row' && kids.length > 1 && kids.every(isPill)) {
      const r = el.getBoundingClientRect(), tops = new Set(kids.map(k => Math.round(k.getBoundingClientRect().top)))
      const it = { type: 'row', id: ++nid, z: base.z, tags: base.tags, parent: base.parent, left: r.left - P.left, top: r.top - P.top, w: r.width, h: r.height,
        gap: parseFloat(cs.columnGap) || 0, rowGap: parseFloat(cs.rowGap) || 0, wrap: tops.size > 1, justify: cs.justifyContent }
      out.push(it); ids.set(el, it.id); rowOf.set(el, it.id)
    }
    if (isPill(el)) {
      const it = { type: 'pill', id: ++nid, ...base, bg: cs.backgroundColor, bi: cs.backgroundImage, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow,
        pad: [parseFloat(cs.paddingTop), parseFloat(cs.paddingRight), parseFloat(cs.paddingBottom), parseFloat(cs.paddingLeft)], anchor: anchorOf(el), inRow: rowOf.has(el.parentElement) }
      if (it.inRow) it.parent = rowOf.get(el.parentElement)
      out.push(it); pillOf.set(el, it)
      done.add(el); const ti = textItem(el, cs, base); it.text = ti
      continue
    }
    if (el.tagName === 'svg') {
      const it = { type: 'svg', snake: !!el.querySelector('textPath'), markup: el.outerHTML.replace(/ style="[^"]*"/, ''), ...base }
      if (it.snake) { it.glyphs = glyphsOf(el); it.vw = el.viewBox.baseVal ? el.viewBox.baseVal.width : 0 }
      out.push(it); continue
    }
    if (el.tagName === 'IMG' && !/\.svg$/i.test(el.getAttribute('src'))) {
      const n = await natSize(el.src), it = { type: 'box', id: ++nid, ...base, bg: 'rgba(0, 0, 0, 0)', bi: 'none', radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, border: null, clipPath: cs.clipPath, mask: cs.webkitMaskImage || cs.maskImage }
      const fit = cs.objectFit
      it.img = { url: el.getAttribute('src').split('/').pop(), path: rel(el.src), nw: n.w, nh: n.h, size: fit === 'cover' ? 'cover' : fit === 'contain' ? 'contain' : '100% 100%', pos: cs.objectPosition }
      out.push(it); continue }
    if (el.tagName === 'IMG') { out.push({ type: 'img', src: el.getAttribute('src'), ...base }); continue }
    const uni = ['Right', 'Bottom', 'Left'].every(k => cs['border' + k + 'Width'] === cs.borderTopWidth && cs['border' + k + 'Color'] === cs.borderTopColor)
    const bg = cs.backgroundColor, bi = cs.backgroundImage, bw = uni ? parseFloat(cs.borderTopWidth) : 0
    const hasBox = bg !== 'rgba(0, 0, 0, 0)' || bi !== 'none' || cs.boxShadow !== 'none' || bw > 0 || cs.clipPath !== 'none'
    const clips = cs.overflow === 'hidden' && el !== page
    if (hasBox || clips) {
      const it = { type: clips ? 'clip' : 'box', id: ++nid, ...base, bg, bi, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow,
        border: bw > 0 ? { w: bw, color: cs.borderTopColor } : null, clipPath: cs.clipPath, mask: cs.webkitMaskImage || cs.maskImage }
      const url = (bi.match(/url\("?([^")]+)"?\)/) || [])[1]
      if (url) { const n = await natSize(url); it.img = { url: url.split('/').slice(-1)[0], path: rel(url), nw: n.w, nh: n.h, size: cs.backgroundSize, pos: cs.backgroundPosition } }
      out.push(it); if (clips) ids.set(el, it.id)
    }
    // one-sided borders (row dividers): a thin box per side
    if (!el.closest('svg')) {
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map(k => [k, parseFloat(cs['border' + k + 'Width']), cs['border' + k + 'Color']])
      if (new Set(sides.map(x => x[1] + x[2])).size > 1) {
        const r = el.getBoundingClientRect(), L0 = r.left - P.left, T0 = r.top - P.top
        for (const [k, bw2, col] of sides) if (bw2 > 0 && col !== 'rgba(0, 0, 0, 0)') {
          const box = k === 'Top' ? [L0, T0, r.width, bw2] : k === 'Bottom' ? [L0, T0 + r.height - bw2, r.width, bw2] : k === 'Left' ? [L0, T0, bw2, r.height] : [L0 + r.width - bw2, T0, bw2, r.height]
          out.push({ type: 'box', id: ++nid, z: base.z, tags: base.tags, parent: base.parent, cx: box[0] + box[2] / 2, cy: box[1] + box[3] / 2, w: box[2], h: box[3], k: 1, rot: 0, opacity: +cs.opacity, filter: 'none',
            bg: col, bi: 'none', radius: '0px', shadow: 'none', border: null, clipPath: 'none', mask: 'none' })
        }
      }
    }
    if (!isLeafText(el) && /flex|grid/.test(cs.display) && el.tagName !== 'svg') {
      for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) {
        const rg = document.createRange(); rg.selectNodeContents(c); const rb = rg.getBoundingClientRect(); if (!rb.width) continue
        const lh = cs.lineHeight === 'normal' ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.lineHeight)
        out.push({ type: 'text', z: base.z, tags: base.tags, parent: base.parent, size: parseFloat(cs.fontSize), lh, ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing),
          segs: [{ t: c.textContent.trim().replace(/\s+/g, ' '), s: { color: cs.color, weight: +cs.fontWeight, italic: cs.fontStyle === 'italic', family: cs.fontFamily, size: parseFloat(cs.fontSize) } }],
          align: 'left', auto: true, lines: 1, x: rb.left - P.left, width: rb.width, rx: rb.left - P.left, rw: rb.width, y: rb.top - P.top - (lh - rb.height) / 2, opacity: +cs.opacity })
      }
    }
    if (![...done].some(d => d.contains(el)) && isLeafText(el)) {
      done.add(el)
      const ti = textItem(el, cs, base)
      if (pillOf.has(el)) pillOf.get(el).text = ti; else out.push(ti)
    }
  }
  const pre = document.createElement('pre'); pre.id = '__out'; pre.textContent = JSON.stringify({ W: P.width, H: P.height, items: out }); document.body.appendChild(pre)
} catch (e) { const pre = document.createElement('pre'); pre.id = '__out'; pre.textContent = 'ERR ' + e.stack; document.body.appendChild(pre) }
})()
