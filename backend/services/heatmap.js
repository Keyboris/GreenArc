const turf = require('@turf/turf')

const TREES_PER_M2    = 1 / 50
const COOLING_PER_TREE = 0.003
const MIN_TEMP         = 22

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
    const cooling = treeCount * COOLING_PER_TREE
    polygon.properties = polygon.properties || {}
    polygon.properties.areaM2 = areaM2
    polygon.properties.treeCount = treeCount
    polygon.properties.cooling = cooling
  }

  // Reset all temps to baseline
  for (const point of points) {
    point.currentTemp = point.baseTemp
  }

  // Apply cooling — each point belongs to at most one polygon
  for (const point of points) {
    for (const polygon of polygons) {
      const turfPoint = turf.point([point.lng, point.lat])
      if (turf.booleanPointInPolygon(turfPoint, polygon)) {
        point.currentTemp = parseFloat(
          Math.max(MIN_TEMP, point.baseTemp - polygon.properties.cooling).toFixed(2)
        )
        break
      }
    }
  }

  return points
}

module.exports = { processPolygons }
