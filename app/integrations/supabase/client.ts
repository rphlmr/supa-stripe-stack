import { createClient } from "@supabase/supabase-js";

import { SupaStripeStackError } from "~/utils";
import {
  SUPABASE_SERVICE_ROLE,
  SUPABASE_URL,
  SUPABASE_ANON_PUBLIC,
} from "~/utils/env";
import { isBrowser } from "~/utils/is-browser";

function getSupabaseClient(supabaseKey: string, accessToken?: string) {
  const global = accessToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    : {};

  return createClient(SUPABASE_URL, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...global,
  });
}

/**
 * Provides a Supabase Client for the logged in user or get back a public and safe client without admin privileges
 *
 * It's a per request scoped client to prevent access token leaking over multiple concurrent requests and from different users.
 *
 * Reason : https://github.com/rphlmr/supa-fly-stack/pull/43#issue-1336412790
 */
function getSupabase(accessToken?: string) {
  return getSupabaseClient(SUPABASE_ANON_PUBLIC, accessToken);
}

/**
 * Provides a Supabase Admin Client with full admin privileges
 *
 * It's a per request scoped client, to prevent access token leaking if you don't use it like `supabaseAdmin().auth.api`.
 *
 * Reason : https://github.com/rphlmr/supa-fly-stack/pull/43#issue-1336412790
 */
function supabaseAdmin() {
  if (isBrowser)
    throw new SupaStripeStackError({
      message:
        "supabaseAdmin is not available in browser and should NOT be used in insecure environments",
    });

  return getSupabaseClient(SUPABASE_SERVICE_ROLE);
}

export { supabaseAdmin, getSupabase };
