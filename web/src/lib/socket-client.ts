import { io, Socket } from 'socket.io-client';

const WS_BASE_URL = process.env?.NEXT_PUBLIC_WS_URL || 'http://localhost:10000';

export type SocketNamespace =
  | 'destinations'
  | 'rendez-vous'
  | 'follow-up-meeting'
  | 'procedure'
  | 'notifications'
  | 'users'
  | 'admin/contacts'
  | 'consultant-unavailability';

const sockets = new Map<SocketNamespace, Socket>();

export function getSocket(namespace: SocketNamespace): Socket {
  const existing = sockets.get(namespace);
  if (existing) return existing;
  const socket = io(`${WS_BASE_URL}/${namespace}`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  socket.on('connect_error', (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[WS:${namespace}] connection error`, err.message);
    }
  });
  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WS:${namespace}] disconnected: ${reason}`);
    }
  });
  sockets.set(namespace, socket);
  return socket;
}

export function disconnectSocket(namespace: SocketNamespace): void {
  const socket = sockets.get(namespace);
  if (socket) {
    socket.disconnect();
    sockets.delete(namespace);
  }
}

export function disconnectAllSockets(): void {
  for (const namespace of sockets.keys()) {
    disconnectSocket(namespace);
  }
}
