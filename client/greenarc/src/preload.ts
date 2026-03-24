import { contextBridge, ipcRenderer } from 'electron';

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

contextBridge.exposeInMainWorld('backendBridge', {
	request: (input: BackendRequestInput): Promise<BackendRequestResult> =>
		ipcRenderer.invoke('backend:request', input),
	getBaseUrl: (): Promise<string> => ipcRenderer.invoke('backend:getBaseUrl'),
});
