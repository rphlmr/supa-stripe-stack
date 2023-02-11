import { db } from "~/database";
import { SupaStripeStackError } from "~/utils";

import type { Currency } from "./types";

const tag = "Price service 💰";

export type PricingPlan = NonNullable<
  Awaited<ReturnType<typeof getPricingPlan>>
>;

export async function getPricingPlan(currency: Currency) {
  try {
    const result = await db.price.findMany({
      where: { active: true },
      select: {
        interval: true,
        tier: {
          select: {
            id: true,
            name: true,
            description: true,
            featuresList: true,
            active: true,
          },
        },
        currencies: {
          where: { currency },
          orderBy: { amount: "asc" },
        },
      },
      orderBy: {
        tierId: "asc",
      },
    });

    const pricingPlan = result.map(({ tier, interval, currencies }) => {
      const price = currencies[0];

      if (!price) {
        throw new SupaStripeStackError({
          cause: null,
          message: "No price found. This should not happen.",
          metadata: { currency, interval, tierId: tier.id },
          tag,
        });
      }

      return {
        interval,
        ...tier,
        ...price,
      };
    });

    return pricingPlan;
  } catch (cause) {
    throw new SupaStripeStackError({
      cause,
      message: `Unable to get pricing plan`,
      metadata: { currency },
      tag,
    });
  }
}
