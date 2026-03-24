import L from 'leaflet';
import type { DrawnPolygon, GeoPolygonFeature } from '../types/app-types';

const ensureFeature = (layer: L.Polygon): GeoPolygonFeature => {
  const rawGeo = layer.toGeoJSON() as GeoJSON.Feature;
  if (rawGeo.geometry.type !== 'Polygon') {
    throw new Error('Only polygon geometry is supported.');
  }

  return {
    type: 'Feature',
    geometry: rawGeo.geometry as GeoJSON.Polygon,
    properties: {},
  };
};

const extractPolygonLayers = (layers: L.LayerGroup): L.Polygon[] => {
  const polygons: L.Polygon[] = [];

  layers.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      polygons.push(layer);
    }
  });

  return polygons;
};

export interface DrawEventHandlers {
  onPolygonCreated: (polygon: Pick<DrawnPolygon, 'layer' | 'feature'>) => void;
  onPolygonsEdited: (polygons: Array<Pick<DrawnPolygon, 'layer' | 'feature'>>) => void;
  onPolygonsDeleted: (layers: L.Polygon[]) => void;
}

export const installDrawControls = (
  map: L.Map,
  drawnItems: L.FeatureGroup,
  handlers: DrawEventHandlers,
): void => {
  const drawControl = new L.Control.Draw({
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: '#16a34a',
          weight: 2,
          fillOpacity: 0.15,
        },
      },
      rectangle: false,
      circle: false,
      marker: false,
      circlemarker: false,
      polyline: false,
    },
    edit: {
      featureGroup: drawnItems,
      edit: {},
      remove: true,
    },
  });

  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (event: L.LeafletEvent) => {
    const drawEvent = event as L.DrawEvents.Created;
    const layer = drawEvent.layer as L.Polygon;

    drawnItems.addLayer(layer);

    handlers.onPolygonCreated({
      layer,
      feature: ensureFeature(layer),
    });
  });

  map.on(L.Draw.Event.EDITED, (event: L.LeafletEvent) => {
    const editedEvent = event as L.DrawEvents.Edited;
    const layers = extractPolygonLayers(editedEvent.layers);

    handlers.onPolygonsEdited(
      layers.map((layer) => ({
        layer,
        feature: ensureFeature(layer),
      })),
    );
  });

  map.on(L.Draw.Event.DELETED, (event: L.LeafletEvent) => {
    const deletedEvent = event as L.DrawEvents.Deleted;
    handlers.onPolygonsDeleted(extractPolygonLayers(deletedEvent.layers));
  });
};
