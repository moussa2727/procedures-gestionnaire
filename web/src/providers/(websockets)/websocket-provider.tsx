// src/providers/(websockets)/websocket-provider.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/src/stores/auth-store';
import { disconnectAllSockets } from '@/src/lib/socket-client';

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectAllSockets();
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}