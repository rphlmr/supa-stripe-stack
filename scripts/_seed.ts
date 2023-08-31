import type { TierId } from "@prisma/client";
import { Currency, Interval } from "@prisma/client";

import { db } from "~/database";
import { stripe } from "~/integrations/stripe";
import { DEFAULT_CURRENCY, SERVER_URL } from "~/utils";

import type { PriceByInterval } from "./config";
import { pricingPlan } from "./config";

type PriceCreatePayload = {
	currency: Currency;
	product: TierId;
	unit_amount: number;
	nickname: string;
	tax_behavior: "inclusive";
	recurring: {
		interval: Interval;
	};
	currency_options: {
		[Key in Currency]?: {
			unit_amount: number;
			tax_behavior: "inclusive";
		};
	};
};

function makeStripeCreatePricePayloads(
	price: PriceByInterval,
	name: string,
	id: TierId,
) {
	const intervals = Object.keys(Interval) as Interval[];
	const currencies = Object.keys(Currency) as Currency[];

	return intervals.map((interval) =>
		currencies.reduce((acc, currency) => {
			if (currency === DEFAULT_CURRENCY) {
				return {
					...acc,
					product: id,
					unit_amount: price[interval][currency],
					currency,
					nickname: `${name} ${interval}ly`,
					tax_behavior: "inclusive",
					recurring: {
						interval: interval as Interval,
					},
				} satisfies PriceCreatePayload;
			}

			return {
				...acc,
				currency_options: {
					...acc.currency_options,
					[currency as Currency]: {
						unit_amount: price[interval][currency],
						tax_behavior: "inclusive",
					},
				},
			} satisfies PriceCreatePayload;
		}, {} as PriceCreatePayload),
	);
}

async function seed() {
	const seedTiers = Object.values(pricingPlan).map(
		async ({
			name,
			tierId,
			price,
			description,
			featuresList,
			limits: { maxNumberOfNotes },
		}) => {
			await stripe.products.create({
				id: tierId,
				name,
				description: description || undefined,
			});

			await db.tier.create({
				data: {
					id: tierId,
					name,
					description,
					featuresList,
					tierLimit: {
						create: {
							id: tierId,
							maxNumberOfNotes,
						},
					},
				},
			});

			const prices = await Promise.all(
				makeStripeCreatePricePayloads(price, name, tierId).map(
					async (pricePayload) => {
						// Create default price and all other currencies variants in Stripe
						const { id: priceId } =
							await stripe.prices.create(pricePayload);

						const {
							unit_amount: amount,
							currency,
							recurring: { interval },
							currency_options,
						} = pricePayload;

						// With the Stripe price id, create price and all currency options in Prisma
						await db.price.create({
							data: {
								id: priceId,
								tierId,
								interval,
								currencies: {
									createMany: {
										data: [
											// Price for default currency
											{ amount, currency },
											// Prices for other currencies
											...Object.entries(
												currency_options,
											).map(
												([
													currency,
													{ unit_amount: amount },
												]) => ({
													amount,
													currency:
														currency as Currency,
												}),
											),
										],
									},
								},
							},
						});

						return priceId;
					},
				),
			);
			return { product: tierId, prices };
		},
	);

	const seededTiers = await Promise.all(seedTiers);

	// create customer portal configuration
	await stripe.billingPortal.configurations.create({
		business_profile: {
			headline: "Notee: Manage your subscription",
			privacy_policy_url: `${SERVER_URL}/privacy`,
			terms_of_service_url: `${SERVER_URL}/terms`,
		},
		features: {
			customer_update: {
				enabled: true,
				// https://stripe.com/docs/api/customer_portal/configurations/create?lang=node#create_portal_configuration-features-customer_update-allowed_updates
				allowed_updates: [
					"address",
					"shipping",
					"tax_id",
					"email",
					"name",
				],
			},
			invoice_history: { enabled: true },
			payment_method_update: { enabled: true },
			subscription_cancel: { enabled: true },
			subscription_pause: { enabled: false },
			subscription_update: {
				enabled: true,
				default_allowed_updates: ["price"],
				proration_behavior: "always_invoice",
				products: seededTiers.filter(
					({ product }) => product !== "free",
				),
			},
		},
	});
}

seed()
	.catch((e) => {
		// eslint-disable-next-line no-console
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
