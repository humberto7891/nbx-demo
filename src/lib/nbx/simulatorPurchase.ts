/** ID fixo esperado pelo nbx-simulator local (400 se diferente). */
export const SIMULATOR_IPHONE_PRODUCT_ID = "off-iphone-17-pro-max";

const DEFAULT_BASE = "http://localhost:8085";

export function getSimulatorBaseUrl(): string {
  const raw = import.meta.env.VITE_SIMULATOR_URL?.trim();
  const base = (raw && raw.length > 0 ? raw : DEFAULT_BASE).replace(/\/$/, "");
  return base;
}

export type SimulateIphonePurchaseResult = {
  ok: boolean;
  status: number;
  /** Preenchido quando `ok` é false. */
  message: string;
};

function buildIphoneSimulatorBody(customerId?: string): string {
  const body: Record<string, string> = { productId: SIMULATOR_IPHONE_PRODUCT_ID };
  const cid = customerId?.trim();
  if (cid) body.customerId = cid;
  return JSON.stringify(body);
}

async function callIphoneSimulator(
  method: "POST" | "DELETE",
  params: {
    /** UUID; omitido ou vazio → default do servidor no simulador */
    customerId?: string;
  } = {},
): Promise<SimulateIphonePurchaseResult> {
  const base = getSimulatorBaseUrl();

  try {
    const res = await fetch(`${base}/api/v1/simulate/purchase/iphone`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: buildIphoneSimulatorBody(params.customerId),
    });

    if (res.ok) return { ok: true, status: res.status, message: "" };

    let message = `${res.status} ${res.statusText}`;
    try {
      const txt = await res.text();
      if (txt) message = txt.slice(0, 280);
    } catch {
      /* ignore */
    }

    return { ok: false, status: res.status, message };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, message: msg };
  }
}

/**
 * POST /api/v1/simulate/purchase/iphone — customer opcional (simulador usa default se vazio).
 */
export async function simulateIphonePurchase(
  params: {
    /** UUID; omitido ou vazio → default 00000000-...0002 no servidor */
    customerId?: string;
  } = {},
): Promise<SimulateIphonePurchaseResult> {
  return callIphoneSimulator("POST", params);
}

/**
 * DELETE /api/v1/simulate/purchase/iphone — desfaz a compra simulada no perfil Customer360 (mesmo body opcional que o POST).
 */
export async function revertSimulatedIphonePurchase(
  params: {
    customerId?: string;
  } = {},
): Promise<SimulateIphonePurchaseResult> {
  return callIphoneSimulator("DELETE", params);
}
