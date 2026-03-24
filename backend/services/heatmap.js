const turf = require('@turf/turf')

const TREES_PER_M2     = 1 / 50
const COOLING_PER_TREE = 0.003
const MIN_TEMP         = 22
const MAX_COOLING      = 6    // °C — hard cap per polygon (diminishing returns)

/**
 * Annotates each polygon with treeCount, areaM2, and cooling,
 * resets all point currentTemps, then applies point-in-polygon cooling.
 * Mutates points in place and returns them.
 *
 * @param {Array} points - in-memory point cloud with baseTemp/currentTemp
 * @param {Array} polygons - GeoJSON Feature[] with Polygon geometry
 * @returns {Array} updated points
 */
function processPolygons(points, polygons) {
  // Annotate polygons with computed values
  for (const polygon of polygons) {
    const areaM2 = turf.area(polygon)
    const treeCount = Math.floor(areaM2 * TREES_PER_M2)
    const linearCooling = treeCount * COOLING_PER_TREE
    // Logarithmic diminishing returns: cooling grows fast at first, then flattens
    // log1p(x) / log1p(scale) maps [0, scale] → [0, 1], then multiply by MAX_COOLING
    const scale = MAX_COOLING / COOLING_PER_TREE  // ~2000 trees for full effect
    const cooling = MAX_COOLING * (Math.log1p(linearCooling / COOLING_PER_TREE) / Math.log1p(scale))
    polygon.properties = polygon.properties || {}
    polygon.properties.areaM2 = areaM2
    polygon.properties.treeCount = treeCount
    polygon.properties.cooling = cooling
  }

  // Reset all temps to baseline
  for (const point of points) {
    point.currentTemp = point.baseTemp
  }

  // Apply cooling and track which points fall inside any polygon
  const affected = []
  for (const point of points) {
    for (const polygon of polygons) {
      const turfPoint = turf.point([point.lng, point.lat])
      if (turf.booleanPointInPolygon(turfPoint, polygon)) {
        point.currentTemp = parseFloat(
          Math.max(MIN_TEMP, point.baseTemp - polygon.properties.cooling).toFixed(2)
        )
        affected.push(point)
        break
      }
    }
  }

  return affected
}

module.exports = { processPolygons }
