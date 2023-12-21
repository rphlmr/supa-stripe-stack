import type { ActionFunctionArgs } from "@remix-run/node";

import { requireAuthSession } from "~/modules/auth";
import { createBillingPortalSession } from "~/modules/billing-portal";
import { getBillingInfo } from "~/modules/user";
import { response } from "~/utils";

export async function action({ request }: ActionFunctionArgs) {
	const authSession = await requireAuthSession(request);
	const { userId } = authSession;

	try {
		const { customerId } = await getBillingInfo(userId);
		const { url } = await createBillingPortalSession(customerId);

		return response.redirect(url, { authSession });
	} catch (cause) {
		return response.error(cause, {
			authSession,
		});
	}
}
