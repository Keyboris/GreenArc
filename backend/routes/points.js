const { Router } = require('express')

module.exports = function pointsRouter(points) {
  const router = Router()

  router.get('/', (req, res) => {
    res.json(points.map(p => ({ lat: p.lat, lng: p.lng, temp: p.baseTemp })))
  })

  return router
}
