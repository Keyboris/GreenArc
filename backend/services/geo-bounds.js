const CENTRAL_LONDON_MIN_LAT = 51.45
const CENTRAL_LONDON_MAX_LAT = 51.57
const CENTRAL_LONDON_MIN_LNG = -0.25
const CENTRAL_LONDON_MAX_LNG = 0.05

function isWithinCentralLondon(lat, lng) {
  return (
    lat >= CENTRAL_LONDON_MIN_LAT &&
    lat <= CENTRAL_LONDON_MAX_LAT &&
    lng >= CENTRAL_LONDON_MIN_LNG &&
    lng <= CENTRAL_LONDON_MAX_LNG
  )
}

module.exports = {
  CENTRAL_LONDON_MIN_LAT,
  CENTRAL_LONDON_MAX_LAT,
  CENTRAL_LONDON_MIN_LNG,
  CENTRAL_LONDON_MAX_LNG,
  isWithinCentralLondon,
}
