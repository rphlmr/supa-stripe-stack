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
  failure,
  response,
  STRIPE_ENDPOINT_SECRET,
  success,
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

    return success(event);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to construct Strip event",
      tag,
    });
  }
}

export async function action({ request }: ActionArgs) {
  const stripeEvent = await getStripeEvent(request);

  if (stripeEvent.error) {
    return response.serverError(stripeEvent.error, { authSession: null });
  }

  const event = stripeEvent.data;
  const eventId = event.id;

  switch (event.type) {
    case "checkout.session.completed": {
      const payload = await parseData(
        event.data.object,
        z.object({
          subscription: z.string(),
          payment_status: z.literal("paid"),
        }),
        `${event.type} payload is malformed`
      );

      if (payload.error) {
        payload.error.traceId = eventId;
        return response.badRequest(payload.error, { authSession: null });
      }

      const id = payload.data.subscription;

      const subscription = await fetchSubscription(id);

      if (subscription.error) {
        subscription.error.traceId = eventId;
        return response.serverError(subscription.error, { authSession: null });
      }

      const createdSubscription = await createSubscription({
        id,
        ...subscription.data,
      });

      if (createdSubscription.error) {
        createdSubscription.error.traceId = eventId;
        return response.serverError(createdSubscription.error, {
          authSession: null,
        });
      }

      return response.ok(createdSubscription, { authSession: null });
    }

    case "customer.subscription.updated": {
      const payload = await parseData(
        event.data.object,
        z.object({
          id: z.string(),
        }),
        `${event.type} payload is malformed`
      );

      if (payload.error) {
        payload.error.traceId = eventId;
        return response.badRequest(payload.error, { authSession: null });
      }

      const { id } = payload.data;

      const subscription = await fetchSubscription(id);

      if (subscription.error) {
        subscription.error.traceId = eventId;
        return response.serverError(subscription.error, { authSession: null });
      }

      const updatedSubscription = await updateSubscription(subscription.data);

      if (updatedSubscription.error) {
        updatedSubscription.error.traceId = eventId;
        return response.serverError(updatedSubscription.error, {
          authSession: null,
        });
      }

      return response.ok(updatedSubscription, { authSession: null });
    }

    case "customer.subscription.deleted": {
      const payload = await parseData(
        event.data.object,
        z.object({
          id: z.string(),
          customer: z.string(),
        }),
        `${event.type} payload is malformed`
      );

      if (payload.error) {
        payload.error.traceId = eventId;
        return response.badRequest(payload.error, { authSession: null });
      }

      const { id, customer: customerId } = payload.data;

      const deletedSubscription = await deleteSubscription({
        id,
        customerId,
      });

      if (deletedSubscription.error) {
        deletedSubscription.error.traceId = eventId;
        return response.serverError(deletedSubscription.error, {
          authSession: null,
        });
      }

      return response.ok(deletedSubscription, { authSession: null });
    }

    case "product.updated": {
      const payload = await parseData(
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

      if (payload.error) {
        payload.error.traceId = eventId;
        return response.badRequest(payload.error, { authSession: null });
      }

      const { tierId, active, description, name } = payload.data;

      const updatedTier = await updateTier(tierId, {
        active,
        description,
        name,
      });

      if (updatedTier.error) {
        updatedTier.error.traceId = eventId;
        return response.serverError(updatedTier.error, { authSession: null });
      }

      return response.ok(updatedTier, { authSession: null });
    }
  }

  return response.ok(null, { authSession: null });
}
