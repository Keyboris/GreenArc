import type L from 'leaflet';

export type GeoPolygonFeature = GeoJSON.Feature<GeoJSON.Polygon>;

export interface HeatPoint {
  lat: number;
  lng: number;
  baseTemp: number;
  currentTemp: number;
}

export type PolygonLayerHandle = L.Polygon | string;

export interface DrawnPolygon {
  layer: PolygonLayerHandle;
  feature: GeoPolygonFeature;
  areaM2: number;
  treeCount: number;
  cooling: number;
}

export interface ImpactMetrics {
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
}

export interface AppState {
  baselinePoints: HeatPoint[];
  points: HeatPoint[];
  polygons: DrawnPolygon[];
  metrics: ImpactMetrics | null;
  isCalculating: boolean;
  hasCalculated: boolean;
  briefingText: string;
}
