import { MOCK_POINTS } from '../data/mock-points';
import type { BackendBridge } from '../types/backend-bridge';
import type { HeatPoint } from '../types/app-types';

export interface PointsProvider {
  loadPoints: () => Promise<HeatPoint[]>;
}

const clonePoints = (points: HeatPoint[]): HeatPoint[] => points.map((point) => ({ ...point }));

type RawPoint = {
  lat?: number;
  lng?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  temp?: number;
  temperature?: number;
  baseTemp?: number;
  currentTemp?: number;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const resolvePointsPayload = (payload: unknown): HeatPoint[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid points payload: expected array');
  }

  const points = payload
    .map((item): HeatPoint | null => {
      const raw = (item ?? {}) as RawPoint;
      const lat = toNumber(raw.lat ?? raw.latitude);
      const lng = toNumber(raw.lng ?? raw.lon ?? raw.longitude);
      const temp = toNumber(raw.temp ?? raw.temperature ?? raw.baseTemp ?? raw.currentTemp);

      if (lat === null || lng === null || temp === null) {
        return null;
      }

      return {
        lat,
        lng,
        baseTemp: temp,
        currentTemp: temp,
      };
    })
    .filter((point): point is HeatPoint => point !== null);

  if (!points.length) {
    throw new Error('No valid points found in /api/points response');
  }

  return points;
};

export class MockPointsProvider implements PointsProvider {
  async loadPoints(): Promise<HeatPoint[]> {
    return clonePoints(MOCK_POINTS);
  }
}

export class HttpPointsProvider implements PointsProvider {
  constructor(private readonly baseUrl: string) {}

  async loadPoints(): Promise<HeatPoint[]> {
    const response = await fetch(`${this.baseUrl}/api/points`);
    if (!response.ok) {
      throw new Error(`Failed to load points: ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return resolvePointsPayload(payload);
  }
}

export class BridgePointsProvider implements PointsProvider {
  constructor(private readonly bridge: BackendBridge) {}

  async loadPoints(): Promise<HeatPoint[]> {
    const response = await this.bridge.request({ path: '/api/points', method: 'GET' });

    if (!response.ok) {
      throw new Error(`Failed to load points: ${response.status}`);
    }

    const payload = JSON.parse(response.body) as unknown;
    return resolvePointsPayload(payload);
  }
}
