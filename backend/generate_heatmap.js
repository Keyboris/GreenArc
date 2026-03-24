const fs = require('fs')
const path = require('path')

const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/london_grid.json'), 'utf8'))

// Define a maximum random offset (approx 100-200 meters)
const JITTER_DEG = 0.0025; 

const out = src.map(p => ({
  // Add a random float between -JITTER_DEG/2 and +JITTER_DEG/2
  lat: parseFloat((p.lat + (Math.random() - 0.5) * JITTER_DEG).toFixed(5)),
  lng: parseFloat((p.lon + (Math.random() - 0.5) * JITTER_DEG).toFixed(5)),
  temp: p.base_temperature
}))

fs.writeFileSync(path.join(__dirname, 'data/heatmap_points.json'), JSON.stringify(out))
console.log(`Written ${out.length} jittered points to data/heatmap_points.json`)