import { createCookieSessionStorage } from "@remix-run/node";

import type { SessionWithCookie } from "~/utils";
import {
	response,
	makeRedirectToFromHere,
	NODE_ENV,
	safeRedirect,
	SESSION_SECRET,
	Logger,
} from "~/utils";

import { refreshAccessToken, verifyAuthSession } from "./service.server";
import type { AuthSession } from "./types";

const SESSION_KEY = "authenticated";
const SESSION_ERROR_KEY = "error";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days;
const LOGIN_URL = "/login";
const REFRESH_ACCESS_TOKEN_THRESHOLD = 60 * 1; // 1 minute left before token expires

/**
 * Session storage CRUD
 */

const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "__authSession",
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secrets: [SESSION_SECRET],
		secure: NODE_ENV === "production",
	},
});

export async function createAuthSession({
	request,
	authSession,
	redirectTo,
}: {
	request: Request;
	authSession: AuthSession;
	redirectTo: string;
}) {
	return response.redirect(safeRedirect(redirectTo), {
		authSession: {
			...authSession,
			cookie: await commitAuthSession(request, authSession, {
				flashErrorMessage: null,
			}),
		},
	});
}

async function getSession(request: Request) {
	const cookie = request.headers.get("Cookie");
	const session = await sessionStorage.getSession(cookie);

	return session;
}

async function getAuthSession(request: Request): Promise<AuthSession | null> {
	const session = await getSession(request);
	const authSession = session.get(SESSION_KEY);

	if (!authSession) {
		return null;
	}

	return authSession;
}

export async function isAnonymousSession(request: Request): Promise<boolean> {
	const authSession = await getAuthSession(request);

	return Boolean(!authSession);
}

async function commitAuthSession(
	request: Request,
	authSession: AuthSession | null,
	options: {
		flashErrorMessage?: string | null;
	} = {},
) {
	const session = await getSession(request);

	// allow user session to be null.
	// useful you want to clear session and display a message explaining why
	if (authSession !== undefined) {
		session.set(SESSION_KEY, authSession);
	}

	session.flash(SESSION_ERROR_KEY, options.flashErrorMessage);

	return sessionStorage.commitSession(session, {
		maxAge: SESSION_MAX_AGE,
	});
}

export async function destroyAuthSession(request: Request) {
	const session = await getSession(request);

	return response.redirect("/", {
		authSession: null,
		headers: [["Set-Cookie", await sessionStorage.destroySession(session)]],
	});
}

async function assertAuthSession(
	request: Request,
	{ onFailRedirectTo }: { onFailRedirectTo?: string } = {},
) {
	const authSession = await getAuthSession(request);

	// If there is no user session: Fly, You Fools! 🧙‍♂️
	if (!authSession) {
		Logger.dev("No user session found");

		throw response.redirect(
			`${onFailRedirectTo || LOGIN_URL}?${makeRedirectToFromHere(
				request,
			)}`,
			{
				authSession: null,
				headers: [
					[
						"Set-Cookie",
						await commitAuthSession(request, null, {
							flashErrorMessage: "no-user-session",
						}),
					],
				],
			},
		);
	}

	return authSession;
}

/**
 * Assert that auth session is present and verified from Supabase auth api

 * - Try to refresh session if expired and return this new session
 * - Return auth session if not expired
 * - Destroy session if refresh token is expired
 * 
 * You have to pass authSession on every json responses / redirect, until we get something better to manage that at higher level 👮‍♀️
 * 
 * @example 
 * // protected route
 * return response.ok({ ... }, { authSession }) // response.XXX() helper will automatically set the cookie for you
 * 
 * // unprotected route
 * return response.ok({ ... }, { authSession: null })
 */
export async function requireAuthSession(
	request: Request,
	{
		onFailRedirectTo,
		verify,
	}: { onFailRedirectTo?: string; verify: boolean } = { verify: false },
): Promise<SessionWithCookie<AuthSession>> {
	// hello there
	const authSession = await assertAuthSession(request, {
		onFailRedirectTo,
	});

	// ok, let's challenge its access token.
	const validation = await verifyAuthSession(authSession, {
		// by default, we don't verify the access token from supabase auth api to save some time
		// this is still safe because we verify the refresh token on expires and all of this comes from a secure signed cookie
		skip: !verify,
	});

	// damn, access token is not valid or expires soon
	// let's try to refresh, in case of 🧐
	if (!validation.success || isExpiringSoon(authSession.expiresAt)) {
		return refreshAuthSession(request);
	}

	// finally, we have a valid session, let's return it
	return {
		...authSession,
		// the cookie to set in the response
		cookie: await commitAuthSession(request, authSession),
	};
}

function isExpiringSoon(expiresAt: number) {
	return (expiresAt - REFRESH_ACCESS_TOKEN_THRESHOLD) * 1000 < Date.now();
}

async function refreshAuthSession(
	request: Request,
): Promise<SessionWithCookie<AuthSession>> {
	const authSession = await getAuthSession(request);

	const refreshedAuthSession = await refreshAccessToken(
		authSession?.refreshToken,
	);

	// 👾 game over, log in again
	// yes, arbitrary, but it's a good way to don't let an illegal user here with an expired token
	if (!refreshedAuthSession) {
		const redirectUrl = `${LOGIN_URL}?${makeRedirectToFromHere(request)}`;

		// here we throw instead of return because this function promise a AuthSession and not a response object
		// https://remix.run/docs/en/v1/guides/constraints#higher-order-functions
		throw response.redirect(redirectUrl, {
			authSession: null,
			headers: [
				[
					"Set-Cookie",
					await commitAuthSession(request, null, {
						flashErrorMessage: "fail-refresh-auth-session",
					}),
				],
			],
		});
	}

	return {
		...refreshedAuthSession,
		// the cookie to set in the response
		cookie: await commitAuthSession(request, refreshedAuthSession),
	};
}
