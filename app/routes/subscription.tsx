import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
	Form,
	useFetcher,
	useLoaderData,
	useNavigation,
} from "@remix-run/react";

import { Button, Time } from "~/components";
import { destroyAuthSession, requireAuthSession } from "~/modules/auth";
import { getPricingPlan, PricingTable } from "~/modules/price";
import { getSubscription } from "~/modules/subscription";
import { deleteUser, getBillingInfo, getUserTier } from "~/modules/user";
import { getDefaultCurrency, response, isFormProcessing, tw } from "~/utils";

export async function loader({ request }: LoaderFunctionArgs) {
	const authSession = await requireAuthSession(request);
	const { userId } = authSession;

	try {
		const [subscription, userTier, { currency }] = await Promise.all([
			getSubscription(userId),
			getUserTier(userId),
			getBillingInfo(userId),
		]);

		const pricingPlan = await getPricingPlan(
			currency || getDefaultCurrency(request),
		);

		return response.ok(
			{
				pricingPlan,
				userTier,
				subscription,
			},
			{ authSession },
		);
	} catch (cause) {
		throw response.error(cause, { authSession });
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const authSession = await requireAuthSession(request);
	const { userId } = authSession;

	try {
		await deleteUser(userId);

		return destroyAuthSession(request);
	} catch (cause) {
		return response.error(cause, { authSession });
	}
}

export default function Subscription() {
	const { pricingPlan, userTier, subscription } =
		useLoaderData<typeof loader>();
	const customerPortalFetcher = useFetcher();
	const isProcessing = isFormProcessing(customerPortalFetcher.state);

	const { cancelAtPeriodEnd, currentPeriodEnd, interval } =
		subscription || {};

	return (
		<div className="flex flex-col gap-y-10">
			<div className="flex flex-col items-center justify-center gap-y-2">
				<customerPortalFetcher.Form
					method="post"
					action="/api/customer-portal"
				>
					<Button
						disabled={isProcessing}
						className={tw(
							cancelAtPeriodEnd &&
								"border-red-600 bg-red-600 hover:bg-red-700",
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
						<Highlight important={cancelAtPeriodEnd}>
							{userTier.name}
						</Highlight>{" "}
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
			<div className="rounded-md bg-yellow-50 p-4">
				<div className="flex">
					<div className="shrink-0">
						<InformationCircleIcon
							className="h-5 w-5 text-yellow-400"
							aria-hidden="true"
						/>
					</div>
					<div className="ml-3">
						<h3 className="text-sm font-medium text-yellow-800">
							Do not use a real credit card for testing 😅
						</h3>
						<div className="mt-2 text-sm text-yellow-700">
							<p>
								You can use
								<span className="mx-2 inline-flex rounded-md border border-gray-200 bg-gray-100 p-1 text-gray-800">
									4242424242424242
								</span>
								Expire date
								<span className="mx-2 inline-flex rounded-md border border-gray-200 bg-gray-100 p-1 text-gray-800">
									12/34
								</span>
								CVC
								<span className="mx-2 inline-flex rounded-md border border-gray-200 bg-gray-100 p-1 text-gray-800">
									123
								</span>
							</p>
						</div>
					</div>
				</div>
			</div>
			<div className="flex justify-center">
				<DeleteTestAccount />
			</div>
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

function DeleteTestAccount() {
	const navigation = useNavigation();
	const isProcessing = isFormProcessing(navigation.state);

	return (
		<Form method="post">
			<Button
				disabled={isProcessing}
				className="border-red-600 bg-red-600 hover:bg-red-700"
			>
				{isProcessing ? "Deleting..." : "Delete my test account"}
			</Button>
		</Form>
	);
}
