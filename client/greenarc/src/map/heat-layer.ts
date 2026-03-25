import L from 'leaflet';
import type { HeatPoint } from '../types/app-types';

const FALLBACK_MIN_TEMP = 22;
const FALLBACK_MAX_TEMP = 35;
const MIN_DYNAMIC_RANGE = 2.0;
const NORMALIZATION_LOW_PERCENTILE = 0.1;
const NORMALIZATION_HIGH_PERCENTILE = 0.95;

type HeatNormalizer = (temp: number) => number;

const getPercentile = (sortedValues: number[], percentile: number): number => {
  if (!sortedValues.length) {
    return 0;
  }

  const bounded = Math.max(0, Math.min(1, percentile));
  const position = bounded * (sortedValues.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
};

const createHeatNormalizer = (points: HeatPoint[]): HeatNormalizer => {
  const temps = points
    .map((point) => point.currentTemp)
    .filter((temp) => Number.isFinite(temp))
    .sort((a, b) => a - b);

  if (temps.length < 2) {
    return (temp: number): number => {
      const raw = (temp - FALLBACK_MIN_TEMP) / (FALLBACK_MAX_TEMP - FALLBACK_MIN_TEMP);
      const clamped = Math.max(0, Math.min(1, raw));
      const contrasted = Math.pow(clamped, 1.1);
      return 0.05 + contrasted * 0.9;
    };
  }

  let minTemp = getPercentile(temps, NORMALIZATION_LOW_PERCENTILE);
  let maxTemp = getPercentile(temps, NORMALIZATION_HIGH_PERCENTILE);

  // Prevent near-flat datasets from collapsing into one color bucket.
  if (maxTemp - minTemp < MIN_DYNAMIC_RANGE) {
    const midpoint = (maxTemp + minTemp) / 2;
    minTemp = midpoint - MIN_DYNAMIC_RANGE / 2;
    maxTemp = midpoint + MIN_DYNAMIC_RANGE / 2;
  }

  return (temp: number): number => {
    const raw = (temp - minTemp) / (maxTemp - minTemp);
    const clamped = Math.max(0, Math.min(1, raw));
    // Keep high-end reds for true hotspots instead of most points.
    const contrasted = Math.pow(clamped, 1.2);
    return 0.05 + contrasted * 0.95;
  };
};

const toHeatTuple = (point: HeatPoint, normalizeHeat: HeatNormalizer): [number, number, number] => [
  point.lat,
  point.lng,
  normalizeHeat(point.currentTemp),
];

export const createHeatLayer = (map: L.Map, points: HeatPoint[]): L.Layer => {
  const heatLayerFactory = (L as unknown as {
    heatLayer: (
      latlngs: [number, number, number][],
      options: {
        radius: number;
        blur: number;
        minOpacity: number;
        gradient: Record<number, string>;
      },
    ) => L.Layer;
  }).heatLayer;

  if (typeof heatLayerFactory !== 'function') {
    return L.layerGroup().addTo(map);
  }

  const normalizeHeat = createHeatNormalizer(points);

  return heatLayerFactory(points.map((point) => toHeatTuple(point, normalizeHeat)), {
    radius: 22,
    blur: 26,
    minOpacity: 0.08,
    gradient: {
      0.05: 'rgba(255,255,255,0.08)',
      0.3: 'rgba(255,255,255,0.25)',
      0.6: 'rgba(255,255,255,0.55)',
      1.0: 'rgba(255,255,255,0.95)',
    },
  }).addTo(map);
};

export const updateHeatLayer = (heatLayer: L.Layer, points: HeatPoint[]): void => {
  const layer = heatLayer as unknown as { setLatLngs: (latlngs: [number, number, number][]) => void };
  if (typeof layer.setLatLngs === 'function') {
    const normalizeHeat = createHeatNormalizer(points);
    layer.setLatLngs(points.map((point) => toHeatTuple(point, normalizeHeat)));
  }
};
