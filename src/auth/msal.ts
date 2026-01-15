// src/auth/msal.ts
import { LogLevel, type Configuration, PublicClientApplication } from "@azure/msal-browser";

/** ✅ Dominio permitido (sin @) */
export const ALLOWED_DOMAIN =
  (import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined)?.trim() || "covasachile.cl";

/** ✅ Variables (usa tus nombres actuales del .env) */
const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined)?.trim() || "";
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined)?.trim() || "";
const redirectUri =
  (import.meta.env.VITE_AZURE_REDIRECT_URI as string | undefined)?.trim() || window.location.origin;

/** ✅ Scopes base */
export const LOGIN_SCOPES: string[] = ["openid", "profile", "email", "User.Read"];
export const loginRequest = { scopes: LOGIN_SCOPES } as const;

/** Logs de ayuda (no rompen prod) */
if (!clientId) console.warn("Falta VITE_AZURE_CLIENT_ID en .env");
if (!tenantId) console.warn("Falta VITE_AZURE_TENANT_ID en .env");
if (!redirectUri) console.warn("Falta VITE_AZURE_REDIRECT_URI en .env");

/** ✅ Config MSAL */
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId || "organizations"}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false,
      loggerCallback: (level, message) => {
        if (level >= LogLevel.Warning) console.warn("[MSAL]", message);
      },
    },
  },
};

/** ✅ Instancia única para toda la app */
export const msal = new PublicClientApplication(msalConfig);
