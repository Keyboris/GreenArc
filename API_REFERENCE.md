# Urban Canopy — API Reference

Base URL: `http://localhost:3001`

---

## GET /api/points

Returns the full heatmap point cloud in baseline state. Call once on page load.

**Response `200`**
```json
[
  { "lat": 51.512, "lng": -0.091, "temp": 28.4 },
  { "lat": 51.498, "lng": -0.073, "temp": 31.1 }
]
```

| Field | Type | Description |
|---|---|---|
| `lat` | number | Latitude |
| `lng` | number | Longitude |
| `temp` | number | Baseline temperature (°C) |

---

## POST /api/recalculate

Accepts one or more GeoJSON polygon features. Returns only the points that fall inside the union of those polygons, with updated temperatures, plus aggregated metrics.

Send all polygons drawn so far on every call — the backend processes them in sequence and returns the cumulative result.

**Request body**
```json
{
  "polygons": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-0.15, 51.49],
          [-0.08, 51.49],
          [-0.08, 51.52],
          [-0.15, 51.52],
          [-0.15, 51.49]
        ]]
      }
    }
  ]
}
```

> Coordinates must be in `[lng, lat]` order (GeoJSON standard).

**Response `200`**
```json
{
  "points": [
    { "lat": 51.512, "lng": -0.091, "temp": 27.1 }
  ],
  "metrics": {
    "avgTempBefore": 29.4,
    "avgTempAfter": 28.1,
    "tempDelta": -1.3,
    "totalTrees": 1240,
    "totalAreaM2": 62000,
    "totalCost": 620000,
    "annualBenefit": 47120,
    "paybackYears": 13,
    "polygonCount": 1,
    "boroughs": ["Southwark", "Hackney"]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `points` | array | Points inside the polygon union with updated `temp` values — re-render the heatmap from this array |
| `metrics.avgTempBefore` | number | Mean baseline temperature across affected points (°C) |
| `metrics.avgTempAfter` | number | Mean temperature after tree planting (°C) |
| `metrics.tempDelta` | number | Difference — always negative (°C) |
| `metrics.totalTrees` | number | Total trees planted across all zones |
| `metrics.totalAreaM2` | number | Total planting area (m²) |
| `metrics.totalCost` | number | Total planting cost (£) |
| `metrics.annualBenefit` | number | Annual energy + air quality benefit (£/year) |
| `metrics.paybackYears` | number | Cost ÷ annual benefit (years) |
| `metrics.polygonCount` | number | Number of polygons submitted |
| `metrics.boroughs` | string[] | Deduplicated London borough names covering the zones |

**Errors**

| Status | Body | Reason |
|---|---|---|
| `400` | `{ "error": "At least one polygon is required." }` | `polygons` missing, not an array, or empty |
| `400` | `{ "error": "Each polygon must be a GeoJSON Feature with Polygon geometry." }` | Invalid polygon in the array |

---

## POST /api/briefing

Accepts the `metrics` object returned by `/api/recalculate` and returns a Claude-generated urban planning briefing as a JSON response.

**Request body** — the `metrics` object from `/api/recalculate`:
```json
{
  "avgTempBefore": 29.4,
  "avgTempAfter": 28.1,
  "tempDelta": -1.3,
  "totalTrees": 1240,
  "totalAreaM2": 62000,
  "totalCost": 620000,
  "paybackYears": 13,
  "polygonCount": 1,
  "boroughs": ["Southwark", "Hackney"]
}
```

**Response `200`**
```json
{
  "briefing": "The proposed intervention would plant 1,240 trees across one zone in Southwark and Hackney..."
}
```

The briefing is plain prose — no markdown, no bullet points. Three short paragraphs covering environmental impact, financial case, and planting recommendations.

**Errors**

| Status | Body | Reason |
|---|---|---|
| `400` | `{ "error": "Missing required fields." }` | One or more metrics fields absent |
| `500` | `{ "error": "Briefing generation failed. Please try again." }` | Claude API error |
