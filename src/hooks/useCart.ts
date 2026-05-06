import { useCallback, useEffect, useState } from "react";

const KEY = "vivo-nbx-cart";

export type CartItem = {
  offerId: string;
  quantity: number;
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const addItem = useCallback((offerId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.offerId === offerId);
      const next = existing
        ? prev.map((i) => (i.offerId === offerId ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { offerId, quantity: 1 }];
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeItem = useCallback((offerId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.offerId !== offerId);
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const updateQuantity = useCallback((offerId: string, quantity: number) => {
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((i) => i.offerId !== offerId)
          : prev.map((i) => (i.offerId === offerId ? { ...i, quantity } : i));
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    persist([]);
  }, []);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clear, totalCount };
}

// Helper to parse "R$ 299,90/mês" -> 299.9
export function parsePrice(price: string): number {
  const match = price.match(/([\d.]+),(\d+)/);
  if (!match) return 0;
  return parseFloat(`${match[1].replace(/\./g, "")}.${match[2]}`);
}

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
