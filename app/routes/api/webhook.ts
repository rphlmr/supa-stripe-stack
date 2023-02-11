import type { ActionArgs } from "@remix-run/node";
import { z } from "zod";

import { stripe } from "~/integrations/stripe";
import {
  deleteSubscription,
  updateSubscription,
  createSubscription,
  fetchSubscription,
} from "~/modules/subscription";
import { TierId, updateTier } from "~/modules/tier";
import {
  response,
  STRIPE_ENDPOINT_SECRET,
  SupaStripeStackError,
  parseData,
} from "~/utils";

const tag = "Stripe webhook 🎣";

async function getStripeEvent(request: Request) {
  try {
    // Get the signature sent by Stripe
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      throw new SupaStripeStackError({
        cause: null,
        message: "Missing Stripe signature",
        tag,
      });
    }

    const stripePayload = await request.text();

    const event = stripe.webhooks.constructEvent(
      stripePayload,
      signature,
      STRIPE_ENDPOINT_SECRET
    );

    return event;
  } catch (cause) {
    throw response.error(
      new SupaStripeStackError({
        cause,
        message: "Unable to construct Strip event",
        tag,
      }),
      { authSession: null }
    );
  }
}

export async function action({ request }: ActionArgs) {
  const event = await getStripeEvent(request);
  const eventId = event.id;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const { id } = await parseData(
          event.data.object,
          z
            .object({
              subscription: z.string(),
              payment_status: z.literal("paid"),
            })
            .transform(({ subscription }) => ({ id: subscription })),
          `${event.type} payload is malformed`
        );

        const subscription = await fetchSubscription(id);

        const createdSubscription = await createSubscription({
          id,
          ...subscription,
        });

        return response.ok(createdSubscription, { authSession: null });
      }

      case "customer.subscription.updated": {
        const { id } = await parseData(
          event.data.object,
          z.object({
            id: z.string(),
          }),
          `${event.type} payload is malformed`
        );

        const subscription = await fetchSubscription(id);

        const updatedSubscription = await updateSubscription(subscription);

        return response.ok(updatedSubscription, { authSession: null });
      }

      case "customer.subscription.deleted": {
        const { id, customer: customerId } = await parseData(
          event.data.object,
          z.object({
            id: z.string(),
            customer: z.string(),
          }),
          `${event.type} payload is malformed`
        );

        const deletedSubscription = await deleteSubscription({
          id,
          customerId,
        });

        return response.ok(deletedSubscription, { authSession: null });
      }

      case "product.updated": {
        const { tierId, active, description, name } = await parseData(
          event.data.object,
          z
            .object({
              id: z.nativeEnum(TierId),
              active: z.boolean(),
              name: z.string(),
              description: z.string().nullable(),
            })
            .transform(({ id: tierId, active, name, description }) => ({
              tierId,
              active,
              name,
              description,
            })),
          `${event.type} payload is malformed`
        );

        const updatedTier = await updateTier(tierId, {
          active,
          description,
          name,
        });

        return response.ok(updatedTier, { authSession: null });
      }
    }

    return response.ok({}, { authSession: null });
  } catch (cause) {
    const reason = new SupaStripeStackError({
      cause,
      message: "An error occurred while handling Stripe webhook",
      metadata: { eventId },
      tag,
    });

    return response.error(reason, { authSession: null });
  }
}
