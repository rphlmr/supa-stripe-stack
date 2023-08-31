import { SparklesIcon } from "@heroicons/react/24/outline";
import type { LoaderArgs } from "@remix-run/node";
import { Link, useLoaderData, useSubmit } from "@remix-run/react";

import { useInterval } from "~/hooks";
import { requireAuthSession } from "~/modules/auth";
import { getSubscription } from "~/modules/subscription";
import { response } from "~/utils";

export async function loader({ request }: LoaderArgs) {
	const authSession = await requireAuthSession(request);
	const { userId } = authSession;

	try {
		const subscription = await getSubscription(userId);

		return response.ok(
			{ pending: !subscription?.id },
			{
				authSession,
			},
		);
	} catch (cause) {
		throw response.error(cause, { authSession });
	}
}

export default function Checkout() {
	const { pending } = useLoaderData<typeof loader>();
	const submit = useSubmit();

	useInterval(
		() => {
			submit(null);
		},
		pending ? 1_000 : null,
	);

	return (
		<div className="flex  flex-col items-center justify-center gap-y-10">
			{pending ? (
				<>
					<svg
						className="-ml-1 mr-3 h-20 w-20 animate-spin text-purple-500"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<h3 className="text-3xl font-bold text-gray-900">
						Completing your checkout ...
					</h3>
					<p className="max-w-sm text-center font-semibold text-gray-700">
						This step can take a few seconds...
					</p>
				</>
			) : (
				<>
					<SparklesIcon className="h-20 w-20 text-amber-500" />

					<h3 className="text-3xl font-bold">
						You are now subscribed! 🥳
					</h3>

					<Link to="/app" prefetch="none">
						<button className="rounded-lg border-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-3 text-lg font-bold text-white">
							<span>Start writing</span>
						</button>
					</Link>
				</>
			)}
		</div>
	);
}
