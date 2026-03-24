import type { BackendBridge } from '../types/backend-bridge';
import type { ImpactMetrics } from '../types/app-types';

export interface BriefingProvider {
  streamBriefing: (
    metrics: ImpactMetrics,
    onChunk: (chunk: string) => void,
  ) => Promise<void>;
}

const parseJsonBriefing = (rawBody: string): string | null => {
  try {
    const parsed = JSON.parse(rawBody) as {
      briefing?: unknown;
      text?: unknown;
      message?: unknown;
    };

    if (typeof parsed.briefing === 'string' && parsed.briefing.trim()) {
      return parsed.briefing;
    }

    if (typeof parsed.text === 'string' && parsed.text.trim()) {
      return parsed.text;
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    return null;
  }

  return null;
};

const parseSsePayload = (rawBody: string): string[] => {
  const chunks: string[] = [];
  const events = rawBody.split(/\r?\n\r?\n/);

  for (const event of events) {
    const lines = event.split(/\r?\n/);
    const dataLines: string[] = [];
    let hasDataLine = false;

    for (const line of lines) {
      if (line.startsWith('data:')) {
        hasDataLine = true;
        const data = line.slice(5).replace(/^\s/, '');
        if (!data || data === '[DONE]') {
          continue;
        }
        dataLines.push(data);
        continue;
      }

      if (!hasDataLine) {
        continue;
      }

      if (line.startsWith('event:') || line.startsWith('id:') || line.startsWith('retry:')) {
        continue;
      }

      if (!line.trim()) {
        continue;
      }

      dataLines.push(line);
    }

    const chunk = dataLines.join('\n').trim();
    if (chunk && chunk !== '[DONE]') {
      chunks.push(chunk);
    }
  }

  return chunks;
};

const extractBriefingChunks = (rawBody: string): string[] => {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return [];
  }

  const jsonBriefing = parseJsonBriefing(trimmed);
  if (jsonBriefing) {
    return [jsonBriefing];
  }

  if (trimmed.includes('data:')) {
    const sseChunks = parseSsePayload(trimmed);
    if (sseChunks.length > 0) {
      return sseChunks;
    }
  }

  return [trimmed];
};

export class NoopBriefingProvider implements BriefingProvider {
  async streamBriefing(metrics: ImpactMetrics, onChunk: (chunk: string) => void): Promise<void> {
    void metrics;
    void onChunk;
    // Intentionally no-op for client-only scope.
    return;
  }
}

export class UnsupportedBriefingProvider implements BriefingProvider {
  async streamBriefing(): Promise<void> {
    throw new Error('Planning summary is unavailable right now.');
  }
}

export class HttpSseBriefingProvider implements BriefingProvider {
  constructor(private readonly baseUrl: string) {}

  async streamBriefing(
    metrics: ImpactMetrics,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/briefing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to stream briefing: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let rawBody = '';

    let isDone = false;
    while (!isDone) {
      const { done, value } = await reader.read();
      if (done) {
        isDone = true;
        break;
      }

      rawBody += decoder.decode(value, { stream: true });
    }

    rawBody += decoder.decode();

    for (const chunk of extractBriefingChunks(rawBody)) {
      onChunk(chunk);
    }
  }
}

export class BridgeBriefingProvider implements BriefingProvider {
  constructor(private readonly bridge: BackendBridge) {}

  async streamBriefing(
    metrics: ImpactMetrics,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const response = await this.bridge.request({
      path: '/api/briefing',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: metrics,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch briefing: ${response.status}`);
    }

    for (const chunk of extractBriefingChunks(response.body)) {
      onChunk(chunk);
    }
  }
}
