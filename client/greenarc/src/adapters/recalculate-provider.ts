import type { BackendBridge } from '../types/backend-bridge';
import type { GeoPolygonFeature, HeatPoint, ImpactMetrics } from '../types/app-types';

export interface RecalculateResult {
  points: HeatPoint[];
  metrics: ImpactMetrics;
}

export interface RecalculateProvider {
  recalculate: (input: {
    polygons: GeoPolygonFeature[];
    baselinePoints: HeatPoint[];
  }) => Promise<RecalculateResult>;
}

type BackendPoint = {
  lat: number;
  lng: number;
  temp: number;
};

type BackendMetrics = {
  totalTrees: number;
  totalAreaM2: number;
  totalCost: number;
  annualBenefit: number;
  avgTempBefore: number;
  avgTempAfter: number;
  tempDelta: number;
  paybackYears: number | null;
  polygonCount: number;
  boroughs: string[];
};

type BackendRecalculateResponse = {
  points: BackendPoint[];
  metrics: BackendMetrics;
};

type BackendPolygonFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
};

const toKey = (lat: number, lng: number): string => `${lat}|${lng}`;

const toCoordinatePair = (value: unknown): [number, number] | null => {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const lng = value[0];
  const lat = value[1];
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return null;
  }

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return [lng, lat];
};

const serializePolygon = (polygon: GeoPolygonFeature, index: number): BackendPolygonFeature => {
  const geometry = polygon.geometry;
  if (!geometry || geometry.type !== 'Polygon') {
    throw new Error(`Invalid polygon geometry at index ${index}`);
  }

  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    throw new Error(`Missing polygon coordinates at index ${index}`);
  }

  const coordinates = geometry.coordinates.map((ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error(`Invalid polygon ring at index ${index}:${ringIndex}`);
    }

    return ring.map((coordinate, coordinateIndex) => {
      const pair = toCoordinatePair(coordinate);
      if (!pair) {
        throw new Error(
          `Invalid polygon coordinate at index ${index}:${ringIndex}:${coordinateIndex}`,
        );
      }

      return pair;
    });
  });

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates,
    },
    properties:
      polygon.properties && typeof polygon.properties === 'object'
        ? (polygon.properties as Record<string, unknown>)
        : {},
  };
};

const serializePolygons = (polygons: GeoPolygonFeature[]): BackendPolygonFeature[] =>
  polygons.map((polygon, index) => serializePolygon(polygon, index));

const mapMetrics = (metrics: BackendMetrics): ImpactMetrics => ({
  totalTrees: metrics.totalTrees,
  totalAreaM2: metrics.totalAreaM2,
  totalCost: metrics.totalCost,
  annualBenefit: metrics.annualBenefit,
  avgTempBefore: metrics.avgTempBefore,
  avgTempAfter: metrics.avgTempAfter,
  tempDelta: metrics.tempDelta,
  paybackYears: metrics.paybackYears,
  polygonCount: metrics.polygonCount,
  boroughs: Array.isArray(metrics.boroughs) ? metrics.boroughs : [],
});

const mergeAffectedPoints = (baselinePoints: HeatPoint[], affected: BackendPoint[]): HeatPoint[] => {
  const affectedByKey = new Map(affected.map((point) => [toKey(point.lat, point.lng), point.temp]));

  return baselinePoints.map((point) => {
    const nextTemp = affectedByKey.get(toKey(point.lat, point.lng));
    return {
      ...point,
      currentTemp: nextTemp === undefined ? point.baseTemp : nextTemp,
    };
  });
};

export class BridgeRecalculateProvider implements RecalculateProvider {
  constructor(private readonly bridge: BackendBridge) {}

  async recalculate(input: {
    polygons: GeoPolygonFeature[];
    baselinePoints: HeatPoint[];
  }): Promise<RecalculateResult> {
    const polygons = serializePolygons(input.polygons);

    const response = await this.bridge.request({
      path: '/api/recalculate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        polygons,
      },
    });

    if (!response.ok) {
      throw new Error(`Recalculate request failed: ${response.status}`);
    }

    const payload = JSON.parse(response.body) as BackendRecalculateResponse;

    if (!payload || !Array.isArray(payload.points) || !payload.metrics) {
      throw new Error('Invalid recalculate response payload');
    }

    return {
      points: mergeAffectedPoints(input.baselinePoints, payload.points),
      metrics: mapMetrics(payload.metrics),
    };
  }
}

export class UnsupportedRecalculateProvider implements RecalculateProvider {
  async recalculate(): Promise<RecalculateResult> {
    throw new Error('Live simulation is unavailable right now.');
  }
}
