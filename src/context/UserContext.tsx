import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { api, getAccessToken, logoutSession, deleteNotification, deleteAllNotifications, markNotificationAsRead, clearApiGetCache } from '../lib/api';
import { connectCollectiveRealtime } from '../lib/realtime';
import type { RealtimeEvent } from '../lib/realtime';
import type { AppUser, Notification } from '../lib/types';

type RealtimeListener = (event: RealtimeEvent) => void;

interface UserContextValue {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  handleLogout: () => Promise<void>;
  isLoading: boolean;
  notifications: Notification[];
  notificationsLoading: boolean;
  refreshNotifications: () => void;
  dismissNotification: (id: number) => void;
  clearAllNotifications: () => void;
  markAllNotificationsRead: () => void;
  markNotificationsRead: (ids: number[]) => void;
  subscribeRealtime: (listener: RealtimeListener) => () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(() => {
    if (!getAccessToken()) return null;
    const stored = localStorage.getItem('kollekt-user');
    if (!stored) return null;
    try { return JSON.parse(stored) as AppUser; } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(!!getAccessToken());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const realtimeListenersRef = useRef(new Set<RealtimeListener>());
  const latestPresenceEventRef = useRef<RealtimeEvent | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    api.get<AppUser>('/onboarding/me')
      .then((user) => {
        if (cancelled) return;
        setCurrentUserState(user);
        localStorage.setItem('kollekt-user', JSON.stringify(user));
      })
      .catch(() => {
        if (cancelled) return;
        if (!getAccessToken()) {
          setCurrentUserState(null);
          localStorage.removeItem('kollekt-user');
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const notifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifications = useCallback((name: string) => {
    setNotificationsLoading(true);
    api.get<Notification[]>(`/notifications/${encodeURIComponent(name)}`)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setNotificationsLoading(false));
  }, []);

  const fetchNotificationsDebounced = useCallback((name: string) => {
    if (notifDebounceRef.current) clearTimeout(notifDebounceRef.current);
    notifDebounceRef.current = setTimeout(() => fetchNotifications(name), 500);
  }, [fetchNotifications]);

  const subscribeRealtime = useCallback((listener: RealtimeListener) => {
    realtimeListenersRef.current.add(listener);
    if (latestPresenceEventRef.current) {
      try {
        listener(latestPresenceEventRef.current);
      } catch {
        // Keep one subscriber failure from breaking the shared realtime stream.
      }
    }
    return () => {
      realtimeListenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.name) {
      setNotifications([]);
      latestPresenceEventRef.current = null;
      return;
    }
    fetchNotifications(currentUser.name);
  }, [currentUser?.name, fetchNotifications]);

  useEffect(() => {
    if (!currentUser?.name) return;
    const name = currentUser.name;
    const disconnect = connectCollectiveRealtime(name, (event) => {
      if (event.type === 'MEMBER_ONLINE' || event.type === 'MEMBER_OFFLINE') {
        latestPresenceEventRef.current = event;
      }
      if (event.type !== 'MEMBER_ONLINE' && event.type !== 'MEMBER_OFFLINE' && event.type !== 'pong') {
        clearApiGetCache();
      }
      if (event.type === 'NOTIFICATION_CREATED') {
        fetchNotificationsDebounced(name);
      }
      realtimeListenersRef.current.forEach((listener) => {
        try {
          listener(event);
        } catch {
          // Keep one subscriber failure from breaking the shared realtime stream.
        }
      });
    });
    return () => {
      if (notifDebounceRef.current) clearTimeout(notifDebounceRef.current);
      disconnect();
    };
  }, [currentUser?.name, fetchNotificationsDebounced]);

  const setCurrentUser = (user: AppUser | null) => {
    setCurrentUserState(user);
    clearApiGetCache();
    if (user) localStorage.setItem('kollekt-user', JSON.stringify(user));
    else localStorage.removeItem('kollekt-user');
  };

  const handleLogout = async () => {
    await logoutSession();
    setCurrentUserState(null);
    setNotifications([]);
    realtimeListenersRef.current.clear();
    latestPresenceEventRef.current = null;
    clearApiGetCache();
    localStorage.removeItem('kollekt-user');
  };

  const refreshNotifications = useCallback(() => {
    if (currentUser?.name) fetchNotifications(currentUser.name);
  }, [currentUser?.name, fetchNotifications]);

  const dismissNotification = useCallback(async (id: number) => {
    if (!currentUser?.name) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(currentUser.name, id).catch(() => {});
  }, [currentUser?.name]);

  const clearAllNotifications = useCallback(async () => {
    if (!currentUser?.name) return;
    setNotifications([]);
    await deleteAllNotifications(currentUser.name).catch(() => {});
  }, [currentUser?.name]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser?.name) return;
    await api.post(`/notifications/${encodeURIComponent(currentUser.name)}/read`, {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUser?.name]);

  const markNotificationsRead = useCallback(async (ids: number[]) => {
    if (!currentUser?.name || ids.length === 0) return;
    const idSet = new Set(ids);
    setNotifications((prev) => prev.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n)));
    await Promise.allSettled(ids.map((id) => markNotificationAsRead(currentUser.name, id)));
  }, [currentUser?.name]);

  return (
    <UserContext.Provider value={{
      currentUser,
      setCurrentUser,
      handleLogout,
      isLoading,
      notifications,
      notificationsLoading,
      refreshNotifications,
      dismissNotification,
      clearAllNotifications,
      markAllNotificationsRead,
      markNotificationsRead,
      subscribeRealtime,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}

export function useCollectiveRealtime(
  handler: (event: RealtimeEvent) => void,
  enabled = true,
) {
  const { subscribeRealtime } = useUser();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeRealtime((event) => handlerRef.current(event));
  }, [enabled, subscribeRealtime]);
}
