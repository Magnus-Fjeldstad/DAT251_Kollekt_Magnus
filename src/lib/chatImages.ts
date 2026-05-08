import { useEffect, useState } from 'react';
import { API_BASE, getAccessToken } from './api';

const blobUrlCache = new Map<number, string>();
const inflightFetches = new Map<number, Promise<string>>();

async function loadChatImage(messageId: number): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}/image`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(messageId, url);
  return url;
}

export function useChatImage(messageId: number | null): string | null {
  const [src, setSrc] = useState<string | null>(() =>
    messageId != null ? (blobUrlCache.get(messageId) ?? null) : null,
  );

  useEffect(() => {
    if (messageId == null) {
      setSrc(null);
      return;
    }
    const cached = blobUrlCache.get(messageId);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    let promise = inflightFetches.get(messageId);
    if (!promise) {
      promise = loadChatImage(messageId).finally(() => {
        inflightFetches.delete(messageId);
      });
      inflightFetches.set(messageId, promise);
    }
    promise
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  return src;
}
