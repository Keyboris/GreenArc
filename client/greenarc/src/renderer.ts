import './index.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import type { BackendBridge } from './types/backend-bridge';
import {
  BridgeBriefingProvider,
  UnsupportedBriefingProvider,
} from './adapters/briefing-provider';
import { BridgePointsProvider, MockPointsProvider } from './adapters/points-provider';
import {
  BridgeRecalculateProvider,
  UnsupportedRecalculateProvider,
} from './adapters/recalculate-provider';
import { derivePolygonImpact } from './logic/calc-impact';
import { installDrawControls } from './map/draw-controls';
import { updateHeatLayer } from './map/heat-layer';
import { createMapContext, type BaseMapType } from './map/map-init';
import { createInitialState, resetPointsToBaseline } from './state/store';
import { renderPanel, type PanelElements } from './ui/panel-render';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'urban-canopy-theme';
const SIDEBAR_WIDTH_STORAGE_KEY = 'urban-canopy-sidebar-width';
const MAP_TYPE_STORAGE_KEY = 'urban-canopy-map-type';
const HEATMAP_VISIBLE_STORAGE_KEY = 'urban-canopy-heatmap-visible';
const SIDEBAR_MIN_WIDTH = 300;
const SIDEBAR_MAX_WIDTH_RATIO = 0.55;

const isBaseMapType = (value: string | null): value is BaseMapType => {
  return value === 'light' || value === 'dark' || value === 'street';
};

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element as T;
};

const getPanelElements = (): PanelElements => ({
  recalcButton: getElement<HTMLButtonElement>('recalculate-button'),
  resetButton: getElement<HTMLButtonElement>('reset-button'),
  avgTempValue: getElement('metric-avg-temp'),
  avgTempSub: getElement('metric-avg-temp-sub'),
  treesValue: getElement('metric-trees'),
  treesSub: getElement('metric-trees-sub'),
  costValue: getElement('metric-cost'),
  costSub: getElement('metric-cost-sub'),
  paybackValue: getElement('metric-payback'),
  paybackSub: getElement('metric-payback-sub'),
  briefingBody: getElement('briefing-body'),
});

const bridge = window.backendBridge as BackendBridge | undefined;

const pointsProvider = bridge
  ? new BridgePointsProvider(bridge)
  : new MockPointsProvider();

const briefingProvider = bridge
  ? new BridgeBriefingProvider(bridge)
  : new UnsupportedBriefingProvider();

const recalculateProvider = bridge
  ? new BridgeRecalculateProvider(bridge)
  : new UnsupportedRecalculateProvider();

const setPointsSourceStatus = (message: string): void => {
  const element = document.getElementById('points-source');
  if (element) {
    element.textContent = message;
  }
};

const getPreferredTheme = (): ThemeMode => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: ThemeMode): void => {
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
};

const initSidebarResize = (map: L.Map): void => {
  const sidebar = document.querySelector('.side-panel') as HTMLElement | null;
  const resizer = document.getElementById('sidebar-resizer');

  if (!sidebar || !resizer) {
    return;
  }

  const getMaxWidth = (): number => Math.floor(window.innerWidth * SIDEBAR_MAX_WIDTH_RATIO);

  const clampWidth = (width: number): number => {
    return Math.max(SIDEBAR_MIN_WIDTH, Math.min(getMaxWidth(), width));
  };

  const setSidebarWidth = (width: number): void => {
    const clamped = clampWidth(width);
    sidebar.style.flexBasis = `${clamped}px`;
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));

    // Leaflet needs explicit invalidation after container size changes.
    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
  };

  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  if (Number.isFinite(storedWidth)) {
    setSidebarWidth(storedWidth);
  }

  let isResizing = false;

  resizer.addEventListener('mousedown', (event: MouseEvent) => {
    isResizing = true;
    document.body.classList.add('is-resizing');
    event.preventDefault();
  });

  window.addEventListener('mousemove', (event: MouseEvent) => {
    if (!isResizing) {
      return;
    }

    const widthFromRight = window.innerWidth - event.clientX;
    setSidebarWidth(widthFromRight);
  });

  window.addEventListener('mouseup', () => {
    if (!isResizing) {
      return;
    }

    isResizing = false;
    document.body.classList.remove('is-resizing');
  });

  window.addEventListener('resize', () => {
    const currentWidth = sidebar.getBoundingClientRect().width;
    setSidebarWidth(currentWidth);
  });
};

const bootstrap = async (): Promise<void> => {
  applyTheme(getPreferredTheme());

  (window as Window & { L?: typeof L }).L = L;

  let drawPluginReady = false;
  try {
    await Promise.all([import('leaflet.heat'), import('leaflet-draw')]);
    drawPluginReady = true;
  } catch (error) {
    console.error('Leaflet plugin initialization failed', error);
  }

  const panelElements = getPanelElements();
  const themeToggle = getElement<HTMLButtonElement>('theme-toggle');
  const heatmapToggle = getElement<HTMLInputElement>('heatmap-toggle');
  const mapTypeSelect = getElement<HTMLSelectElement>('map-type-select');

  if (bridge) {
    setPointsSourceStatus('Data source: connecting...');
  } else {
    setPointsSourceStatus('Data source: offline mode');
  }

  let points;
  try {
    points = await pointsProvider.loadPoints();
    setPointsSourceStatus(`Data source: live (${points.length} points loaded)`);
  } catch (error) {
    console.error('Backend points failed, using mock points fallback', error);
    points = await new MockPointsProvider().loadPoints();
    setPointsSourceStatus(`Data source: fallback (${points.length} points loaded)`);
  }
  const state = createInitialState(points);
  const mapContext = createMapContext('map', state.points);
  initSidebarResize(mapContext.map);

  const storedMapType = window.localStorage.getItem(MAP_TYPE_STORAGE_KEY);
  if (isBaseMapType(storedMapType)) {
    mapTypeSelect.value = storedMapType;
    mapContext.setBaseMap(storedMapType);
  }

  const storedHeatmapVisible = window.localStorage.getItem(HEATMAP_VISIBLE_STORAGE_KEY);
  if (storedHeatmapVisible === 'true' || storedHeatmapVisible === 'false') {
    const isVisible = storedHeatmapVisible === 'true';
    heatmapToggle.checked = isVisible;
    mapContext.setHeatmapVisible(isVisible);
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  heatmapToggle.addEventListener('change', () => {
    mapContext.setHeatmapVisible(heatmapToggle.checked);
    window.localStorage.setItem(HEATMAP_VISIBLE_STORAGE_KEY, String(heatmapToggle.checked));
  });

  mapTypeSelect.addEventListener('change', () => {
    const selectedMapType = mapTypeSelect.value;
    if (!isBaseMapType(selectedMapType)) {
      return;
    }

    mapContext.setBaseMap(selectedMapType);
    window.localStorage.setItem(MAP_TYPE_STORAGE_KEY, selectedMapType);
  });

  const runSimulation = async (): Promise<void> => {
    const previousPoints = state.points;
    const previousMetrics = state.metrics;
    const previousHasCalculated = state.hasCalculated;
    const previousBriefing = state.briefingText;

    try {
      const result = await recalculateProvider.recalculate({
        polygons: state.polygons.map((polygon) => polygon.feature),
        baselinePoints: state.baselinePoints,
      });

      state.points = result.points;
      state.metrics = result.metrics;
      state.hasCalculated = true;
      state.briefingText = 'Generating planning summary...';

      updateHeatLayer(mapContext.heatLayer, state.points);
      renderPanel(state, panelElements);

      let briefingText = '';
      await briefingProvider.streamBriefing(result.metrics, (chunk) => {
        briefingText += chunk;
        state.briefingText = briefingText;
        renderPanel(state, panelElements);
      });

      if (!briefingText.trim()) {
        state.briefingText = 'Planning summary is unavailable right now. Please try again.';
      }
    } catch (error) {
      console.error('Live simulation failed', error);
      state.points = previousPoints;
      state.metrics = previousMetrics;
      state.hasCalculated = previousHasCalculated;
      state.briefingText =
        previousHasCalculated && previousBriefing
          ? previousBriefing
          : 'Live simulation is unavailable right now. Please check the backend and try again.';
    }

    renderPanel(state, panelElements);
  };

  const syncAfterGeometryChange = async (): Promise<void> => {
    if (!state.hasCalculated) {
      renderPanel(state, panelElements);
      return;
    }

    await runSimulation();
  };

  if (drawPluginReady) {
    installDrawControls(mapContext.map, mapContext.drawnItems, {
      onPolygonCreated: ({ layer, feature }) => {
        const impact = derivePolygonImpact(feature);
        state.polygons.push({
          layer,
          feature,
          ...impact,
        });

        void syncAfterGeometryChange();
      },
      onPolygonsEdited: (editedPolygons) => {
        for (const edited of editedPolygons) {
          const target = state.polygons.find((item) => item.layer === edited.layer);
          if (!target) {
            continue;
          }

          const impact = derivePolygonImpact(edited.feature);
          target.feature = edited.feature;
          target.areaM2 = impact.areaM2;
          target.treeCount = impact.treeCount;
          target.cooling = impact.cooling;
        }

        void syncAfterGeometryChange();
      },
      onPolygonsDeleted: (deletedLayers) => {
        state.polygons = state.polygons.filter(
          (polygon) => !deletedLayers.some((layer) => layer === polygon.layer),
        );

        void syncAfterGeometryChange();
      },
    });
  } else {
    state.briefingText =
      'Map loaded, but drawing tools failed to initialize. Check console for plugin errors.';
    renderPanel(state, panelElements);
  }

  panelElements.recalcButton.addEventListener('click', () => {
    if (!state.polygons.length || state.isCalculating) {
      return;
    }

    state.isCalculating = true;
    renderPanel(state, panelElements);

    void runSimulation().finally(() => {
      state.isCalculating = false;
      renderPanel(state, panelElements);
    });
  });

  panelElements.resetButton.addEventListener('click', () => {
    mapContext.drawnItems.clearLayers();
    state.polygons = [];
    resetPointsToBaseline(state);
    state.metrics = null;
    state.hasCalculated = false;
    state.isCalculating = false;
    state.briefingText =
      'Draw one or more canopy zones and click Recalculate Impact to generate updated impact metrics.';

    updateHeatLayer(mapContext.heatLayer, state.points);
    renderPanel(state, panelElements);
  });

  renderPanel(state, panelElements);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void bootstrap();
  });
} else {
  void bootstrap();
}
