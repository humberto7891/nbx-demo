/**
 * Tipos MVP (`interaction_types_mvp` em features.yaml). É o ÚNICO conjunto permitido
 * no campo `type` do POST /api/v1/interactions — não introduzir outros valores.
 */
export const MVP_INTERACTION_TYPES = [
  "offer_viewed",
  "cart_abandoned",
  "checkout_started",
  "purchase_completed",
] as const;

export type MvpInteractionType = (typeof MVP_INTERACTION_TYPES)[number];

export const MVP_OFFER_VIEWED: MvpInteractionType = "offer_viewed";

export const MVP_CART_ABANDONED: MvpInteractionType = "cart_abandoned";

export const MVP_CHECKOUT_STARTED: MvpInteractionType = "checkout_started";

export const MVP_PURCHASE_COMPLETED: MvpInteractionType = "purchase_completed";

export function isMvpInteractionType(value: unknown): value is MvpInteractionType {
  return typeof value === "string" && (MVP_INTERACTION_TYPES as readonly string[]).includes(value);
}
