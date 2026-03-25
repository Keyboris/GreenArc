import type { HeatPoint } from '../types/app-types';
import type { DrawEventHandlers } from './draw-controls';
import type { BaseMapType } from './map-init';

export type MapMode = '2d' | '3d';

export interface MapEngine {
  readonly mode: MapMode;
  flyToLocation: (lat: number, lng: number) => void;
  setBaseMap: (type: BaseMapType) => void;
  setHeatmapVisible: (visible: boolean) => void;
  updateHeat: (points: HeatPoint[]) => void;
  clearDrawnPolygons: () => void;
  handleContainerResize: () => void;
  installDrawControls: (drawPluginReady: boolean, handlers: DrawEventHandlers) => boolean;
  destroy: () => void;
}