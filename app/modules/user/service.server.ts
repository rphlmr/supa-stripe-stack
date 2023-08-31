import { db } from "~/database";
import { stripe } from "~/integrations/stripe";
import type { AuthSession } from "~/modules/auth";
import {
	createEmailAuthAccount,
	signInWithEmail,
	deleteAuthAccount,
} from "~/modules/auth";
import { SupaStripeStackError } from "~/utils";

import type { User } from "./types";
import { deleteAuthAccountByEmail } from "../auth/service.server";

const tag = "User service 🧑";

type UserCreatePayload = Pick<AuthSession, "userId" | "email"> &
	Pick<User, "name">;

export async function getUserByEmail(email: User["email"]) {
	try {
		const user = await db.user.findUnique({
			where: { email: email.toLowerCase() },
		});

		return user;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to get user by email",
			status: 404,
			metadata: { email },
			tag,
		});
	}
}

async function createUser({ email, userId, name }: UserCreatePayload) {
	try {
		const { id: customerId } = await stripe.customers.create({
			email,
			name,
		});

		const user = await db.user.create({
			data: {
				email,
				id: userId,
				customerId,
				name,
				tierId: "free",
			},
		});

		return user;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to create user in database or stripe",
			metadata: { email, userId, name },
			tag,
		});
	}
}

export async function createUserAccount(payload: {
	email: string;
	password: string;
	name: string;
}) {
	const { email, password, name } = payload;

	try {
		const { id: userId } = await createEmailAuthAccount(email, password);
		const authSession = await signInWithEmail(email, password);
		await createUser({
			email,
			userId,
			name,
		});

		return authSession;
	} catch (cause) {
		// We should delete the user account to allow retry create account again
		// We mostly trust that it will be deleted.
		// If it's not the case, the user will face on a "user already exists" kind of error.
		// It'll require manual intervention to remove the account in Supabase Auth dashboard.
		await deleteAuthAccountByEmail(email);

		throw new SupaStripeStackError({
			cause,
			message: "Unable to create user account",
			metadata: { email, name },
			tag,
		});
	}
}

export async function getUserTierLimit(id: User["id"]) {
	try {
		const {
			tier: { tierLimit },
		} = await db.user.findUniqueOrThrow({
			where: { id },
			select: {
				tier: {
					include: {
						tierLimit: { select: { maxNumberOfNotes: true } },
					},
				},
			},
		});

		return tierLimit;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to find user tier limit",
			status: 404,
			metadata: { id },
			tag,
		});
	}
}

export async function getUserTier(id: User["id"]) {
	try {
		const { tier } = await db.user.findUniqueOrThrow({
			where: { id },
			select: {
				tier: { select: { id: true, name: true } },
			},
		});

		return tier;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to find user tier",
			status: 404,
			metadata: { id },
			tag,
		});
	}
}

export async function getBillingInfo(id: User["id"]) {
	try {
		const { customerId, currency } = await db.user.findUniqueOrThrow({
			where: { id },
			select: {
				customerId: true,
				currency: true,
			},
		});

		return { customerId, currency };
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to get billing info",
			status: 404,
			metadata: { id },
			tag,
		});
	}
}

export async function deleteUser(id: User["id"]) {
	try {
		const { customerId } = await getBillingInfo(id);

		await stripe.customers.del(customerId);
		await deleteAuthAccount(id);
		await db.user.delete({ where: { id } });

		return { success: true };
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Oups, unable to delete your test account",
			metadata: { id },
			tag,
		});
	}
}
