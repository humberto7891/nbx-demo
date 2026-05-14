import type { Offer } from "@/data/offers";
import { ensureNbxGatewayEnv } from "@/lib/nbx/interactions";
import { getOrCreateCorrelationId } from "@/lib/nbx/correlation";

// ---------------------------------------------------------------------------
// Gradient helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types — product catalogue (Endpoint 2)
// ---------------------------------------------------------------------------

export type ProductPrice = {
  id: string;
  name?: string;
  priceType: string;
  amount: number;
  currency: string;
  recurringChargePeriodType?: string;
};

export type ProductOffering = {
  id: string;
  name: string;
  description?: string;
  lifecycleStatus?: string;
  isSellable?: boolean;
  productSpecificationName?: string;
  productSpecificationBrand?: string;
  categoryIds?: string[];
  prices?: ProductPrice[];
};

// ---------------------------------------------------------------------------
// Price formatting
// ---------------------------------------------------------------------------

function formatAmount(amount: number, currency: string): string {
  const cc = /^[A-Z]{3}$/.test(currency) ? currency : "BRL";
  return amount.toLocaleString("pt-BR", { style: "currency", currency: cc });
}

const PERIOD_SUFFIX: Record<string, string> = {
  monthly: "/mês",
  yearly: "/ano",
  quarterly: "/trimestre",
  weekly: "/semana",
  daily: "/dia",
};

function formatProductPrice(prices: ProductPrice[]): string {
  if (prices.length === 0) return "Consulte valores";

  const recurring = prices.filter((p) => p.priceType === "recurring");
  const monthly = recurring.find((p) => p.recurringChargePeriodType === "monthly");
  if (monthly) return `${formatAmount(monthly.amount, monthly.currency)}/mês`;

  if (recurring.length > 0) {
    const r = recurring[0];
    const suffix = r.recurringChargePeriodType
      ? (PERIOD_SUFFIX[r.recurringChargePeriodType] ?? `/${r.recurringChargePeriodType}`)
      : "/mês";
    return `${formatAmount(r.amount, r.currency)}${suffix}`;
  }

  const oneTime = prices.find((p) => p.priceType === "oneTime");
  if (oneTime) return formatAmount(oneTime.amount, oneTime.currency);

  return formatAmount(prices[0].amount, prices[0].currency);
}

/** Fallback formatter when only the decision-level price object is available. */
function formatDecisionPrice(amountRaw: unknown, currencyRaw: unknown): string {
  const currency =
    typeof currencyRaw === "string" && currencyRaw.trim()
      ? currencyRaw.trim().toUpperCase()
      : "BRL";
  const n =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number.parseFloat(amountRaw.replace(",", "."))
        : Number.NaN;
  if (!Number.isFinite(n)) return "Consulte valores";
  return `${formatAmount(n, currency)}/mês`;
}

// ---------------------------------------------------------------------------
// Category inference
// ---------------------------------------------------------------------------

function inferCategory(text: string | undefined): Offer["category"] {
  const t = (text ?? "").toUpperCase();
  if (/(PHONE|HANDSET|DEVICE|CELULAR|SMARTPHONE|GALAXY|IPHONE|MOTO)/.test(t)) return "Smartphone";
  if (/(PLANO|VOICE|TELCOM|MOVEL|MOBILE|SELFIE|FAMILIA)/.test(t)) return "Plano";
  if (/(FIBER|INTERNET|BANDA|FIXA|FIBRA|GIGA)/.test(t)) return "Internet";
  if (/(TV|PLAY|STREAM|VIDEO|GLOBO)/.test(t)) return "TV";
  if (/(AIRPODS|CAPA|ACESSORIO|HEADPHONE|FONE)/.test(t)) return "Acessório";
  return "Serviço";
}

// ---------------------------------------------------------------------------
// Map product-offering → Offer (enriched path)
// ---------------------------------------------------------------------------

function productOfferingToOffer(
  offerId: string,
  product: ProductOffering,
  fallbackPrice?: { amount: number; currency: string },
  /** Slug catálogo vindo da linha da decisão (ex.: product_id NBX). */
  catalogSlugFromDecision?: string,
): Offer {
  const brand = product.productSpecificationBrand;
  const specName = product.productSpecificationName;
  const subtitle = brand && brand !== product.name ? brand : (specName ?? "NBX Gateway");

  const prices = product.prices ?? [];
  const priceStr =
    prices.length > 0
      ? formatProductPrice(prices)
      : fallbackPrice
        ? formatDecisionPrice(fallbackPrice.amount, fallbackPrice.currency)
        : "Consulte valores";

  const highlights: string[] = [];
  if (specName && specName !== product.name) highlights.push(specName);
  if (brand) highlights.push(`Marca: ${brand}`);
  for (const p of prices.slice(1)) {
    if (p.name) highlights.push(`${p.name}: ${formatAmount(p.amount, p.currency)}`);
  }
  if (highlights.length === 0) highlights.push("Oferta NBX");

  const categoryHint = `${product.name} ${specName ?? ""} ${brand ?? ""}`;
  const slug = catalogSlugFromDecision?.trim();

  return {
    id: offerId,
    title: product.name,
    subtitle,
    category: inferCategory(categoryHint),
    ...(slug ? { catalogProductId: slug } : {}),
    price: priceStr,
    gradient: gradientForId(offerId),
    description: product.description ?? "Oferta retornada pelo motor NBX.",
    highlights,
  };
}

// ---------------------------------------------------------------------------
// Map raw decision offer → Offer (fallback when no productId / product not found)
// ---------------------------------------------------------------------------

function slugFromDecisionOfferDict(raw: Record<string, unknown>): string {
  const camel = typeof raw.productId === "string" ? raw.productId.trim() : "";
  if (camel) return camel;
  const snake = typeof raw.product_id === "string" ? raw.product_id.trim() : "";
  return snake;
}

export function gatewayJsonOfferToOffer(raw: Record<string, unknown>): Offer | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  const nameRaw = typeof raw.name === "string" ? raw.name : "";
  const catalogSlug = slugFromDecisionOfferDict(raw);

  const displayName = nameRaw.trim() || catalogSlug.trim();
  if (!id || !displayName) return null;

  const type = typeof raw.type === "string" ? raw.type : "";
  let priceAmount: unknown;
  let priceCurrency: unknown;
  if (raw.price && typeof raw.price === "object" && raw.price !== null) {
    const p = raw.price as Record<string, unknown>;
    priceAmount = p.amount ?? p.value;
    priceCurrency = p.currency;
  }

  const title = nameRaw.trim() || catalogSlug;
  const categoryHint = type || catalogSlug || title;

  const offer: Offer = {
    id,
    title,
    subtitle: type || catalogSlug || "NBX Gateway",
    category: inferCategory(categoryHint),
    ...(catalogSlug ? { catalogProductId: catalogSlug } : {}),
    price: formatDecisionPrice(priceAmount, priceCurrency),
    gradient: gradientForId(id),
    description:
      typeof raw.description === "string" ? raw.description : "Oferta retornada pelo motor NBX.",
    highlights: [`Tipo: ${type || "campanha"}`],
  };
  return offer;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Raw proto response types
//
// proto3 JsonFormat rules that affect these shapes:
//   • bool default (false) is OMITTED → treat absence as false
//   • int64 is serialised as STRING → parse with parseInt
//   • optional scalar absent when null/zero/empty
// ---------------------------------------------------------------------------

type RawOfferPrice = {
  amount?: number;
  currency?: string;
};

/** Single offer inside a recommendedAction. */
type RawDecisionOffer = {
  /** Id da oferta recomendada — usado para GET product-offerings (não `productId`). */
  id?: string;
  name?: string;
  /** "PRODUCT" or similar. */
  type?: string;
  /** Catálogo: slug opcional camelCase proto; `product_id` (snake) é mesclado no parse. */
  productId?: string;
  product_id?: string;
  price?: RawOfferPrice;
};

/** Single recommended action (campaign). */
type RawDecisionAction = {
  campaignId?: string;
  campaign_id?: string;
  rank?: number;
  /** Absent when 0 (proto default). */
  score?: number;
  /** Absent when empty string (proto default). */
  channel?: string;
  /** Empty array when campaign has no offers. */
  offers?: RawDecisionOffer[];
  reasonWhy?: { summary?: string };
};

type RawDecisionMetadata = {
  /** int64 → serialised as string by proto JsonFormat to avoid JS precision loss. */
  decisionAgeMs?: string;
  decision_age_ms?: string;
  evaluatedCampaigns?: number;
  evaluated_campaigns?: number;
  eligibleCampaigns?: number;
  eligible_campaigns?: number;
};

/**
 * Root response from GET /customers/{id}/decision.
 * Fields marked as omittable are absent when they hold the proto3 default value.
 */
type RawDecisionResponse = {
  decisionId?: string;
  decision_id?: string;
  requestId?: string;
  request_id?: string;
  customerId?: string;
  customer_id?: string;
  /** Absent when no interaction triggered this decision. */
  interactionId?: string;
  interaction_id?: string;
  decidedAt?: string;
  decided_at?: string;
  /**
   * Omitted by JsonFormat when false (proto3 bool default).
   * Treat absence as false.
   */
  degraded?: true;
  /** Only present when degraded === true. */
  degradedReason?: string;
  degraded_reason?: string;
  metadata?: RawDecisionMetadata;
  /** Empty array when no campaign was eligible for the customer. */
  recommendedActions?: RawDecisionAction[];
};

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export type ParsedDecisionOffers = {
  /** Offer IDs in rank order (server ordering is preserved). */
  orderedOfferIds: string[];
  offeredById: Record<string, Offer>;
  /** false when the field is absent (proto omits the bool default). */
  degraded: boolean;
  degradedReason?: string;
  decisionId?: string;
  /** Age of the cached decision in milliseconds (parsed from the proto string). */
  decisionAgeMs?: number;
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchDecisionByPath(path: string): Promise<unknown | null> {
  const env = await ensureNbxGatewayEnv();
  if (!env) return null;

  try {
    const res = await fetch(`${env.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${env.accessToken}`,
        Accept: "application/json",
        "X-Correlation-Id": getOrCreateCorrelationId(),
        "X-Request-Id": crypto.randomUUID(),
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (import.meta.env.DEV) console.warn("[NBX] decisão HTTP", res.status, txt.slice(0, 400));
      return null;
    }

    return await res.json();
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[NBX] decisão fetch falhou", e);
    return null;
  }
}

/**
 * GET /api/v1/decision-access/product-offerings?ids=uuid1&ids=uuid2&...
 * `ids` são os identificadores de **product offering** (id da oferta na decisão), não productId.
 * Returns empty array on any failure so the caller can degrade gracefully.
 */
async function fetchProductOfferings(offeringIds: string[]): Promise<ProductOffering[]> {
  if (offeringIds.length === 0) return [];

  const env = await ensureNbxGatewayEnv();
  if (!env) return [];

  const qs = offeringIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");

  try {
    const res = await fetch(
      `${env.baseUrl}/api/v1/decision-access/product-offerings?${qs}`,
      {
        headers: {
          Authorization: `Bearer ${env.accessToken}`,
          Accept: "application/json",
          "X-Correlation-Id": getOrCreateCorrelationId(),
          "X-Request-Id": crypto.randomUUID(),
        },
      },
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (import.meta.env.DEV)
        console.warn("[NBX] product-offerings HTTP", res.status, txt.slice(0, 400));
      return [];
    }

    const json: unknown = await res.json();
    const root = asRecord(json);
    if (!root || !Array.isArray(root.items)) return [];
    return root.items as ProductOffering[];
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[NBX] product-offerings fetch falhou", e);
    return [];
  }
}

function slugFromNormalizedDecisionOffer(off: RawDecisionOffer): string {
  const a = typeof off.productId === "string" ? off.productId.trim() : "";
  if (a) return a;
  const b = typeof off.product_id === "string" ? off.product_id.trim() : "";
  return b;
}

function normalizeRecommendedOffer(off: unknown): RawDecisionOffer {
  if (!off || typeof off !== "object") return {};
  const o = off as Record<string, unknown>;
  const camel = typeof o.productId === "string" ? o.productId.trim() : "";
  const snake = typeof o.product_id === "string" ? o.product_id.trim() : "";
  const productIdMerged = camel || snake || undefined;
  let priceTyped: RawOfferPrice | undefined;
  if (o.price && typeof o.price === "object" && o.price !== null)
    priceTyped = o.price as RawOfferPrice;
  const out: RawDecisionOffer = {
    id: typeof o.id === "string" ? o.id : undefined,
    name: typeof o.name === "string" ? o.name : undefined,
    type: typeof o.type === "string" ? o.type : undefined,
    price: priceTyped,
    ...(productIdMerged ? { productId: productIdMerged } : {}),
  };
  return out;
}

function normalizeRecommendedActionsForParse(actions: unknown): RawDecisionAction[] {
  if (!Array.isArray(actions)) return [];
  return actions.map((entry): RawDecisionAction => {
    if (!entry || typeof entry !== "object") return {};
    const a = entry as Record<string, unknown>;
    const rawOffers = a.offers;
    const campaignId =
      typeof a.campaignId === "string"
        ? a.campaignId
        : typeof a.campaign_id === "string"
          ? a.campaign_id
          : undefined;
    const offers = Array.isArray(rawOffers)
      ? rawOffers.map((x) => normalizeRecommendedOffer(x))
      : undefined;
    return {
      rank: typeof a.rank === "number" ? a.rank : undefined,
      score: typeof a.score === "number" ? a.score : undefined,
      channel: typeof a.channel === "string" ? a.channel : undefined,
      campaignId,
      ...(Array.isArray(offers) ? { offers } : {}),
      reasonWhy:
        typeof a.reasonWhy === "object" && a.reasonWhy !== null && !Array.isArray(a.reasonWhy)
          ? (a.reasonWhy as RawDecisionAction["reasonWhy"])
          : undefined,
    };
  });
}

/**
 * Una envelope JsonFormat camelCase + JSON snake_case (ex.: `recommended_actions`).
 * Retorno usa campos esperados pelo parse (`recommendedActions`, `decisionId`, etc.).
 */
function coerceDecisionEnvelope(payload: unknown): RawDecisionResponse {
  const empty: RawDecisionResponse = {};
  if (payload === null || typeof payload !== "object") return empty;
  const r = payload as Record<string, unknown>;

  const mdRaw =
    typeof r.metadata === "object" && r.metadata !== null
      ? (r.metadata as Record<string, unknown>)
      : undefined;
  let metaOut: RawDecisionMetadata | undefined;
  if (mdRaw) {
    const ageMs =
      typeof mdRaw.decisionAgeMs === "string"
        ? mdRaw.decisionAgeMs
        : typeof mdRaw.decision_age_ms === "string"
          ? mdRaw.decision_age_ms
          : undefined;
    metaOut = {
      ...(ageMs ? { decisionAgeMs: ageMs } : {}),
      ...(typeof mdRaw.evaluatedCampaigns === "number"
        ? { evaluatedCampaigns: mdRaw.evaluatedCampaigns }
        : typeof mdRaw.evaluated_campaigns === "number"
          ? { evaluatedCampaigns: mdRaw.evaluated_campaigns }
          : {}),
      ...(typeof mdRaw.eligibleCampaigns === "number"
        ? { eligibleCampaigns: mdRaw.eligibleCampaigns }
        : typeof mdRaw.eligible_campaigns === "number"
          ? { eligibleCampaigns: mdRaw.eligible_campaigns }
          : {}),
    };
  }

  const raSrc = r.recommendedActions ?? r.recommended_actions;
  const normalizedActions =
    raSrc !== undefined ? normalizeRecommendedActionsForParse(raSrc) : undefined;

  const out: RawDecisionResponse = {
    decisionId:
      typeof r.decisionId === "string"
        ? r.decisionId
        : typeof r.decision_id === "string"
          ? r.decision_id
          : undefined,
    requestId:
      typeof r.requestId === "string"
        ? r.requestId
        : typeof r.request_id === "string"
          ? r.request_id
          : undefined,
    customerId:
      typeof r.customerId === "string"
        ? r.customerId
        : typeof r.customer_id === "string"
          ? r.customer_id
          : undefined,
    interactionId:
      typeof r.interactionId === "string"
        ? r.interactionId
        : typeof r.interaction_id === "string"
          ? r.interaction_id
          : undefined,
    decidedAt:
      typeof r.decidedAt === "string"
        ? r.decidedAt
        : typeof r.decided_at === "string"
          ? r.decided_at
          : undefined,
    ...(r.degraded === true ? ({ degraded: true } as RawDecisionResponse) : {}),
    degradedReason:
      typeof r.degradedReason === "string"
        ? r.degradedReason
        : typeof r.degraded_reason === "string"
          ? r.degraded_reason
          : undefined,
    ...(metaOut && Object.keys(metaOut).length > 0 ? { metadata: metaOut } : {}),
    ...(normalizedActions !== undefined ? { recommendedActions: normalizedActions } : {}),
  };
  return out;
}

// ---------------------------------------------------------------------------
// Parse — accepts an optional product map for enrichment
// ---------------------------------------------------------------------------

export function parseDecisionOffers(
  payload: unknown,
  /** Mapa id da oferta (decision offer id) → detalhe do catálogo `product-offerings`. */
  offeringsByOfferId: Map<string, ProductOffering> = new Map(),
): ParsedDecisionOffers {
  const out: ParsedDecisionOffers = {
    orderedOfferIds: [],
    offeredById: {},
    degraded: false,
  };

  const root = coerceDecisionEnvelope(payload);

  // proto omits `degraded` when false — absence means false.
  out.degraded = root.degraded === true;
  if (root.degradedReason) out.degradedReason = root.degradedReason;
  if (root.decisionId) out.decisionId = root.decisionId;

  const ageMsStr = root.metadata?.decisionAgeMs;
  if (ageMsStr) {
    const ms = parseInt(ageMsStr, 10);
    if (Number.isFinite(ms)) out.decisionAgeMs = ms;
  }

  const actions = root.recommendedActions;
  if (!Array.isArray(actions) || actions.length === 0) return out;

  // Server guarantees rank-ASC ordering — preserve it.
  const seenIds = new Set<string>();

  for (const action of actions) {
    const offers = action.offers;
    if (!Array.isArray(offers) || offers.length === 0) continue;

    for (const offer of offers) {
      const offerId = offer.id ?? "";
      if (!offerId) continue;

      const product = offeringsByOfferId.get(offerId);
      const slugDecision = slugFromNormalizedDecisionOffer(offer);

      let mapped: Offer | null;

      if (product) {
        const fallbackPrice =
          typeof offer.price?.amount === "number"
            ? { amount: offer.price.amount, currency: offer.price.currency ?? "BRL" }
            : undefined;
        mapped = productOfferingToOffer(
          offerId,
          product,
          fallbackPrice,
          slugDecision || undefined,
        );
      } else {
        mapped = gatewayJsonOfferToOffer(offer as unknown as Record<string, unknown>);
      }

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

// ---------------------------------------------------------------------------
// Public orchestrators
// ---------------------------------------------------------------------------

/**
 * Two-step flow:
 *   1. GET /customers/{customerId}/decision
 *   2. GET /product-offerings?ids=... (ids = `offer.id` de cada oferta recomendada, não `productId`)
 *
 * Returns null when the decision itself is unavailable (404 / network error).
 * Product-offering failures degrade gracefully — offers are still shown using
 * the price data embedded in the decision response.
 */
export async function fetchAndBuildDecisionOffers(
  customerId: string,
): Promise<ParsedDecisionOffers | null> {
  const decisionRaw = await fetchDecisionPayloadByCustomerId(customerId);
  if (!decisionRaw) return null;

  const envelope = coerceDecisionEnvelope(decisionRaw);
  const actions = envelope.recommendedActions ?? [];

  const offeringIds = [
    ...new Set(
      actions
        .flatMap((a) => a.offers ?? [])
        .map((o) => {
          const id = typeof o.id === "string" ? o.id.trim() : "";
          return id || null;
        })
        .filter((id): id is string => id !== null),
    ),
  ];

  const offerings = await fetchProductOfferings(offeringIds);
  const offeringsByOfferId = new Map<string, ProductOffering>(offerings.map((p) => [p.id, p]));

  if (import.meta.env.DEV) {
    console.info(
      `[NBX] decisão carregada — ${offeringIds.length} offer id(s) → ${offerings.length} product-offering(s) resolvido(s)`,
    );
  }

  return parseDecisionOffers(decisionRaw, offeringsByOfferId);
}

/** GET /api/v1/decision-access/customers/{customerId}/decision */
export async function fetchDecisionPayloadByCustomerId(
  customerId: string,
): Promise<unknown | null> {
  return fetchDecisionByPath(
    `/api/v1/decision-access/customers/${encodeURIComponent(customerId)}/decision`,
  );
}

/** @deprecated use fetchAndBuildDecisionOffers. */
export async function fetchDecisionPayload(decisionId: string): Promise<unknown | null> {
  return fetchDecisionByPath(
    `/api/v1/decision-access/decisions/${encodeURIComponent(decisionId)}`,
  );
}
