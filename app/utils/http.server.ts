import { Currency } from "@prisma/client";
import type { ResponseInit } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import countryToCurrency from "country-to-currency";
import { getClientLocales } from "remix-utils";
import { z } from "zod";

import { DEFAULT_CURRENCY } from "./env";
import { Logger } from "./logger";
import type { FailureReason } from "./resolvers";

export function getCurrentPath(request: Request) {
  return new URL(request.url).pathname;
}

export function makeRedirectToFromHere(request: Request) {
  return new URLSearchParams([["redirectTo", getCurrentPath(request)]]);
}

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param to The redirect destination
 * @param defaultRedirect The redirect to use if the `to` is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect = "/"
) {
  if (
    !to ||
    typeof to !== "string" ||
    !to.startsWith("/") ||
    to.startsWith("//")
  ) {
    return defaultRedirect;
  }

  return to;
}

export function getDefaultCurrency(request: Request) {
  const locales = getClientLocales(request);

  if (!locales) return DEFAULT_CURRENCY;

  const country = locales[0].split("-")[0] as keyof typeof countryToCurrency;

  const foundCurrency = z
    .nativeEnum(Currency)
    .safeParse(countryToCurrency[country]?.toLowerCase());

  if (!foundCurrency.success) return DEFAULT_CURRENCY;

  return foundCurrency.data;
}

function makeOptions({ authSession, ...options }: ResponseOptions) {
  const headers = new Headers(options.headers);

  if (authSession) {
    headers.append("Set-Cookie", authSession.cookie);
  }

  return { ...options, headers };
}

export type SessionWithCookie<T = unknown> = T & {
  cookie: string;
};

type ResponseOptions = ResponseInit & { authSession: SessionWithCookie | null };

function makePublicError({ message, metadata, traceId }: FailureReason) {
  return { message, metadata, traceId };
}

/**
 * This is a tiny helper to normalize `json` responses.
 *
 * It also forces us to provide `{ authSession }` (or `{ authSession: null }` for unprotected routes) as second argument to not forget to handle it.
 *
 * It can be cumbersome to type, but it's worth it to avoid forgetting to handle authSession.
 */
export const response = {
  ok: <T>(data: T, options: ResponseOptions) =>
    json(
      { data, error: null },
      {
        ...makeOptions(options),
        status: 200,
      }
    ),
  serverError: (reason: FailureReason, options: ResponseOptions) => {
    Logger.error(reason);

    return json(
      { data: null, error: makePublicError(reason) },
      {
        ...makeOptions(options),
        status: 500,
      }
    );
  },
  badRequest: (reason: FailureReason, options: ResponseOptions) => {
    Logger.error(reason);

    return json(
      { data: null, error: makePublicError(reason) },
      {
        ...makeOptions(options),
        status: 400,
      }
    );
  },
  redirect: (url: string, options: ResponseOptions) =>
    redirect(url, {
      ...makeOptions(options),
    }),
};
