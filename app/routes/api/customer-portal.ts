import type { ActionArgs } from "@remix-run/node";

import { requireAuthSession } from "~/modules/auth";
import { createBillingPortalSession } from "~/modules/billing-portal";
import { getBillingInfo } from "~/modules/user";
import { response } from "~/utils";

export async function action({ request }: ActionArgs) {
  const authSession = await requireAuthSession(request);
  const { userId } = authSession;

  const billingInfo = await getBillingInfo(userId);

  if (billingInfo.error) {
    return response.serverError(billingInfo.error, { authSession });
  }

  const billingPortalSession = await createBillingPortalSession(
    billingInfo.data.customerId
  );

  if (billingPortalSession.error) {
    return response.serverError(billingPortalSession.error, { authSession });
  }

  return response.redirect(billingPortalSession.data.url, { authSession });
}
