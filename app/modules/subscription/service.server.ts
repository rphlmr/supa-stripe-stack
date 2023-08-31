import { z } from "zod";

import { db } from "~/database";
import { stripe } from "~/integrations/stripe";
import { Currency } from "~/modules/price";
import { TierId } from "~/modules/tier";
import type { User } from "~/modules/user";
import { toDate, parseData, SupaStripeStackError } from "~/utils";

import type { Subscription } from "./types";
import { SubscriptionStatus } from "./types";

const tag = "Subscription service 🧾";

const StripeSubscriptionSchema = z
	.object({
		current_period_start: z.number(),
		current_period_end: z.number(),
		cancel_at_period_end: z.boolean(),
		customer: z.string(),
		status: z.nativeEnum(SubscriptionStatus),
		currency: z.nativeEnum(Currency),
		items: z.object({
			data: z
				.array(
					z.object({
						id: z.string(),
						price: z.object({
							id: z.string(),
							product: z.nativeEnum(TierId),
						}),
					}),
				)
				.length(1),
		}),
	})
	.transform(
		({
			customer: customerId,
			status,
			currency,
			items: {
				data: [
					{
						id: itemId,
						price: { id: priceId, product: tierId },
					},
				],
			},
			cancel_at_period_end: cancelAtPeriodEnd,
			current_period_end: currentPeriodEnd,
			current_period_start: currentPeriodStart,
		}) => ({
			customerId,
			tierId,
			itemId,
			priceId,
			currentPeriodEnd: toDate(currentPeriodEnd),
			currentPeriodStart: toDate(currentPeriodStart),
			cancelAtPeriodEnd,
			currency,
			status,
		}),
	);

export async function fetchSubscription(id: string) {
	try {
		const subscription = await parseData(
			await stripe.subscriptions.retrieve(id),
			StripeSubscriptionSchema,
			"Stripe subscription fetch result is malformed",
		);

		return subscription;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to retrieve subscription",
			metadata: { id },
			tag,
		});
	}
}

export async function getSubscription(userId: string) {
	try {
		const subscription = await db.subscription.findFirst({
			where: { userId },
			select: {
				id: true,
				tierId: true,
				priceId: true,
				status: true,
				cancelAtPeriodEnd: true,
				currentPeriodEnd: true,
				price: { select: { interval: true } },
			},
		});

		if (!subscription) {
			return null;
		}

		const {
			price: { interval },
			...userSubscription
		} = subscription;

		return { interval, ...userSubscription };
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to get subscription",
			metadata: { userId },
			tag,
		});
	}
}

export async function createSubscription({
	customerId,
	tierId,
	id,
	priceId,
	itemId,
	currentPeriodStart,
	currentPeriodEnd,
}: Pick<
	Subscription,
	| "id"
	| "tierId"
	| "priceId"
	| "itemId"
	| "currentPeriodStart"
	| "currentPeriodEnd"
> &
	Pick<User, "customerId">) {
	try {
		const newSubscription = await db.user.update({
			where: { customerId },
			data: {
				tierId,
				subscription: {
					create: {
						id,
						status: "active",
						tierId,
						priceId,
						itemId,
						currentPeriodStart,
						currentPeriodEnd,
					},
				},
			},
			select: { createdAt: true, id: true },
		});

		return newSubscription;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to create subscription",
			metadata: { customerId, tierId, id, priceId, itemId },
			tag,
		});
	}
}

export async function updateSubscription({
	customerId,
	tierId,
	status,
	priceId,
	itemId,
	currency,
	currentPeriodStart,
	currentPeriodEnd,
	cancelAtPeriodEnd,
}: Pick<User, "currency" | "customerId"> &
	Pick<
		Subscription,
		| "tierId"
		| "status"
		| "priceId"
		| "itemId"
		| "currentPeriodStart"
		| "currentPeriodEnd"
		| "cancelAtPeriodEnd"
	>) {
	try {
		const updatedSubscription = await db.user.update({
			where: { customerId },
			data: {
				tierId,
				currency,
				subscription: {
					update: {
						status,
						tierId,
						priceId,
						itemId,
						currentPeriodStart,
						currentPeriodEnd,
						cancelAtPeriodEnd,
					},
				},
			},
			select: { updatedAt: true, id: true },
		});

		return updatedSubscription;
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to update subscription",
			metadata: {
				customerId,
				tierId,
				status,
				priceId,
				itemId,
				currency,
			},
			tag,
		});
	}
}

export async function deleteSubscription({
	id,
	customerId,
}: Pick<User, "customerId"> & Pick<Subscription, "id">) {
	try {
		await db.$transaction([
			db.user.update({
				where: { customerId },
				data: { tierId: "free" },
				select: { updatedAt: true },
			}),
			db.subscription.delete({ where: { id }, select: { id: true } }),
		]);

		return { id, deleted: true };
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to cancel subscription",
			metadata: { id, customerId },
			tag,
		});
	}
}
