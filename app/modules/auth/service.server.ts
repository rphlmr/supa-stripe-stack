import { supabaseAdmin } from "~/integrations/supabase";
import { Logger, SupaStripeStackError } from "~/utils";

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

		return { id, createdAt: created_at };
	} catch (cause) {
		throw new SupaStripeStackError({
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
				message:
					"The signed in with email session returned by Supabase is null",
			});
		}

		return mapAuthSession(session);
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: `Failed to sign in with email`,
			metadata: { email },
			tag,
		});
	}
}

async function getUserByEmail(email: string) {
	try {
		const { data, error } = await supabaseAdmin().auth.admin.listUsers();

		if (error) {
			throw error;
		}

		const user = data.users.find((user) => user.email === email);

		if (!user) {
			throw new SupaStripeStackError({
				message: `No user found with email`,
			});
		}

		return user;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: `Failed to get user by email`,
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
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: `Failed to delete user account. Please manually delete the user account in the Supabase dashboard.`,
			metadata: { userId },
			tag,
		});
	}
}

export async function deleteAuthAccountByEmail(email: string) {
	try {
		const { id } = await getUserByEmail(email);

		await deleteAuthAccount(id);
	} catch (cause) {
		Logger.error(
			new SupaStripeStackError({
				cause,
				message: `Failed to delete user account. Please manually delete the user account in the Supabase dashboard.`,
				metadata: { email },
				tag,
			}),
		);
	}
}

/**
 * Try to refresh the access token and return the new auth session or null.
 */
export async function refreshAccessToken(refreshToken?: string) {
	try {
		if (!refreshToken) {
			throw new SupaStripeStackError({
				message: `No refresh token provided`,
			});
		}

		const { data, error } = await supabaseAdmin().auth.refreshSession({
			refresh_token: refreshToken,
		});

		if (error) {
			throw error;
		}

		const { session } = data;

		if (!session) {
			throw new SupaStripeStackError({
				message: "The refreshed session returned by Supabase is null",
			});
		}

		return mapAuthSession(session);
	} catch (cause) {
		Logger.error(
			new SupaStripeStackError({
				cause,
				message: `Failed to refresh access token`,
				metadata: { refreshToken },
				tag,
			}),
		);

		return null;
	}
}

export async function verifyAuthSession(
	authSession: AuthSession,
	{ skip }: { skip: boolean },
) {
	try {
		if (skip) {
			return { success: true };
		}

		const { error } = await supabaseAdmin().auth.getUser(
			authSession.accessToken,
		);

		if (error) {
			throw error;
		}

		return { success: true };
	} catch (cause) {
		Logger.error(
			new SupaStripeStackError({
				cause,
				message: "Failed to verify auth session",
				metadata: { userId: authSession.userId },
				tag,
			}),
		);

		return { success: false };
	}
}
