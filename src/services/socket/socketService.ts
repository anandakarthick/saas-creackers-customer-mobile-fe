import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { API_CONFIG } from '@/config/api';

let socket: Socket | null = null;
let currentTenantId: number | string | null = null;

function getSocketUrl(): string {
  return API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string, tenantId: number | string): Socket {
  if (socket?.connected && currentTenantId === tenantId) {
    console.log('[Socket] Already connected for tenant:', tenantId);
    return socket;
  }

  disconnectSocket();

  const url = getSocketUrl();
  console.log('[Socket] Connecting to:', url, 'for tenant:', tenantId);

  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
  });

  currentTenantId = tenantId;

  socket.on('connect', () => {
    console.log('[Socket] Connected! Socket ID:', socket?.id);
    socket?.emit('join-tenant', tenantId);
    console.log('[Socket] Joined tenant room:', `tenant:${tenantId}`);
  });

  socket.on('reconnect', () => {
    console.log('[Socket] Reconnected, re-joining tenant room');
    socket?.emit('join-tenant', tenantId);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err?.message || err);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected. Reason:', reason);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentTenantId = null;
    console.log('[Socket] Disconnected and cleaned up');
  }
}

export function setupAppStateHandler(): () => void {
  const handler = (state: AppStateStatus) => {
    if (state === 'active' && socket && !socket.connected) {
      console.log('[Socket] App became active, reconnecting...');
      socket.connect();
    }
  };
  const sub = AppState.addEventListener('change', handler);
  return () => sub.remove();
}
