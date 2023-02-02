import Stripe from "stripe";

import { STRIPE_SECRET_KEY } from "~/utils";

let _stripe: Stripe;

function getStripeServerClient() {
  if (!_stripe) {
    // Reference : https://github.com/stripe/stripe-node#usage-with-typescript
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
    });
  }
  return _stripe;
}

export const stripe = getStripeServerClient();

export type StripeEvent = ReturnType<Stripe["webhooks"]["constructEvent"]>;
