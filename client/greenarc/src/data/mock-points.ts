import type { HeatPoint } from '../types/app-types';

const MIN_LAT = 51.45;
const MAX_LAT = 51.57;
const MIN_LNG = -0.25;
const MAX_LNG = 0.05;

const LAT_STEP = 0.008;
const LNG_STEP = 0.015;

const LONDON_CORE_LAT = 51.5074;
const LONDON_CORE_LNG = -0.1278;

const MIN_TEMP = 22;
const MAX_TEMP = 35;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getTempAtPoint = (lat: number, lng: number): number => {
  const distLat = Math.abs(lat - LONDON_CORE_LAT);
  const distLng = Math.abs(lng - LONDON_CORE_LNG);
  const urbanHeat = 7 - (distLat * 20 + distLng * 7);
  const localVariance =
    Math.sin(lat * 55) * 1.2 +
    Math.cos(lng * 45) * 0.9 +
    Math.sin((lat + lng) * 20) * 0.6;

  const temp = 27 + urbanHeat + localVariance;
  return Number(clamp(temp, MIN_TEMP, MAX_TEMP).toFixed(2));
};

const buildMockPoints = (): HeatPoint[] => {
  const points: HeatPoint[] = [];

  for (let lat = MIN_LAT; lat <= MAX_LAT; lat += LAT_STEP) {
    for (let lng = MIN_LNG; lng <= MAX_LNG; lng += LNG_STEP) {
      const roundedLat = Number(lat.toFixed(5));
      const roundedLng = Number(lng.toFixed(5));
      const baseTemp = getTempAtPoint(roundedLat, roundedLng);
      points.push({
        lat: roundedLat,
        lng: roundedLng,
        baseTemp,
        currentTemp: baseTemp,
      });
    }
  }

  return points;
};

export const MOCK_POINTS: HeatPoint[] = buildMockPoints();
