import type { Offer } from "@/data/offers";
import { ensureNbxGatewayEnv } from "@/lib/nbx/interactions";
import { getOrCreateCorrelationId } from "@/lib/nbx/correlation";

const GRADIENTS = [
  "from-purple-700 to-fuchsia-500",
  "from-violet-600 to-purple-400",
  "from-fuchsia-600 to-purple-500",
  "from-purple-600 to-pink-500",
  "from-purple-500 to-violet-400",
];

function gradientForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function formatPriceLine(amountRaw: unknown, currencyRaw: unknown): string {
  const currency = typeof currencyRaw === "string" && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : "BRL";
  const n = typeof amountRaw === "string" ? Number.parseFloat(amountRaw.replace(",", ".")) : Number.NaN;
  if (!Number.isFinite(n)) return "Consulte valores";
  const cc = /^[A-Z]{3}$/.test(currency) ? currency : "BRL";
  return n.toLocaleString("pt-BR", { style: "currency", currency: cc }) + "/mês";
}

function inferCategory(apiType: string | undefined): Offer["category"] {
  const t = (apiType ?? "").toUpperCase();
  if (/(PHONE|HANDSET|DEVICE|CELULAR)/.test(t)) return "Smartphone";
  if (/(PLANO|VOICE|TELCOM|MOVEL)/.test(t)) return "Plano";
  if (/(FIBER|INTERNET|BANDA|FIXA)/.test(t)) return "Internet";
  if (/(TV|PLAY|STREAM|VIDEO)/.test(t)) return "TV";
  if (/(BUNDLE|COMBO|PACOTE)/.test(t)) return "Serviço";
  return "Serviço";
}

export function gatewayJsonOfferToOffer(raw: Record<string, unknown>): Offer | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!id || !name) return null;

  const type = typeof raw.type === "string" ? raw.type : "";
  let priceAmount: unknown;
  let priceCurrency: unknown;
  if (raw.price && typeof raw.price === "object" && raw.price !== null) {
    const p = raw.price as Record<string, unknown>;
    priceAmount = p.amount ?? p.value;
    priceCurrency = p.currency;
  }

  return {
    id,
    title: name,
    subtitle: type || "NBX Gateway",
    category: inferCategory(type),
    price: formatPriceLine(priceAmount, priceCurrency),
    gradient: gradientForId(id),
    description:
      typeof raw.description === "string"
        ? raw.description
        : "Oferta retornada pelo motor NBX.",
    highlights: [`Tipo: ${type || "campanha"}`],
  };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export type ParsedDecisionOffers = {
  /** Ordem recomendada (rank → ofertas). */
  orderedOfferIds: string[];
  offeredById: Record<string, Offer>;
  degraded: boolean;
  degradedReason?: string;
  decisionId?: string;
};

async function fetchDecisionByPath(path: string): Promise<unknown | null> {
  const env = await ensureNbxGatewayEnv();
  if (!env) return null;

  try {
    const res = await fetch(`${env.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${env.accessToken}`,
        Accept: "application/json",
        "X-Correlation-Id": getOrCreateCorrelationId(),
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (import.meta.env.DEV)
        console.warn("[NBX] decisão HTTP", res.status, txt.slice(0, 400));
      return null;
    }

    return await res.json();
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[NBX] decisão fetch falhou", e);
    return null;
  }
}

/** GET /api/v1/decision-access/customers/{customerId}/decision */
export async function fetchDecisionPayloadByCustomerId(
  customerId: string,
): Promise<unknown | null> {
  return fetchDecisionByPath(
    `/api/v1/decision-access/customers/${encodeURIComponent(customerId)}/decision`,
  );
}

/** @deprecated compatibilidade com endpoint antigo por decisionId. */
export async function fetchDecisionPayload(decisionId: string): Promise<unknown | null> {
  return fetchDecisionByPath(
    `/api/v1/decision-access/decisions/${encodeURIComponent(decisionId)}`,
  );
}

export function parseDecisionOffers(payload: unknown): ParsedDecisionOffers {
  const out: ParsedDecisionOffers = {
    orderedOfferIds: [],
    offeredById: {},
    degraded: false,
  };

  const root = asRecord(payload);
  if (!root) return out;

  if (typeof root.degraded === "boolean") out.degraded = root.degraded;
  if (typeof root.degradedReason === "string") out.degradedReason = root.degradedReason;
  if (typeof root.decisionId === "string") out.decisionId = root.decisionId;

  const actions = root.recommendedActions;
  if (!Array.isArray(actions)) return out;

  const ranked = [...actions]
    .map((a) => asRecord(a))
    .filter((a): a is Record<string, unknown> => a !== null)
    .sort((a, b) => {
      const ra = typeof a.rank === "number" ? a.rank : 999;
      const rb = typeof b.rank === "number" ? b.rank : 999;
      return ra - rb;
    });

  const seenIds = new Set<string>();

  for (const action of ranked) {
    const offers = action.offers;
    if (!Array.isArray(offers)) continue;

    for (const o of offers) {
      const rec = asRecord(o);
      if (!rec) continue;
      const mapped = gatewayJsonOfferToOffer(rec);
      if (!mapped) continue;
      out.offeredById[mapped.id] = mapped;
      if (!seenIds.has(mapped.id)) {
        seenIds.add(mapped.id);
        out.orderedOfferIds.push(mapped.id);
      }
    }
  }

  return out;
}
