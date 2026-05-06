/**
 * POST /api/v1/auth/login (proxy via gateway). Sem Bearer.
 * Credenciais padrão do demo: nbx / nbx (sobrescrevível por env).
 */

const STORAGE_TOKEN = "vivo-nbx-auth-access-token";
const STORAGE_EXPIRY = "vivo-nbx-auth-access-expiry";

type LoginPayload = Record<string, unknown>;

let loginInFlight: Promise<string | null> | null = null;

export function clearStoredAuthToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_EXPIRY);
  } catch {
    /* ignore */
  }
}

function getStoredTokenIfValid(): string | null {
  try {
    const token = sessionStorage.getItem(STORAGE_TOKEN);
    const expRaw = sessionStorage.getItem(STORAGE_EXPIRY);
    if (!token) return null;
    if (!expRaw) return token;
    const exp = parseInt(expRaw, 10);
    if (Number.isFinite(exp) && Date.now() > exp - 5000) {
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_EXPIRY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function storeToken(accessToken: string, expiresInSec?: number) {
  try {
    sessionStorage.setItem(STORAGE_TOKEN, accessToken);
    if (expiresInSec != null && Number.isFinite(expiresInSec)) {
      sessionStorage.setItem(STORAGE_EXPIRY, String(Date.now() + expiresInSec * 1000));
    } else {
      sessionStorage.removeItem(STORAGE_EXPIRY);
    }
  } catch {
    /* ignore */
  }
}

function pickString(obj: unknown, keys: string[]): string | null {
  if (obj === null || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/** Extrai access_token de formatos comuns (nbx-auth / OAuth2-style / wrapper data). */
export function extractAccessTokenFromLoginResponse(data: unknown): {
  token: string;
  expiresInSec?: number;
} | null {
  if (data === null || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;

  const direct =
    pickString(root, ["access_token", "accessToken", "token", "id_token", "idToken"]) ??
    (root.data != null && typeof root.data === "object"
      ? pickString(root.data as Record<string, unknown>, [
          "access_token",
          "accessToken",
          "token",
        ])
      : null);

  if (!direct) return null;

  let expiresInSec: number | undefined;
  const exp =
    (typeof root.expires_in === "number" && root.expires_in) ||
    (typeof root.expiresIn === "number" && root.expiresIn);
  if (typeof exp === "number" && exp > 0) expiresInSec = exp;

  return { token: direct, expiresInSec };
}

function defaultCredentials() {
  return {
    username:
      ((import.meta.env.VITE_NBX_LOGIN_USERNAME as string | undefined)?.trim() || "nbx") as string,
    password:
      ((import.meta.env.VITE_NBX_LOGIN_PASSWORD as string | undefined)?.trim() || "nbx") as string,
  };
}

async function postLogin(baseUrl: string, body: LoginPayload): Promise<Response | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[NBX] auth/login request failed", e);
    return null;
  }
}

/**
 * Obtém Bearer: token em sessão válido ou novo login automático (nbx/nbx).
 */
export async function ensureNbxAccessToken(baseUrl: string): Promise<string | null> {
  const manual = (import.meta.env.VITE_NBX_ACCESS_TOKEN as string | undefined)?.trim();
  if (manual) return manual;

  const cached = getStoredTokenIfValid();
  if (cached) return cached;

  if (!loginInFlight) {
    loginInFlight = (async (): Promise<string | null> => {
      const normalized = baseUrl.replace(/\/$/, "");
      const { username, password } = defaultCredentials();

      let res = await postLogin(normalized, { username, password });
      if ((!res || !res.ok) && username) {
        res = await postLogin(normalized, { user: username, password });
      }

      if (!res || !res.ok) {
        const text = await res?.text().catch(() => "");
        if (import.meta.env.DEV) {
          console.warn("[NBX] login failed", res?.status, text?.slice(0, 400));
        }
        return null;
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        if (import.meta.env.DEV) console.warn("[NBX] login: response não é JSON");
        return null;
      }

      const parsed = extractAccessTokenFromLoginResponse(data);
      if (!parsed) {
        if (import.meta.env.DEV) console.warn("[NBX] login: não foi possível obter access_token no JSON");
        return null;
      }

      storeToken(parsed.token, parsed.expiresInSec);
      return parsed.token;
    })().finally(() => {
      loginInFlight = null;
    });
  }

  return loginInFlight;
}
