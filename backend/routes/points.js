const { Router } = require('express')
const { isWithinCentralLondon } = require('../services/geo-bounds')

module.exports = function pointsRouter(points) {
  const router = Router()

  router.get('/', (req, res) => {
    res.json(
      points
        .filter(p => isWithinCentralLondon(p.lat, p.lng))
        .map(p => ({ lat: p.lat, lng: p.lng, temp: p.baseTemp }))
    )
  })

  return router
}
