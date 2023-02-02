import { stripe } from "~/integrations/stripe";
import { SERVER_URL } from "~/utils";
import { failure, success } from "~/utils/resolvers";

const tag = "Billing portal service 📊";

export async function createBillingPortalSession(customerId: string) {
  try {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SERVER_URL}/subscription`,
    });

    return success({ url });
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to create billing portal session",
      metadata: { customerId },
      tag,
    });
  }
}
