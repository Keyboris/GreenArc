const { Router } = require('express')
const { processPolygons } = require('../services/heatmap')
const { computeMetrics }  = require('../services/metrics')
const { getBoroughs }     = require('../services/borough')

module.exports = function recalculateRouter(points) {
  const router = Router()

  router.post('/', async (req, res) => {
    const { polygons } = req.body

    if (!polygons || !Array.isArray(polygons) || polygons.length === 0) {
      return res.status(400).json({ error: 'At least one polygon is required.' })
    }

    for (const feature of polygons) {
      if (
        !feature ||
        feature.type !== 'Feature' ||
        !feature.geometry ||
        feature.geometry.type !== 'Polygon'
      ) {
        return res.status(400).json({ error: 'Each polygon must be a GeoJSON Feature with Polygon geometry.' })
      }
    }

    const affectedPoints = processPolygons(points, polygons)
    const metrics = computeMetrics(affectedPoints, polygons)
    const boroughs = await getBoroughs(polygons)

    res.json({
      points: affectedPoints.map(p => ({ lat: p.lat, lng: p.lng, temp: p.currentTemp })),
      metrics: { ...metrics, boroughs },
    })
  })

  return router
}
