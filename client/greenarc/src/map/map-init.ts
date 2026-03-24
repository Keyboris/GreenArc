import L from 'leaflet';
import type { HeatPoint } from '../types/app-types';
import { createHeatLayer } from './heat-layer';

const CENTRAL_LONDON_SW: [number, number] = [51.45, -0.25];
const CENTRAL_LONDON_NE: [number, number] = [51.57, 0.05];

export type BaseMapType = 'light' | 'dark' | 'street';

export interface MapContext {
  map: L.Map;
  drawnItems: L.FeatureGroup;
  heatLayer: L.Layer;
  setBaseMap: (type: BaseMapType) => void;
  setHeatmapVisible: (visible: boolean) => void;
}

export const createMapContext = (
  containerId: string,
  points: HeatPoint[],
): MapContext => {
  const londonBounds = L.latLngBounds(CENTRAL_LONDON_SW, CENTRAL_LONDON_NE);

  const map = L.map(containerId, {
    center: [51.505, -0.09],
    zoom: 11,
    maxZoom: 16,
    zoomControl: true,
    maxBounds: londonBounds,
    maxBoundsViscosity: 1.0,
  });

  const baseLayers: Record<BaseMapType, L.TileLayer> = {
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      noWrap: true,
      maxZoom: 16,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      noWrap: true,
      maxZoom: 16,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }),
    street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      noWrap: true,
      maxZoom: 16,
      attribution: '&copy; OpenStreetMap contributors',
    }),
  };

  let activeBaseMapType: BaseMapType = 'light';
  baseLayers[activeBaseMapType].addTo(map);

  const applyLondonLock = (): void => {
    const lockedMinZoom = map.getBoundsZoom(londonBounds);
    map.setMinZoom(lockedMinZoom);

    if (map.getZoom() < lockedMinZoom) {
      map.setZoom(lockedMinZoom, { animate: false });
    }

    map.panInsideBounds(londonBounds, { animate: false });
  };

  map.fitBounds(londonBounds, { animate: false });
  applyLondonLock();

  map.on('zoomend moveend', () => {
    map.panInsideBounds(londonBounds, { animate: false });
  });

  const drawnItems = new L.FeatureGroup();
  drawnItems.addTo(map);

  const heatLayer = createHeatLayer(map, points);
  let isHeatmapVisible = true;

  const setBaseMap = (type: BaseMapType): void => {
    if (type === activeBaseMapType) {
      return;
    }

    map.removeLayer(baseLayers[activeBaseMapType]);
    activeBaseMapType = type;
    baseLayers[activeBaseMapType].addTo(map);
  };

  const setHeatmapVisible = (visible: boolean): void => {
    if (visible === isHeatmapVisible) {
      return;
    }

    isHeatmapVisible = visible;
    if (visible) {
      heatLayer.addTo(map);
      return;
    }

    map.removeLayer(heatLayer);
  };

  map.whenReady(() => {
    map.invalidateSize();
    applyLondonLock();
  });

  window.setTimeout(() => {
    map.invalidateSize();
    applyLondonLock();
  }, 0);

  window.addEventListener('resize', () => {
    applyLondonLock();
  });

  return {
    map,
    drawnItems,
    heatLayer,
    setBaseMap,
    setHeatmapVisible,
  };
};
