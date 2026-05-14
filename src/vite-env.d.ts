/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NBX_GATEWAY_URL?: string;
  readonly VITE_NBX_ACCESS_TOKEN?: string;
  readonly VITE_NBX_LOGIN_USERNAME?: string;
  readonly VITE_NBX_LOGIN_PASSWORD?: string;
  /** GET /api/v1/decision-access/customers/{customerId}/decision */
  readonly VITE_NBX_DECISION_CUSTOMER_ID?: string;
  /** GET /api/v1/decision-access/decisions/{id} para preencher cards com ofertas do motor. */
  readonly VITE_NBX_DECISION_ID?: string;
  /** Base do nbx-simulator (sem barra final). Default no código: http://localhost:8085 */
  readonly VITE_SIMULATOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
