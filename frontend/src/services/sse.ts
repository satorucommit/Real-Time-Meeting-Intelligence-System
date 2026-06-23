const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export type SSEEventType = 'connected' | 'initial_state' | 'transcription' | 'analysis' | 'notification' | 'heartbeat' | 'session_update' | 'error';

export interface SSEManager {
  connect: (sessionId: string) => void;
  disconnect: () => void;
  on: (event: SSEEventType, handler: (data: unknown) => void) => void;
  off: (event: SSEEventType, handler: (data: unknown) => void) => void;
  isConnected: () => boolean;
}

export function createSSEManager(): SSEManager {
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let currentSessionId: string | null = null;
  let retryCount = 0;
  const maxRetries = 10;
  const handlers = new Map<SSEEventType, Set<(data: unknown) => void>>();

  const eventTypes: SSEEventType[] = ['connected', 'initial_state', 'transcription', 'analysis', 'notification', 'heartbeat', 'session_update', 'error'];

  function connect(sessionId: string): void {
    disconnect();
    currentSessionId = sessionId;
    retryCount = 0;

    try {
      eventSource = new EventSource(`${API_BASE}/api/stream/${sessionId}`);

      eventSource.onopen = () => {
        console.log('📡 SSE connected');
        retryCount = 0;
      };

      for (const type of eventTypes) {
        eventSource.addEventListener(type, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            const typeHandlers = handlers.get(type);
            if (typeHandlers) {
              typeHandlers.forEach(h => h(data));
            }
          } catch (e) {
            console.warn('SSE parse error:', e);
          }
        });
      }

      eventSource.onerror = () => {
        console.warn('📡 SSE connection error');
        if (retryCount < maxRetries && currentSessionId) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          reconnectTimer = setTimeout(() => {
            if (currentSessionId) connect(currentSessionId);
          }, delay);
        }
      };
    } catch (e) {
      console.error('SSE connection failed:', e);
    }
  }

  function disconnect(): void {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    currentSessionId = null;
  }

  function on(event: SSEEventType, handler: (data: unknown) => void): void {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
  }

  function off(event: SSEEventType, handler: (data: unknown) => void): void {
    handlers.get(event)?.delete(handler);
  }

  function isConnected(): boolean {
    return eventSource?.readyState === EventSource.OPEN;
  }

  return { connect, disconnect, on, off, isConnected };
}
