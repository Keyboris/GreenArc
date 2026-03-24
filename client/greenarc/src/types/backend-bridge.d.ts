export interface BackendRequestInput {
  path: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface BackendRequestResult {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface BackendBridge {
  request: (input: BackendRequestInput) => Promise<BackendRequestResult>;
  getBaseUrl: () => Promise<string>;
}

declare global {
  interface Window {
    backendBridge?: BackendBridge;
  }
}
