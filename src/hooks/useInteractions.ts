import { useCallback, useEffect, useState } from "react";

const KEY = "vivo-nbx-interactions";

export function useInteractions() {
  const [interactions, setInteractions] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setInteractions(JSON.parse(raw));
    } catch {}
  }, []);

  const trackView = useCallback((offerId: string) => {
    setInteractions((prev) => {
      const next = [...prev.filter((id) => id !== offerId), offerId].slice(-10);
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setInteractions([]);
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  }, []);

  return { interactions, trackView, reset };
}
