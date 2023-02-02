import { Currency } from "@prisma/client";
import { z } from "zod";

import { isBrowser } from "./is-browser";

declare global {
  interface Window {
    env: {
      SUPABASE_URL: string;
      SUPABASE_ANON_PUBLIC: string;
      DEFAULT_CURRENCY: Currency;
    };
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE: string;
      SERVER_URL: string;
      SUPABASE_ANON_PUBLIC: string;
      SESSION_SECRET: string;
      STRIPE_SECRET_KEY: string;
      STRIPE_ENDPOINT_SECRET: string;
      DEFAULT_CURRENCY: Currency;
    }
  }
}

type EnvOptions = {
  isSecret?: boolean;
  isRequired?: boolean;
};
function getEnv(
  name: string,
  { isRequired, isSecret }: EnvOptions = { isSecret: true, isRequired: true }
) {
  if (isBrowser && isSecret) return "";

  const source = (isBrowser ? window.env : process.env) ?? {};

  const value = source[name as keyof typeof source] || "";

  if (!value && isRequired) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

/**
 * Server env
 */
export const SERVER_URL = getEnv("SERVER_URL");
export const SUPABASE_SERVICE_ROLE = getEnv("SUPABASE_SERVICE_ROLE");
export const SESSION_SECRET = getEnv("SESSION_SECRET");
export const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
export const STRIPE_ENDPOINT_SECRET = getEnv("STRIPE_ENDPOINT_SECRET");

/**
 * Shared envs
 */
export const NODE_ENV = getEnv("NODE_ENV", {
  isSecret: false,
  isRequired: false,
});
export const SUPABASE_URL = getEnv("SUPABASE_URL", { isSecret: false });
export const SUPABASE_ANON_PUBLIC = getEnv("SUPABASE_ANON_PUBLIC", {
  isSecret: false,
});
export const DEFAULT_CURRENCY = z
  .nativeEnum(Currency)
  .parse(getEnv("DEFAULT_CURRENCY", { isSecret: false }));

export function getBrowserEnv() {
  return {
    SUPABASE_URL,
    SUPABASE_ANON_PUBLIC,
    DEFAULT_CURRENCY,
  };
}
