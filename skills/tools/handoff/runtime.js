// __TITLE__: part __N__ of __OF__.
// In Scripter: New script, Ctrl+A, paste, run. Pasting into an existing script gives errors that are not in this code.
// The images are inside this script; nothing needs dragging in.
// Safe to re-run: it replaces its own group in the frame and leaves everything else alone.

const PART = __PART__
const D = __DATA__
const SVGS = __SVGS__
const IMGS = __IMGS__
const log = []
var step = 'setup'

async function main() {
  const host = figma.currentPage
  step = 'images'
  const HASH = {}
  for (const [k, b64] of Object.entries(IMGS)) HASH[k] = figma.createImage(figma.base64Decode(b64)).hash

  // ---------- fonts: the CSS stack in order, mapped names first, then Inter
  const avail = await figma.listAvailableFontsAsync()
  const WEIGHT = { 100: ['Thin', 'Hairline'], 200: ['ExtraLight', 'Extra Light', 'UltraLight'], 300: ['Light'], 400: ['Regular', 'Roman', 'Book', 'Normal'],
    500: ['Medium'], 600: ['SemiBold', 'Semi Bold', 'Semibold', 'DemiBold', 'Demi Bold'], 700: ['Bold'], 800: ['ExtraBold', 'Extra Bold', 'Heavy'], 900: ['Black', 'Heavy'] }
  const norm = x => x.toLowerCase().split(' ').join('')
  const cache = {}, used = new Set()
  async function font([families, weight, italic]) {
    const key = families.join('|') + weight + italic
    if (cache[key]) return cache[key]
    const list = families.map(f => PART.fontMap[f] || f).concat(['Inter'])
    const order = [weight, ...[100, 200, 300, 400, 500, 600, 700, 800, 900].sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))]
    for (const fam of list) {
      const styles = avail.filter(a => norm(a.fontName.family) === norm(fam)).map(a => a.fontName)
      if (!styles.length) continue
      for (const w of order) for (const st of WEIGHT[w] || []) {
        const hit = (italic && styles.find(s => norm(s.style) === norm(st + ' Italic'))) || styles.find(s => norm(s.style) === norm(st))
        if (hit) {
          await figma.loadFontAsync(hit); used.add(hit.family + ' ' + hit.style)
          if (fam === 'Inter' && families[0] !== 'Inter') log.push(`Font: ${families[0]} ${weight} not in Figma, used Inter ${hit.style}`)
          return cache[key] = hit
        }
      }
    }
    const fb = { family: 'Inter', style: 'Regular' }; await figma.loadFontAsync(fb); return cache[key] = fb
  }

  // ---------- builders
  const place = (n, it, ox, oy) => {
    const t = (it.rot || 0) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t)
    const px = it.cx - ox, py = it.cy - oy
    n.relativeTransform = [[c, -s, px - (c * it.w / 2 - s * it.h / 2)], [s, c, py - (s * it.w / 2 + c * it.h / 2)]]
  }
  const paint = p => {
    if (p.type !== 'IMAGE') return p
    const h = HASH[p.src]
    return h ? { type: 'IMAGE', scaleMode: 'CROP', imageHash: h, imageTransform: p.imageTransform } : { type: 'SOLID', color: { r: .85, g: .87, b: .9 } }
  }
  function shape(it) {
    const n = it.k === 'clip' ? figma.createFrame() : it.ellipse ? figma.createEllipse() : figma.createRectangle()
    n.resize(Math.max(it.w, .01), Math.max(it.h, .01))
    n.fills = it.fills.map(paint)
    if (!it.ellipse) n.cornerRadius = Math.min(it.radius, Math.min(it.w, it.h) / 2)
    if (it.border) { n.strokes = [it.border.paint]; n.strokeWeight = it.border.w; n.strokeAlign = 'INSIDE' }
    if (it.k === 'clip') n.clipsContent = true
    return n
  }
  function withMasks(it, content) {
    const F = figma.createFrame(); F.fills = []; F.clipsContent = false; F.resize(it.w, it.h)
    F.appendChild(content); content.x = 0; content.y = 0
    let cur = content
    for (const m of it.masks) {
      let mk
      if (m.poly) { mk = figma.createVector(); mk.vectorPaths = [{ windingRule: 'NONZERO', data: m.poly }]; mk.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] }
      else { mk = figma.createRectangle(); mk.resize(it.w, it.h); mk.fills = [m.paint] }
      F.insertChild(0, mk); mk.x = 0; mk.y = 0; mk.isMask = true
      cur = figma.group([mk, cur], F)
    }
    cur.effects = it.fx
    return F
  }
  async function text(it, parent, ox, oy) {
    const t = figma.createText(); parent.appendChild(t)
    const full = it.segs.map(s => s.t).join('')
    t.fontName = await font(it.segs[0].f)
    t.characters = full
    let i = 0
    for (const s of it.segs) {
      const j = i + s.t.length
      if (j > i) { t.setRangeFontName(i, j, await font(s.f)); t.setRangeFontSize(i, j, s.size); t.setRangeFills(i, j, [s.fill]) }
      i = j
    }
    t.lineHeight = { value: it.lh, unit: 'PIXELS' }
    t.letterSpacing = { value: it.ls, unit: 'PIXELS' }
    const al = it.align === 'center' ? 'CENTER' : it.align === 'right' || it.align === 'end' ? 'RIGHT' : 'LEFT'
    t.textAlignHorizontal = al
    if (it.auto) {
      t.textAutoResize = 'WIDTH_AND_HEIGHT'
      t.x = (al === 'CENTER' ? it.rx + it.rw / 2 - t.width / 2 : al === 'RIGHT' ? it.rx + it.rw - t.width : it.rx) - ox
    } else {
      t.textAutoResize = 'HEIGHT'; t.resize(Math.max(it.width, 1), t.height); t.x = it.x - ox
    }
    t.y = it.y - oy
    if (it.op < 1) t.opacity = it.op
    t.name = full.split('\n')[0].slice(0, 40)
    return t
  }

  async function item(it, parent, ox, oy, kids) {
    step = `${it.k} #${it.i} ${it.k === 'text' ? JSON.stringify(it.segs[0].t.slice(0, 30)) : ''}`
    let n
    if (it.k === 'text') return text(it, parent, ox, oy)
    if (it.k === 'row') {
      // a row of buttons: auto layout, so the spacing holds whatever the font
      n = figma.createFrame(); parent.appendChild(n); n.name = 'Buttons'; n.fills = []; n.clipsContent = false
      n.layoutMode = 'HORIZONTAL'; n.itemSpacing = it.gap; n.counterAxisAlignItems = 'CENTER'
      if (it.wrap) { n.layoutWrap = 'WRAP'; n.counterAxisSpacing = it.rowGap; n.resize(it.w, it.h); n.primaryAxisSizingMode = 'FIXED'; n.counterAxisSizingMode = 'AUTO' }
      else { n.primaryAxisSizingMode = 'AUTO'; n.counterAxisSizingMode = 'AUTO' }
      n.primaryAxisAlignItems = it.justify === 'center' ? 'CENTER' : 'MIN'
      await build(kids, it.id, n, 0, 0)
      const centred = it.justify === 'center' && !it.wrap
      n.x = (centred ? it.left + it.w / 2 - n.width / 2 : it.left) - ox; n.y = it.top + it.h / 2 - n.height / 2 - oy
      return n
    }
    if (it.k === 'pill') {
      // a button: hug-width auto layout with the CSS padding. Sizing modes are set AFTER resize(), which turns hug into fixed.
      n = figma.createFrame(); parent.appendChild(n); n.clipsContent = false
      n.layoutMode = 'HORIZONTAL'; n.primaryAxisAlignItems = 'CENTER'; n.counterAxisAlignItems = 'CENTER'
      n.paddingTop = it.pad[0]; n.paddingRight = it.pad[1]; n.paddingBottom = it.pad[2]; n.paddingLeft = it.pad[3]
      n.fills = it.fills.map(paint); n.cornerRadius = it.radius; n.effects = it.fx
      const t = await text(Object.assign({}, it.text, { auto: true }), n, 0, 0)
      t.textAlignHorizontal = 'CENTER'
      n.resize(Math.max(it.w, 1), Math.max(it.h, 1)); n.primaryAxisSizingMode = 'AUTO'; n.counterAxisSizingMode = 'FIXED'
      if (it.pad[0] + it.pad[2] > 0) n.counterAxisSizingMode = 'AUTO'
      n.name = 'Button — ' + t.characters.split('\n')[0].slice(0, 30)
      if (it.op < 1) n.opacity = it.op
      if (!(parent.layoutMode && parent.layoutMode !== 'NONE')) {
        n.x = (it.anchor === 'center' ? it.cx - n.width / 2 : it.cx - it.w / 2) - ox; n.y = it.cy - n.height / 2 - oy
      }
      return n
    }
    if (it.k === 'ribbon') {
      // text on a path: the band as vectors, the words as one text layer per letter
      const g = figma.createNodeFromSvg(it.svg); parent.appendChild(g); g.name = 'Band'; g.clipsContent = false
      if (Math.abs(g.width - it.w) > 1) g.rescale(it.w / g.width)
      g.x = it.cx - it.w / 2 - ox; g.y = it.cy - it.h / 2 - oy
      const parts = [g]
      for (const run of it.runs) {
        const fn = await font(run.f), glyphs = []
        for (const [ch, x, y, ang] of run.chars) {
          const t = figma.createText(); parent.appendChild(t)
          t.fontName = fn; t.fontSize = run.size; t.characters = ch; t.fills = [run.fill]
          t.textAutoResize = 'WIDTH_AND_HEIGHT'
          place(t, { cx: x, cy: y, w: t.width, h: t.height, rot: ang }, ox, oy)
          glyphs.push(t)
        }
        if (glyphs.length) { const gt = figma.group(glyphs, parent); gt.name = 'Text — ' + run.label; parts.push(gt) }
      }
      const all = figma.group(parts, parent); all.name = 'Text on a path'
      return all
    }
    if (it.k === 'svgimg') {
      // an SVG used as a CSS background, fitted the way CSS fits it
      n = figma.createNodeFromSvg(SVGS[it.svg]); parent.appendChild(n); n.name = it.name; n.clipsContent = false
      n.rescale(it.dw / n.width)
      n.x = it.dx - ox; n.y = it.dy - oy
      if (it.op < 1) n.opacity = it.op
      return n
    }
    if (it.k === 'svg') { n = figma.createNodeFromSvg(it.svg); parent.appendChild(n); n.name = 'Vector'; n.clipsContent = false }
    else if (it.k === 'img') { n = figma.createNodeFromSvg(SVGS[it.svgfile]); parent.appendChild(n); n.name = it.svgfile.replace('.svg', ''); n.clipsContent = false }
    if (n && it.dash) {
      // dotted or dashed strokes: set again after import, which can drop them
      const d = it.dash
      for (const v of n.findAll(x => x.type === 'VECTOR' && x.strokes && x.strokes.length)) {
        v.strokes = [{ type: 'SOLID', color: { r: d.rgb[0], g: d.rgb[1], b: d.rgb[2] }, opacity: d.op }]
        v.strokeWeight = d.w; v.dashPattern = d.pattern; v.strokeCap = d.cap
      }
      n.name = 'Dotted lines'
    }
    if (n) {
      if (Math.abs(n.width - it.w) > 1) n.rescale(it.w / n.width)
      place(n, Object.assign({}, it, { h: n.height }), ox, oy)
      if (it.op < 1) n.opacity = it.op
      if (it.fx.length) n.effects = it.fx
      return n
    }
    const s = shape(it)
    const img = it.fills.find(f => f.type === 'IMAGE')
    if (it.masks && it.masks.length) { n = withMasks(it, s); n.name = img ? 'Photo' : 'Shape' }
    else { n = s; n.effects = it.fx; n.name = it.k === 'clip' ? 'Section' : img ? 'Photo — ' + img.src.split('/').pop() : 'Shape' }
    parent.appendChild(n)
    place(n, it, ox, oy)
    if (it.op < 1) n.opacity = it.op
    if (it.k === 'clip') await build(kids, it.id, n, it.cx - it.w / 2, it.cy - it.h / 2)
    return n
  }
  async function build(list, pid, parent, ox, oy) {
    const mine = list.filter(i => (i.parent == null ? null : i.parent) === pid).sort((a, b) => a.z - b.z || a.i - b.i)
    for (const it of mine) await item(it, parent, ox, oy, list)
  }

  step = 'frame'
  let F = host.children.find(n => n.name === PART.frame)
  if (!F) {
    // a new frame goes to the right of everything on the page, top-aligned with it
    const others = host.children.filter(n => 'width' in n)
    F = figma.createFrame(); host.appendChild(F)
    F.name = PART.frame; F.resize(D.W, D.H); F.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; F.clipsContent = true
    F.x = others.length ? Math.max(...others.map(n => n.x + n.width)) + 400 : 0
    F.y = others.length ? Math.min(...others.map(n => n.y)) : 0
  }
  if (Math.abs(F.height - D.H) > 1 || Math.abs(F.width - D.W) > 1) F.resize(D.W, D.H)
  for (const n of [...F.children]) if (n.name === PART.name) n.remove()
  const before = new Set(F.children.map(n => n.id))
  await build(D.items, null, F, 0, 0)
  const made = F.children.filter(n => !before.has(n.id))
  if (made.length) { const g = figma.group(made, F); g.name = PART.name }
  figma.viewport.scrollAndZoomIntoView([F])
  print(`Fonts: ${[...used].join(', ')}\n${PART.frame} — ${PART.name}: ${made.length} layers.` + (log.length ? '\n' + [...new Set(log)].join('\n') : '') + (PART.next ? `\nNext: ${PART.next}` : '\nThis frame is done.'))
}
try { await main() } catch (e) { print(`ERROR while building ${step}:\n${e && e.message}\n\nBefore the error:\n${log.join('\n')}`) }
