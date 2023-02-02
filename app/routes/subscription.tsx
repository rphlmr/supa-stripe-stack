import type { LoaderArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";

import { Button, Time } from "~/components";
import { requireAuthSession } from "~/modules/auth";
import { getPricingPlan, PricingTable } from "~/modules/price";
import { getSubscription } from "~/modules/subscription";
import { getBillingInfo, getUserTier } from "~/modules/user";
import { getDefaultCurrency, response, isFormProcessing, tw } from "~/utils";

export async function loader({ request }: LoaderArgs) {
  const authSession = await requireAuthSession(request);
  const { userId } = authSession;

  const [subscription, userTier, billingInfo] = await Promise.all([
    getSubscription(userId),
    getUserTier(userId),
    getBillingInfo(userId),
  ]);

  if (userTier.error) {
    throw response.serverError(userTier.error, { authSession });
  }

  if (billingInfo.error) {
    throw response.serverError(billingInfo.error, { authSession });
  }

  const pricingPlan = await getPricingPlan(
    billingInfo.data.currency || getDefaultCurrency(request)
  );

  if (pricingPlan.error) {
    throw response.serverError(pricingPlan.error, { authSession });
  }

  return response.ok(
    {
      pricingPlan: pricingPlan.data,
      userTier: userTier.data,
      subscription: subscription.data,
    },
    { authSession }
  );
}

export default function Subscription() {
  const { pricingPlan, userTier, subscription } =
    useLoaderData<typeof loader>().data;
  const customerPortalFetcher = useFetcher();
  const isProcessing = isFormProcessing(customerPortalFetcher.state);

  const { cancelAtPeriodEnd, currentPeriodEnd, interval } = subscription || {};

  return (
    <div className="flex flex-col gap-y-10">
      <div className="flex flex-col items-center justify-center gap-y-2">
        <customerPortalFetcher.Form method="post" action="/api/customer-portal">
          <Button
            disabled={isProcessing}
            className={tw(
              cancelAtPeriodEnd && "border-red-600 bg-red-600 hover:bg-red-700"
            )}
          >
            {isProcessing
              ? "Redirecting to Customer Portal..."
              : userTier.id !== "free"
              ? cancelAtPeriodEnd
                ? "Renew my subscription"
                : "Upgrade or cancel my subscription"
              : "Go to Customer Portal"}
          </Button>
        </customerPortalFetcher.Form>
        {currentPeriodEnd ? (
          <span>
            Your{" "}
            <Highlight important={cancelAtPeriodEnd}>{userTier.name}</Highlight>{" "}
            subscription
            <Highlight important={cancelAtPeriodEnd}>
              {cancelAtPeriodEnd ? " ends " : " renews "}
            </Highlight>
            on{" "}
            <Highlight important={cancelAtPeriodEnd}>
              <Time date={currentPeriodEnd} />
            </Highlight>
          </span>
        ) : null}
      </div>
      <PricingTable
        pricingPlan={pricingPlan}
        userTierId={userTier.id}
        defaultDisplayAnnual={interval === "year"}
      />
    </div>
  );
}

function Highlight({
  children,
  important,
}: {
  children: React.ReactNode;
  important?: boolean | null;
}) {
  return (
    <span className={tw("font-bold", important && "text-red-600")}>
      {children}
    </span>
  );
}
