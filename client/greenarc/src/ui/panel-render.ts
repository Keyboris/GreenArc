import type { AppState, ImpactMetrics } from '../types/app-types';

export interface PanelElements {
  recalcButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  avgTempValue: HTMLElement;
  avgTempSub: HTMLElement;
  treesValue: HTMLElement;
  treesSub: HTMLElement;
  costValue: HTMLElement;
  costSub: HTMLElement;
  paybackValue: HTMLElement;
  paybackSub: HTMLElement;
  briefingBody: HTMLElement;
}

interface BriefingAnimationState {
  displayedText: string;
  targetText: string;
  timerId: number | null;
}

const BRIEFING_TYPING_INTERVAL_MS = 16;
const BRIEFING_CHARS_PER_TICK = 2;
const briefingAnimationStates = new WeakMap<HTMLElement, BriefingAnimationState>();

const getBriefingAnimationState = (element: HTMLElement): BriefingAnimationState => {
  const existing = briefingAnimationStates.get(element);
  if (existing) {
    return existing;
  }

  const initialText = element.textContent ?? '';
  const state: BriefingAnimationState = {
    displayedText: initialText,
    targetText: initialText,
    timerId: null,
  };
  briefingAnimationStates.set(element, state);
  return state;
};

const stopBriefingTyping = (element: HTMLElement, state: BriefingAnimationState): void => {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  element.classList.remove('is-typing');
};

const renderBriefingWithTyping = (element: HTMLElement, nextText: string): void => {
  const state = getBriefingAnimationState(element);

  if (nextText === state.targetText && state.displayedText === nextText) {
    return;
  }

  state.targetText = nextText;

  // If the new text is unrelated to what is currently visible, restart animation.
  if (!nextText.startsWith(state.displayedText)) {
    state.displayedText = '';
    element.textContent = '';
  }

  if (!state.targetText) {
    stopBriefingTyping(element, state);
    state.displayedText = '';
    element.textContent = '';
    return;
  }

  if (state.timerId !== null) {
    return;
  }

  element.classList.add('is-typing');
  state.timerId = window.setInterval(() => {
    if (state.displayedText.length >= state.targetText.length) {
      stopBriefingTyping(element, state);
      return;
    }

    const nextEndIndex = Math.min(
      state.displayedText.length + BRIEFING_CHARS_PER_TICK,
      state.targetText.length,
    );
    state.displayedText = state.targetText.slice(0, nextEndIndex);
    element.textContent = state.displayedText;

    if (state.displayedText.length >= state.targetText.length) {
      stopBriefingTyping(element, state);
    }
  }, BRIEFING_TYPING_INTERVAL_MS);
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-GB');
const areaFormatter = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 0,
});

const setMetricPlaceholder = (elements: PanelElements): void => {
  elements.avgTempValue.textContent = '—';
  elements.avgTempSub.textContent = 'Recalculate after drawing zones';
  elements.treesValue.textContent = '—';
  elements.treesSub.textContent = 'across 0 zones • 0 m²';
  elements.costValue.textContent = '—';
  elements.costSub.textContent = 'at £500 per tree';
  elements.paybackValue.textContent = '—';
  elements.paybackSub.textContent = 'based on energy savings';
};

const renderMetrics = (metrics: ImpactMetrics, elements: PanelElements): void => {
  elements.avgTempValue.textContent = `${metrics.avgTempAfter.toFixed(1)}°C`;
  elements.avgTempSub.textContent = `↓ ${Math.abs(metrics.tempDelta).toFixed(1)}°C from ${metrics.avgTempBefore.toFixed(1)}°C`;

  elements.treesValue.textContent = numberFormatter.format(metrics.totalTrees);
  elements.treesSub.textContent = `across ${metrics.polygonCount} zone${metrics.polygonCount === 1 ? '' : 's'} • ${areaFormatter.format(Math.round(metrics.totalAreaM2))} m²`;

  elements.costValue.textContent = currencyFormatter.format(metrics.totalCost);
  elements.costSub.textContent = 'at £500 per tree';

  elements.paybackValue.textContent =
    metrics.paybackYears === null ? '—' : `~${metrics.paybackYears} yrs`;
  elements.paybackSub.textContent = 'based on energy savings';
};

export const renderPanel = (state: AppState, elements: PanelElements): void => {
  if (state.metrics) {
    renderMetrics(state.metrics, elements);
  } else {
    setMetricPlaceholder(elements);
  }

  elements.recalcButton.disabled = state.polygons.length === 0 || state.isCalculating;
  elements.recalcButton.textContent = state.isCalculating
    ? 'Calculating...'
    : 'Recalculate Impact';

  renderBriefingWithTyping(elements.briefingBody, state.briefingText);
};
