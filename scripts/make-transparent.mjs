// Knock out a near-uniform light background to transparent.
// Samples the corner color, makes pixels close to it transparent (with a
// feathered edge), and writes public/logo.png + app/icon.png.
// Usage: node scripts/make-transparent.mjs "<input.png>"
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'

// Input resolved relative to the project dir (cwd); outputs relative to script.
const input = process.argv[2] ?? '../PartBank Resource/Logo Light.png'
const png = PNG.sync.read(readFileSync(resolve(process.cwd(), input)))
const { width, height, data } = png

// Background reference = average of the four corners.
function px(x, y) {
  const i = (y * width + x) * 4
  return [data[i], data[i + 1], data[i + 2]]
}
const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)]
const bg = [0, 1, 2].map((c) => Math.round(corners.reduce((s, p) => s + p[c], 0) / corners.length))

const LOW = 32 // <= LOW from bg  -> fully transparent
const HIGH = 80 // >= HIGH from bg -> fully opaque (part of the logo)

let cleared = 0
for (let i = 0; i < data.length; i += 4) {
  const dr = data[i] - bg[0]
  const dg = data[i + 1] - bg[1]
  const db = data[i + 2] - bg[2]
  const dist = Math.sqrt(dr * dr + dg * dg + db * db)
  if (dist <= LOW) {
    data[i + 3] = 0
    cleared++
  } else if (dist < HIGH) {
    // feather the anti-aliased edge
    data[i + 3] = Math.round(((dist - LOW) / (HIGH - LOW)) * 255)
  }
}

const out = PNG.sync.write(png)
writeFileSync(new URL('../public/logo.png', import.meta.url), out)
writeFileSync(new URL('../app/icon.png', import.meta.url), out)
console.log(`bg sampled ≈ rgb(${bg.join(',')}) — cleared ${cleared}/${width * height} px`)
console.log('wrote public/logo.png + app/icon.png (transparent)')
