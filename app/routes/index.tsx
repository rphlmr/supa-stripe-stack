import type { LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { ButtonLink } from "~/components";
import { isAnonymousSession } from "~/modules/auth";
import { getPricingPlan, PricingTable } from "~/modules/price";
import { getDefaultCurrency, response } from "~/utils";

export async function loader({ request }: LoaderArgs) {
  const isAnonymous = await isAnonymousSession(request);

  if (!isAnonymous) {
    return response.redirect("/app", { authSession: null });
  }

  try {
    const pricingPlan = await getPricingPlan(getDefaultCurrency(request));

    return response.ok({ pricingPlan }, { authSession: null });
  } catch (cause) {
    throw response.error(cause, { authSession: null });
  }
}

export default function Home() {
  const { pricingPlan } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-y-10">
      <h1 className="text-4xl font-bold tracking-tight sm:text-center sm:text-6xl">
        Your notes, always with you.
      </h1>
      <p className="text-lg leading-8 text-gray-600 sm:text-center">
        Never forget anything important again. Notee is your simple note app.
      </p>
      <div className="flex gap-x-4 sm:justify-center">
        <ButtonLink
          to="/join"
          className="px-4 py-1.5 text-base font-semibold leading-7"
        >
          Get started{" "}
          <span className="text-white" aria-hidden="true">
            &rarr;
          </span>
        </ButtonLink>
      </div>
      <PricingTable pricingPlan={pricingPlan} />
    </div>
  );
}
