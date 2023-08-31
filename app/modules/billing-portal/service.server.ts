import { stripe } from "~/integrations/stripe";
import { SERVER_URL, SupaStripeStackError } from "~/utils";

const tag = "Billing portal service 📊";

export async function createBillingPortalSession(customerId: string) {
	try {
		const { url } = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: `${SERVER_URL}/subscription`,
		});

		return { url };
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to create billing portal session",
			metadata: { customerId },
			tag,
		});
	}
}
