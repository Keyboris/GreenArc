const COST_PER_TREE           = 500
const ANNUAL_BENEFIT_PER_TREE = 38

/**
 * Aggregates environmental and financial metrics from the updated point cloud
 * and annotated polygons.
 *
 * @param {Array} points - point cloud after processPolygons (has baseTemp + currentTemp)
 * @param {Array} polygons - annotated with properties.treeCount and properties.areaM2
 * @returns {Object} metrics object matching the interface contract
 */
function computeMetrics(points, polygons) {
  const totalTrees  = polygons.reduce((sum, p) => sum + p.properties.treeCount, 0)
  const totalAreaM2 = polygons.reduce((sum, p) => sum + p.properties.areaM2, 0)
  const totalCost   = totalTrees * COST_PER_TREE
  const annualBenefit = totalTrees * ANNUAL_BENEFIT_PER_TREE
  const paybackYears  = annualBenefit > 0 ? Math.round(totalCost / annualBenefit) : 0

  const avgTempBefore = points.length > 0
    ? points.reduce((sum, p) => sum + p.baseTemp, 0) / points.length
    : 0
  const avgTempAfter = points.length > 0
    ? points.reduce((sum, p) => sum + p.currentTemp, 0) / points.length
    : 0
  const tempDelta = parseFloat((avgTempAfter - avgTempBefore).toFixed(2))

  return {
    avgTempBefore: parseFloat(avgTempBefore.toFixed(2)),
    avgTempAfter:  parseFloat(avgTempAfter.toFixed(2)),
    tempDelta,
    totalTrees,
    totalAreaM2,
    totalCost,
    annualBenefit,
    paybackYears,
    polygonCount: polygons.length,
  }
}

module.exports = { computeMetrics }
