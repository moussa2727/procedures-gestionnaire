import { create } from 'zustand';

interface PresenceState {
  onlineUserIds: Set<string>;
  setOnline: (userId: string, isOnline: boolean) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set(),
  setOnline: (userId, isOnline) =>
    set((s) => {
      const next = new Set(s.onlineUserIds);
      if (isOnline) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { onlineUserIds: next };
    }),
  isOnline: (userId) => get().onlineUserIds.has(userId),
}));
