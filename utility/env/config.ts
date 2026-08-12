/**
 * Environment configuration module.
 *
 * Reads environment-specific URLs from `.env` and provides a centralized
 * configuration object. When `APP_ENV` is set to `"development"`, the
 * application uses localhost-based URLs. When unset or set to any other
 * value, production URLs are used as fallback.
 */

type EnvironmentName = "development" | "production";

interface EnvironmentConfig {
  /** Current environment name. */
  env: EnvironmentName;
  /** Whether the application is running in development mode. */
  isDevelopment: boolean;
  /** Base URL of the external authentication service (used for redirects). */
  authServiceUrl: string;
  /** Server-side endpoint used to verify session cookies. */
  authVerifyUrl: string;
  /** The application's own public base URL. */
  appBaseUrl: string;
}

const PRODUCTION_DEFAULTS = {
  authServiceUrl: "https://auth.rezakelidari.ir",
  authVerifyUrl: "http://localhost:3001/api/verify",
  appBaseUrl: "https://pocket.rezakelidari.ir",
} as const;

const DEVELOPMENT_DEFAULTS = {
  authServiceUrl: "http://localhost:3001",
  authVerifyUrl: "http://localhost:3001/api/verify",
  appBaseUrl: "http://localhost:3000",
} as const;

function resolveEnvironment(): EnvironmentName {
  const raw = process.env.APP_ENV?.trim().toLowerCase();
  return raw === "development" ? "development" : "production";
}

function getEnvironmentConfig(): EnvironmentConfig {
  const env = resolveEnvironment();
  const isDevelopment = env === "development";
  const defaults = isDevelopment ? DEVELOPMENT_DEFAULTS : PRODUCTION_DEFAULTS;

  return {
    env,
    isDevelopment,
    authServiceUrl:
      process.env.AUTH_SERVICE_URL?.trim() || defaults.authServiceUrl,
    authVerifyUrl:
      process.env.AUTH_VERIFY_URL?.trim() || defaults.authVerifyUrl,
    appBaseUrl: process.env.APP_BASE_URL?.trim() || defaults.appBaseUrl,
  };
}

export const envConfig = getEnvironmentConfig();
