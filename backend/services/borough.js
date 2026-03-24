const turf = require('@turf/turf')

async function getBoroughName(polygon) {
  try {
    const centroid = turf.centroid(polygon)
    const [lng, lat] = centroid.geometry.coordinates
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    const res = await fetch(url, { headers: { 'User-Agent': 'UrbanCanopy/1.0' } })
    const data = await res.json()
    return data.address?.borough
        || data.address?.suburb
        || data.address?.city_district
        || 'Central London'
  } catch {
    return 'London'
  }
}

/**
 * Reverse-geocodes each polygon centroid in parallel and returns
 * a deduplicated array of borough names.
 *
 * @param {Array} polygons - GeoJSON Feature[] with Polygon geometry
 * @returns {Promise<string[]>} unique borough names
 */
async function getBoroughs(polygons) {
  const names = await Promise.all(polygons.map(getBoroughName))
  return [...new Set(names)]
}

module.exports = { getBoroughs }
