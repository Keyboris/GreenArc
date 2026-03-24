require('dotenv').config()
const fs      = require('fs')
const path    = require('path')
const express = require('express')
const cors    = require('cors')

const pointsRouter      = require('./routes/points')
const recalculateRouter = require('./routes/recalculate')
const briefingRouter    = require('./routes/briefing')

// Load point cloud once at startup
const points = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/heatmap_points.json'), 'utf8'))
  .map(p => ({ ...p, baseTemp: p.temp, currentTemp: p.temp }))

console.log(`Loaded ${points.length} heatmap points`)

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/points',      pointsRouter(points))
app.use('/api/recalculate', recalculateRouter(points))
app.use('/api/briefing',    briefingRouter())

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Urban Canopy backend running on port ${PORT}`))
