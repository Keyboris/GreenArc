import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  defined,
  ImageMaterialProperty,
  Math as CesiumMath,
  PolygonHierarchy,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  Viewer,
  type Entity,
  type ImageryProvider,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { GeoPolygonFeature, HeatPoint } from '../types/app-types';
import type { DrawEventHandlers } from './draw-controls';
import type { MapEngine } from './map-engine';
import type { BaseMapType } from './map-init';

const CENTRAL_LONDON_SW: [number, number] = [51.45, -0.25];
const CENTRAL_LONDON_NE: [number, number] = [51.57, 0.05];
const CENTRAL_LONDON_RECTANGLE = Rectangle.fromDegrees(
  CENTRAL_LONDON_SW[1],
  CENTRAL_LONDON_SW[0],
  CENTRAL_LONDON_NE[1],
  CENTRAL_LONDON_NE[0],
);

const FALLBACK_MIN_TEMP = 22;
const FALLBACK_MAX_TEMP = 35;
const MIN_DYNAMIC_RANGE = 2.0;
const NORMALIZATION_LOW_PERCENTILE = 0.1;
const NORMALIZATION_HIGH_PERCENTILE = 0.95;
const HEAT_CANVAS_SIZE = 640;
const HEAT_EDGE_FADE_RATIO = 0.18;
const HEAT_KERNEL_MIN_RADIUS = 10;
const HEAT_KERNEL_MAX_RADIUS = 26;
const HEAT_KERNEL_SIGMA_RATIO = 0.45;
const HEAT_MIN_WEIGHT = 0.035;
const HEAT_WEIGHT_TO_CONFIDENCE_GAIN = 0.22;
const HEAT_ALPHA_MIN = 32;
const HEAT_ALPHA_RANGE = 180;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const toLngLatDegrees = (cartographic: Cartographic): [number, number] => [
  CesiumMath.toDegrees(cartographic.longitude),
  CesiumMath.toDegrees(cartographic.latitude),
];

const toPolygonFeature = (points: Cartographic[]): GeoPolygonFeature => {
  const ring = points.map((point) => {
    const [lng, lat] = toLngLatDegrees(point);
    return [lng, lat] as [number, number];
  });

  if (ring.length) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
    properties: {},
  };
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const getPercentile = (sortedValues: number[], percentile: number): number => {
  if (!sortedValues.length) {
    return 0;
  }

  const position = clamp(percentile, 0, 1) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
};

const createHeatNormalizer = (points: HeatPoint[]): ((temp: number) => number) => {
  const temps = points
    .map((point) => point.currentTemp)
    .filter((temp) => Number.isFinite(temp))
    .sort((a, b) => a - b);

  if (temps.length < 2) {
    return (temp: number): number => {
      const raw = (temp - FALLBACK_MIN_TEMP) / (FALLBACK_MAX_TEMP - FALLBACK_MIN_TEMP);
      return clamp(raw, 0, 1);
    };
  }

  let minTemp = getPercentile(temps, NORMALIZATION_LOW_PERCENTILE);
  let maxTemp = getPercentile(temps, NORMALIZATION_HIGH_PERCENTILE);

  if (maxTemp - minTemp < MIN_DYNAMIC_RANGE) {
    const midpoint = (maxTemp + minTemp) / 2;
    minTemp = midpoint - MIN_DYNAMIC_RANGE / 2;
    maxTemp = midpoint + MIN_DYNAMIC_RANGE / 2;
  }

  return (temp: number): number => {
    const raw = (temp - minTemp) / (maxTemp - minTemp);
    return clamp(raw, 0, 1);
  };
};

const getHeatColorBytes = (normalized: number): [number, number, number] => {
  const shaped = Math.pow(clamp(normalized, 0, 1), 1.15);
  const brightness = Math.round(40 + shaped * 215);
  return [brightness, brightness, brightness];
};

const buildBaseProvider = (type: BaseMapType): ImageryProvider => {
  if (type === 'dark') {
    return new UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      maximumLevel: 19,
      credit: 'OpenStreetMap contributors, CARTO',
    });
  }

  if (type === 'street') {
    return new UrlTemplateImageryProvider({
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      maximumLevel: 19,
      credit: 'OpenStreetMap contributors',
    });
  }

  return new UrlTemplateImageryProvider({
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maximumLevel: 19,
    credit: 'OpenStreetMap contributors, CARTO',
  });
};

export const createCesiumEngine = (containerId: string, points: HeatPoint[]): MapEngine => {
  const viewer = new Viewer(containerId, {
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    terrain: undefined,
    imageryProvider: buildBaseProvider('light'),
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.camera.setView({
    destination: CENTRAL_LONDON_RECTANGLE,
  });

  let heatVisible = true;
  let currentPoints = points;

  const heatCanvas = document.createElement('canvas');
  heatCanvas.width = HEAT_CANVAS_SIZE;
  heatCanvas.height = HEAT_CANVAS_SIZE;

  const heatContext = heatCanvas.getContext('2d');
  if (!heatContext) {
    throw new Error('Unable to initialize 3D heatmap canvas context.');
  }

  const heatLayerEntity = viewer.entities.add({
    rectangle: {
      coordinates: CENTRAL_LONDON_RECTANGLE,
      material: new ImageMaterialProperty({
        image: heatCanvas,
        transparent: true,
      }),
      height: 0,
    },
  });

  const lockCameraToLondon = (): void => {
    const position = viewer.camera.positionCartographic;
    const safeLongitude = clamp(
      CesiumMath.toDegrees(position.longitude),
      CENTRAL_LONDON_SW[1],
      CENTRAL_LONDON_NE[1],
    );
    const safeLatitude = clamp(
      CesiumMath.toDegrees(position.latitude),
      CENTRAL_LONDON_SW[0],
      CENTRAL_LONDON_NE[0],
    );

    if (
      Math.abs(safeLongitude - CesiumMath.toDegrees(position.longitude)) > 0.0001 ||
      Math.abs(safeLatitude - CesiumMath.toDegrees(position.latitude)) > 0.0001
    ) {
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(safeLongitude, safeLatitude, Math.max(500, position.height)),
      });
    }
  };

  viewer.camera.changed.addEventListener(lockCameraToLondon);

  let drawHandlers: DrawEventHandlers | null = null;
  let drawModeEnabled = false;
  let polygonIdCounter = 1;
  let drawToolbar: HTMLDivElement | null = null;
  let drawStatus: HTMLSpanElement | null = null;
  let finishButton: HTMLButtonElement | null = null;
  let screenSpaceHandler: ScreenSpaceEventHandler | null = null;

  const polygonEntities = new Map<string, Entity>();
  const draftPoints: Cartographic[] = [];
  let draftPolygonEntity: Entity | null = null;
  let draftPolylineEntity: Entity | null = null;

  const getDraftPositions = (): Cartesian3[] => {
    return draftPoints.map((point) => {
      const [lng, lat] = toLngLatDegrees(point);
      return Cartesian3.fromDegrees(lng, lat, 0);
    });
  };

  const updateDraftEntities = (): void => {
    if (!draftPolygonEntity) {
      draftPolygonEntity = viewer.entities.add({
        polygon: {
          hierarchy: new CallbackProperty(() => {
            return new PolygonHierarchy(getDraftPositions());
          }, false),
          material: Color.fromCssColorString('#16a34a').withAlpha(0.18),
          outline: true,
          outlineColor: Color.fromCssColorString('#16a34a').withAlpha(0.85),
        },
        show: false,
      });
    }

    if (!draftPolylineEntity) {
      draftPolylineEntity = viewer.entities.add({
        polyline: {
          positions: new CallbackProperty(() => getDraftPositions(), false),
          width: 2,
          material: Color.fromCssColorString('#16a34a').withAlpha(0.95),
          clampToGround: false,
        },
        show: false,
      });
    }

    if (draftPolygonEntity) {
      draftPolygonEntity.show = drawModeEnabled && draftPoints.length >= 3;
    }

    if (draftPolylineEntity) {
      draftPolylineEntity.show = drawModeEnabled && draftPoints.length >= 2;
    }
  };

  const clearDraft = (): void => {
    draftPoints.length = 0;
    if (draftPolygonEntity) {
      draftPolygonEntity.show = false;
    }
    if (draftPolylineEntity) {
      draftPolylineEntity.show = false;
    }
  };

  const updateToolbarState = (): void => {
    if (drawStatus) {
      drawStatus.textContent = drawModeEnabled
        ? `Drawing: ${draftPoints.length} point${draftPoints.length === 1 ? '' : 's'}`
        : '3D polygon mode: off';
    }

    if (finishButton) {
      finishButton.disabled = !drawModeEnabled || draftPoints.length < 3;
    }
  };

  const pickCartographic = (position: Cartesian2): Cartographic | null => {
    let pickedCartesian: Cartesian3 | undefined;

    if (viewer.scene.pickPositionSupported) {
      const scenePosition = viewer.scene.pickPosition(position);
      if (defined(scenePosition)) {
        pickedCartesian = scenePosition;
      }
    }

    if (!pickedCartesian) {
      const ellipsoidPosition = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
      if (defined(ellipsoidPosition)) {
        pickedCartesian = ellipsoidPosition;
      }
    }

    if (!pickedCartesian) {
      return null;
    }

    const raw = Cartographic.fromCartesian(pickedCartesian);
    const safeLongitude = clamp(
      CesiumMath.toDegrees(raw.longitude),
      CENTRAL_LONDON_SW[1],
      CENTRAL_LONDON_NE[1],
    );
    const safeLatitude = clamp(
      CesiumMath.toDegrees(raw.latitude),
      CENTRAL_LONDON_SW[0],
      CENTRAL_LONDON_NE[0],
    );

    return Cartographic.fromDegrees(safeLongitude, safeLatitude, 0);
  };

  const clearAllPolygons = (emitDeleted: boolean): void => {
    const layerIds = [...polygonEntities.keys()];
    for (const id of layerIds) {
      const entity = polygonEntities.get(id);
      if (entity) {
        viewer.entities.remove(entity);
      }
      polygonEntities.delete(id);
    }

    clearDraft();
    updateToolbarState();

    if (emitDeleted && layerIds.length && drawHandlers) {
      drawHandlers.onPolygonsDeleted(layerIds);
    }

    viewer.scene.requestRender();
  };

  const finishCurrentPolygon = (): void => {
    if (!drawHandlers || draftPoints.length < 3) {
      return;
    }

    const positions = getDraftPositions();
    const entity = viewer.entities.add({
      polygon: {
        hierarchy: new PolygonHierarchy(positions),
        material: Color.fromCssColorString('#16a34a').withAlpha(0.2),
        outline: true,
        outlineColor: Color.fromCssColorString('#16a34a').withAlpha(0.95),
      },
    });

    const layerId = `cesium-poly-${polygonIdCounter++}`;
    polygonEntities.set(layerId, entity);

    drawHandlers.onPolygonCreated({
      layer: layerId,
      feature: toPolygonFeature(draftPoints),
    });

    clearDraft();
    drawModeEnabled = false;
    updateToolbarState();
    viewer.scene.requestRender();
  };

  const ensureScreenSpaceHandler = (): void => {
    if (screenSpaceHandler) {
      return;
    }

    screenSpaceHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    screenSpaceHandler.setInputAction((movement: { position: Cartesian2 }) => {
      if (!drawModeEnabled) {
        return;
      }

      const cartographic = pickCartographic(movement.position);
      if (!cartographic) {
        return;
      }

      draftPoints.push(cartographic);
      updateDraftEntities();
      updateToolbarState();
      viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_CLICK);

    screenSpaceHandler.setInputAction(() => {
      // Prevent default double-click camera interaction while polygon drawing is active.
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  };

  const createDrawToolbar = (): void => {
    if (drawToolbar) {
      return;
    }

    const mapContainer = document.getElementById(containerId);
    if (!mapContainer?.parentElement) {
      return;
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'map-floating-toolbar map-floating-toolbar--draw3d';

    const drawButton = document.createElement('button');
    drawButton.type = 'button';
    drawButton.textContent = 'Draw 3D';

    const finish = document.createElement('button');
    finish.type = 'button';
    finish.textContent = 'Finish';
    finish.disabled = true;

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.textContent = 'Clear';

    const status = document.createElement('span');
    status.className = 'toolbar-status';

    drawButton.addEventListener('click', () => {
      drawModeEnabled = !drawModeEnabled;
      if (!drawModeEnabled) {
        clearDraft();
      }
      updateDraftEntities();
      updateToolbarState();
      viewer.scene.requestRender();
    });

    finish.addEventListener('click', () => {
      finishCurrentPolygon();
    });

    clearButton.addEventListener('click', () => {
      clearAllPolygons(true);
    });

    toolbar.appendChild(drawButton);
    toolbar.appendChild(finish);
    toolbar.appendChild(clearButton);
    toolbar.appendChild(status);

    mapContainer.parentElement.appendChild(toolbar);

    drawToolbar = toolbar;
    drawStatus = status;
    finishButton = finish;
    updateToolbarState();
  };

  const renderHeat = (nextPoints: HeatPoint[]): void => {
    heatContext.clearRect(0, 0, HEAT_CANVAS_SIZE, HEAT_CANVAS_SIZE);

    if (!nextPoints.length) {
      viewer.scene.requestRender();
      return;
    }

    const normalizeHeat = createHeatNormalizer(nextPoints);
    const widthSpan = CENTRAL_LONDON_NE[1] - CENTRAL_LONDON_SW[1];
    const heightSpan = CENTRAL_LONDON_NE[0] - CENTRAL_LONDON_SW[0];
    const pixelCount = HEAT_CANVAS_SIZE * HEAT_CANVAS_SIZE;
    const weightedTempSums = new Float32Array(pixelCount);
    const weightSums = new Float32Array(pixelCount);

    for (let index = 0; index < nextPoints.length; index += 1) {
      const point = nextPoints[index];
      const normalizedTemp = normalizeHeat(point.currentTemp);

      const centerX = ((point.lng - CENTRAL_LONDON_SW[1]) / widthSpan) * HEAT_CANVAS_SIZE;
      const centerY = (1 - (point.lat - CENTRAL_LONDON_SW[0]) / heightSpan) * HEAT_CANVAS_SIZE;

      const radius = HEAT_KERNEL_MIN_RADIUS + normalizedTemp * (HEAT_KERNEL_MAX_RADIUS - HEAT_KERNEL_MIN_RADIUS);
      const sigma = Math.max(1, radius * HEAT_KERNEL_SIGMA_RATIO);
      const twoSigmaSquared = 2 * sigma * sigma;

      const xMin = Math.max(0, Math.floor(centerX - radius));
      const xMax = Math.min(HEAT_CANVAS_SIZE - 1, Math.ceil(centerX + radius));
      const yMin = Math.max(0, Math.floor(centerY - radius));
      const yMax = Math.min(HEAT_CANVAS_SIZE - 1, Math.ceil(centerY + radius));

      for (let y = yMin; y <= yMax; y += 1) {
        for (let x = xMin; x <= xMax; x += 1) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > radius * radius) {
            continue;
          }

          const weight = Math.exp(-distanceSquared / twoSigmaSquared);
          const pixelIndex = y * HEAT_CANVAS_SIZE + x;
          weightSums[pixelIndex] += weight;
          weightedTempSums[pixelIndex] += weight * normalizedTemp;
        }
      }
    }

    const imageData = heatContext.createImageData(HEAT_CANVAS_SIZE, HEAT_CANVAS_SIZE);
    const { data } = imageData;

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const weight = weightSums[pixelIndex];
      if (weight < HEAT_MIN_WEIGHT) {
        continue;
      }

      const x = pixelIndex % HEAT_CANVAS_SIZE;
      const y = Math.floor(pixelIndex / HEAT_CANVAS_SIZE);
      const minDistToEdge = Math.min(
        x,
        HEAT_CANVAS_SIZE - 1 - x,
        y,
        HEAT_CANVAS_SIZE - 1 - y,
      );
      const edgeFadePixels = HEAT_CANVAS_SIZE * HEAT_EDGE_FADE_RATIO;
      const edgeMask = smoothstep(0, edgeFadePixels, minDistToEdge);

      const interpolatedTemp = clamp(weightedTempSums[pixelIndex] / weight, 0, 1);
      const confidence = clamp((weight - HEAT_MIN_WEIGHT) * HEAT_WEIGHT_TO_CONFIDENCE_GAIN, 0, 1);

      const [r, g, b] = getHeatColorBytes(interpolatedTemp);
      const alpha = Math.round(
        (HEAT_ALPHA_MIN + HEAT_ALPHA_RANGE * interpolatedTemp) * confidence * edgeMask,
      );

      const dataIndex = pixelIndex * 4;
      data[dataIndex] = r;
      data[dataIndex + 1] = g;
      data[dataIndex + 2] = b;
      data[dataIndex + 3] = alpha;
    }

    heatContext.putImageData(imageData, 0, 0);
    viewer.scene.requestRender();
  };

  renderHeat(currentPoints);

  return {
    mode: '3d',
    flyToLocation: (lat: number, lng: number) => {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lng, lat, 2200),
        duration: 1.2,
      });
    },
    setBaseMap: (type: BaseMapType) => {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(buildBaseProvider(type));
      viewer.scene.requestRender();
    },
    setHeatmapVisible: (visible: boolean) => {
      heatVisible = visible;
      heatLayerEntity.show = visible;
      viewer.scene.requestRender();
    },
    updateHeat: (nextPoints: HeatPoint[]) => {
      currentPoints = nextPoints;
      renderHeat(currentPoints);
      heatLayerEntity.show = heatVisible;
    },
    clearDrawnPolygons: () => {
      clearAllPolygons(false);
    },
    handleContainerResize: () => {
      viewer.resize();
      viewer.scene.requestRender();
    },
    installDrawControls: (_drawPluginReady: boolean, handlers: DrawEventHandlers): boolean => {
      drawHandlers = handlers;
      createDrawToolbar();
      ensureScreenSpaceHandler();
      updateToolbarState();
      return true;
    },
    destroy: () => {
      clearAllPolygons(false);

      if (screenSpaceHandler) {
        screenSpaceHandler.destroy();
        screenSpaceHandler = null;
      }

      if (drawToolbar?.parentElement) {
        drawToolbar.parentElement.removeChild(drawToolbar);
      }
      drawToolbar = null;

      viewer.camera.changed.removeEventListener(lockCameraToLondon);
      viewer.destroy();
    },
  };
};