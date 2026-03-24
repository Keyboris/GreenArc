import L from 'leaflet';
import type { HeatPoint } from '../types/app-types';

const FALLBACK_MIN_TEMP = 22;
const FALLBACK_MAX_TEMP = 35;
const MIN_DYNAMIC_RANGE = 2.0;

type HeatNormalizer = (temp: number) => number;

const createHeatNormalizer = (points: HeatPoint[]): HeatNormalizer => {
  const temps = points
    .map((point) => point.currentTemp)
    .filter((temp) => Number.isFinite(temp));

  if (temps.length < 2) {
    return (temp: number): number => {
      const raw = (temp - FALLBACK_MIN_TEMP) / (FALLBACK_MAX_TEMP - FALLBACK_MIN_TEMP);
      const clamped = Math.max(0, Math.min(1, raw));
      const contrasted = Math.pow(clamped, 1.1);
      return 0.05 + contrasted * 0.9;
    };
  }

  let minTemp = Math.min(...temps);
  let maxTemp = Math.max(...temps);

  // Prevent near-flat datasets from collapsing into one color bucket.
  if (maxTemp - minTemp < MIN_DYNAMIC_RANGE) {
    const midpoint = (maxTemp + minTemp) / 2;
    minTemp = midpoint - MIN_DYNAMIC_RANGE / 2;
    maxTemp = midpoint + MIN_DYNAMIC_RANGE / 2;
  }

  return (temp: number): number => {
    const raw = (temp - minTemp) / (maxTemp - minTemp);
    const clamped = Math.max(0, Math.min(1, raw));
    // Increase visual strength as temperature rises.
    const contrasted = Math.pow(clamped, 1.25);
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
    minOpacity: 0.2,
    gradient: {
      0.05: '#fff7bf',
      0.25: '#ffe066',
      0.45: '#ffb347',
      0.65: '#ff8c42',
      0.82: '#ff5a36',
      1.0: '#e11d1d',
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
