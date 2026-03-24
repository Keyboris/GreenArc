// One-time script: converts london_grid.json → heatmap_points.json
// Run: node generate_heatmap.js
const fs = require('fs')
const path = require('path')

const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/london_grid.json'), 'utf8'))

const out = src.map(p => ({
  lat: p.lat,
  lng: p.lon,
  temp: p.base_temperature
}))

fs.writeFileSync(path.join(__dirname, 'data/heatmap_points.json'), JSON.stringify(out))
console.log(`Written ${out.length} points to data/heatmap_points.json`)
