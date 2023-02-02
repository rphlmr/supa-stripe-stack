import { supabaseAdmin } from "~/integrations/supabase";
import { failure, success, SupaStripeStackError } from "~/utils/resolvers";

import { mapAuthSession } from "./mappers";
import type { AuthSession } from "./types";

const tag = "Auth service 🔐";

// For demo purpose, we assert that email is confirmed.
// Note that the user will not be able to sign in until email is confirmed.
export async function createEmailAuthAccount(email: string, password: string) {
  try {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    const { id, created_at } = data.user;

    return success({ id, createdAt: created_at });
  } catch (cause) {
    return failure({
      cause,
      message: `Failed to create user account`,
      metadata: { email },
      tag,
    });
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabaseAdmin().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const { session } = data;

    if (!session) {
      throw new SupaStripeStackError({
        cause: null,
        message:
          "The signed in with email session returned by Supabase is null",
      });
    }

    return success(mapAuthSession(session));
  } catch (cause) {
    return failure({
      cause,
      message: `Failed to sign in with email`,
      metadata: { email },
      tag,
    });
  }
}

export async function deleteAuthAccount(userId: string) {
  try {
    const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    return success({ success: true });
  } catch (cause) {
    return failure({
      cause,
      message: `Failed to delete user account. Please manually delete the user account in the Supabase dashboard.`,
      metadata: { userId },
      tag,
    });
  }
}

export async function refreshAccessToken(refreshToken?: string) {
  if (!refreshToken) {
    return failure({
      cause: "No refresh token provided",
      message: `Failed to refresh access token`,
      tag,
    });
  }

  try {
    const { data, error } = await supabaseAdmin().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) throw error;

    const { session } = data;

    if (!session) {
      throw new SupaStripeStackError({
        cause: null,
        message: "The refreshed session returned by Supabase is null",
      });
    }

    return success(mapAuthSession(session));
  } catch (cause) {
    return failure({
      cause,
      message: `Failed to refresh access token`,
      metadata: { refreshToken },
      tag,
    });
  }
}

export async function verifyAuthSession(
  authSession: AuthSession,
  { skip }: { skip: boolean }
) {
  try {
    if (skip) {
      return success({ success: true });
    }

    const { error } = await supabaseAdmin().auth.getUser(
      authSession.accessToken
    );

    if (error) {
      throw error;
    }

    return success({ success: true });
  } catch (cause) {
    return failure({
      cause,
      message: "Failed to verify auth session",
      metadata: { userId: authSession.userId },
      tag,
    });
  }
}
