import type {
	Currency,
	Interval,
	PriceCurrency,
	Tier,
	TierId,
	TierLimit,
} from "@prisma/client";

export type PriceByInterval<
	I extends Interval = Interval,
	C extends Currency = Currency,
> = {
	[interval in I]: {
		[currency in C]: PriceCurrency["amount"];
	};
};

type PricingPlan<T extends TierId = TierId> = {
	[tierId in T]: { tierId: tierId } & Pick<
		Tier,
		"name" | "description" | "featuresList"
	> & {
			price: PriceByInterval;
			limits: Pick<TierLimit, "maxNumberOfNotes">;
		};
};

export const pricingPlan = {
	free: {
		tierId: "free",
		name: "Free Tier",
		description: "Free forever",
		featuresList: ["Up to 2 notes", "Limited support"],
		limits: { maxNumberOfNotes: 2 },
		price: {
			month: {
				usd: 0,
				eur: 0,
			},
			year: {
				usd: 0,
				eur: 0,
			},
		},
	},
	tier_1: {
		tierId: "tier_1",
		name: "Pro Tier",
		description: "For power users",
		featuresList: ["Free Tier features", "Up to 4 notes"],
		limits: { maxNumberOfNotes: 4 },
		price: {
			month: {
				usd: 999,
				eur: 999,
			},
			year: {
				usd: 9990,
				eur: 9990,
			},
		},
	},
	tier_2: {
		tierId: "tier_2",
		name: "Pro Plus Tier",
		description: "For power power users",
		featuresList: ["Pro Tier features", "Unlimited notes"],
		limits: { maxNumberOfNotes: null },
		price: {
			month: {
				usd: 1999,
				eur: 1999,
			},
			year: {
				usd: 19990,
				eur: 19990,
			},
		},
	},
} satisfies PricingPlan;
