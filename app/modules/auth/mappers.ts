import type { SupabaseAuthSession } from "~/integrations/supabase";
import { SupaStripeStackError } from "~/utils";

import type { AuthSession } from "./types";

export function mapAuthSession(
	supabaseAuthSession: SupabaseAuthSession,
): AuthSession {
	if (!supabaseAuthSession.user?.email) {
		throw new SupaStripeStackError({
			message:
				"User should have an email. Should not happen because we use email auth.",
			metadata: {
				userId: supabaseAuthSession.user.id,
			},
			tag: "Auth mappers 🔐",
		});
	}

	return {
		accessToken: supabaseAuthSession.access_token,
		refreshToken: supabaseAuthSession.refresh_token,
		userId: supabaseAuthSession.user.id,
		email: supabaseAuthSession.user.email,
		expiresIn: supabaseAuthSession.expires_in ?? -1,
		expiresAt: supabaseAuthSession.expires_at ?? -1,
	};
}
