import {
  ensureNbxAccessToken,
} from "@/lib/nbx/auth";
import type { MvpInteractionType } from "@/lib/nbx/interactionPolicy";
import { isMvpInteractionType } from "@/lib/nbx/interactionPolicy";

export type { MvpInteractionType };
/** Cliente fixo em homologação (UUID obrigatório pelo MS); todas as interações usam este valor. */
export const NBX_INTERACTION_CUSTOMER_ID = "00000000-0000-0000-0000-000000000002";
/** Canal fixo do e-commerce; não varia pelo `type`. */
export const NBX_INTERACTION_CHANNEL = "ECOMMERCE" as const;

/** @deprecated mesmo valor que {@link NBX_INTERACTION_CUSTOMER_ID} — mantido para imports antigos */
export const NBX_DEFAULT_CUSTOMER_ID = NBX_INTERACTION_CUSTOMER_ID;

export {
  MVP_INTERACTION_TYPES,
  MVP_CART_ABANDONED,
  MVP_CHECKOUT_STARTED,
  MVP_OFFER_VIEWED,
  MVP_PURCHASE_COMPLETED,
  isMvpInteractionType,
} from "@/lib/nbx/interactionPolicy";

export type CreatePartyInteractionBody = {
  direction: string;
  status: string;
  type: MvpInteractionType;
  description?: string;
  interactionDate: string;
  customerId: string;
  channel: string;
  extraFields: Record<string, unknown>;
};

export type NbxGatewayEnv = {
  baseUrl: string;
  accessToken: string;
};

/** Base URL obrigatória; token vem depois via `ensureNbxGatewayEnv()`. */
export function getNbxStaticConfig(): Pick<NbxGatewayEnv, "baseUrl"> | null {
  const baseUrl = (import.meta.env.VITE_NBX_GATEWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

  if (!baseUrl) return null;

  return { baseUrl };
}

/** Monta env com Bearer: `VITE_NBX_ACCESS_TOKEN` ou login automático (sessão). */
export async function ensureNbxGatewayEnv(): Promise<NbxGatewayEnv | null> {
  const base = getNbxStaticConfig();
  if (!base) return null;

  const token = await ensureNbxAccessToken(base.baseUrl);
  if (!token) return null;

  return { ...base, accessToken: token };
}

const DEFAULT_DIRECTION = "INBOUND";
const DEFAULT_STATUS = "OPENED";

export async function sendPartyInteraction(
  params: Omit<CreatePartyInteractionBody, "interactionDate" | "direction" | "status" | "customerId" | "channel" | "extraFields"> & {
    interactionDate?: string;
    /** Opcional — se omitido ou vazio, envia `{}`. */
    extraFields?: Record<string, unknown>;
  },
  env: NbxGatewayEnv,
  correlationId: string,
): Promise<void> {
  if (!isMvpInteractionType(params.type)) {
    if (import.meta.env.DEV) {
      console.warn("[NBX] type inválido para MVP:", params.type);
    }
    return;
  }

  const interactionDate = params.interactionDate ?? new Date().toISOString();

  const body: CreatePartyInteractionBody = {
    direction: DEFAULT_DIRECTION,
    status: DEFAULT_STATUS,
    type: params.type,
    customerId: NBX_INTERACTION_CUSTOMER_ID,
    channel: NBX_INTERACTION_CHANNEL,
    interactionDate,
    extraFields: { ...(params.extraFields ?? {}) },
  };

  if (params.description !== undefined) body.description = params.description;

  try {
    const res = await fetch(`${env.baseUrl}/api/v1/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.accessToken}`,
        "X-Correlation-Id": correlationId,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (import.meta.env.DEV) {
        console.warn(
          `[NBX] interactions ${res.status} ${res.statusText}`,
          text?.slice(0, 500),
        );
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[NBX] interactions request failed", e);
    }
  }
}

/** Resolve token + env e envia (uso típico no front). */
export async function submitPartyInteraction(
  params: Parameters<typeof sendPartyInteraction>[0],
  correlationId: string,
): Promise<void> {
  const env = await ensureNbxGatewayEnv();
  if (!env) return;
  await sendPartyInteraction(params, env, correlationId);
}
