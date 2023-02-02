import type { ActionArgs } from "@remix-run/node";
import { parseFormAny } from "react-zorm";
import { z } from "zod";

import { requireAuthSession } from "~/modules/auth";
import { createCheckoutSession } from "~/modules/checkout";
import { getSubscription } from "~/modules/subscription";
import { getBillingInfo } from "~/modules/user";
import { response, parseData } from "~/utils";

export type SubscribeApiAction = typeof action;

export async function action({ request }: ActionArgs) {
  const authSession = await requireAuthSession(request);
  const { userId } = authSession;

  const payload = await parseData(
    parseFormAny(await request.formData()),
    z.object({ priceId: z.string().trim().min(1) }),
    "Subscribe payload is invalid"
  );

  if (payload.error) {
    return response.badRequest(payload.error, { authSession });
  }

  const { priceId } = payload.data;

  const [billingInfo, subscription] = await Promise.all([
    getBillingInfo(userId),
    getSubscription(userId),
  ]);

  if (billingInfo.error) {
    return response.serverError(billingInfo.error, { authSession });
  }

  if (subscription.error) {
    return response.serverError(subscription.error, { authSession });
  }

  if (subscription.data?.priceId === priceId) {
    return response.badRequest(
      {
        message: "You are already subscribed to this tier",
        metadata: { priceId },
        tag: "Subscribe API",
      },
      {
        authSession,
      }
    );
  }

  const checkoutSession = await createCheckoutSession({
    customerId: billingInfo.data.customerId,
    priceId,
  });

  // Once a customer has subscribed, we can't change their currency.
  // Be sure to be consistent with the currency you use for your prices.
  // If there is a mismatch, the customer will be unable to checkout again.
  // It's an edge case, but it's good to be aware of.
  if (checkoutSession.error) {
    return response.serverError(checkoutSession.error, { authSession });
  }

  return response.redirect(checkoutSession.data.url, { authSession });
}
