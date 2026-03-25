import type { HeatPoint } from '../types/app-types';
import { installDrawControls, type DrawEventHandlers } from './draw-controls';
import { updateHeatLayer } from './heat-layer';
import type { MapEngine } from './map-engine';
import { createMapContext } from './map-init';

export const createLeafletEngine = (containerId: string, points: HeatPoint[]): MapEngine => {
  const mapContext = createMapContext(containerId, points);

  return {
    mode: '2d',
    flyToLocation: (lat: number, lng: number) => {
      mapContext.map.flyTo([lat, lng], Math.max(14, mapContext.map.getZoom()), {
        duration: 0.8,
      });
    },
    setBaseMap: mapContext.setBaseMap,
    setHeatmapVisible: mapContext.setHeatmapVisible,
    updateHeat: (nextPoints: HeatPoint[]) => {
      updateHeatLayer(mapContext.heatLayer, nextPoints);
    },
    clearDrawnPolygons: () => {
      mapContext.drawnItems.clearLayers();
    },
    handleContainerResize: () => {
      mapContext.map.invalidateSize();
    },
    installDrawControls: (drawPluginReady: boolean, handlers: DrawEventHandlers): boolean => {
      if (!drawPluginReady) {
        return false;
      }

      installDrawControls(mapContext.map, mapContext.drawnItems, handlers);
      return true;
    },
    destroy: () => {
      mapContext.map.remove();
    },
  };
};