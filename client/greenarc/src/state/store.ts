import type { AppState, HeatPoint } from '../types/app-types';

const clonePoints = (points: HeatPoint[]): HeatPoint[] =>
  points.map((point) => ({ ...point }));

const DEFAULT_BRIEFING_TEXT =
  'Draw one or more canopy zones and click Recalculate Impact to generate updated impact metrics.';

export const createInitialState = (points: HeatPoint[]): AppState => ({
  baselinePoints: clonePoints(points),
  points: clonePoints(points),
  polygons: [],
  metrics: null,
  isCalculating: false,
  hasCalculated: false,
  briefingText: DEFAULT_BRIEFING_TEXT,
});

export const resetPointsToBaseline = (state: AppState): void => {
  state.points = state.baselinePoints.map((point) => ({
    ...point,
    currentTemp: point.baseTemp,
  }));
};
