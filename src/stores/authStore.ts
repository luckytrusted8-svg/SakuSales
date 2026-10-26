import { create } from 'zustand';
import type { UserEntity } from '../lib/db/schema';
import { userRepo } from '../lib/repositories/userRepo';

interface AuthState {
  currentUser: UserEntity | null;
  isLocked: boolean;
  autoLockMinutes: number;
  lastActiveTimestamp: number;
  login: (user: UserEntity) => void;
  logout: () => void;
  lock: () => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  recordActivity: () => void;
  setAutoLockMinutes: (minutes: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isLocked: false,
  autoLockMinutes: 5,
  lastActiveTimestamp: Date.now(),

  login: (user) => {
    set({
      currentUser: user,
      isLocked: false,
      lastActiveTimestamp: Date.now(),
    });
  },

  logout: () => {
    set({
      currentUser: null,
      isLocked: false,
    });
  },

  lock: () => {
    if (get().currentUser) {
      set({ isLocked: true });
    }
  },

  unlockWithPin: async (pin: string) => {
    const { currentUser } = get();
    if (!currentUser) return false;

    const isValid = await userRepo.verifyUserPin(currentUser, pin);
    if (isValid) {
      set({ isLocked: false, lastActiveTimestamp: Date.now() });
      return true;
    }
    return false;
  },

  recordActivity: () => {
    const { isLocked, autoLockMinutes, lastActiveTimestamp, currentUser } = get();
    if (isLocked || !currentUser) return;

    const now = Date.now();
    const elapsedMinutes = (now - lastActiveTimestamp) / (1000 * 60);

    if (autoLockMinutes > 0 && elapsedMinutes >= autoLockMinutes) {
      set({ isLocked: true });
    } else {
      set({ lastActiveTimestamp: now });
    }
  },

  setAutoLockMinutes: (minutes) => {
    set({ autoLockMinutes: Math.max(1, minutes) });
  },
}));
