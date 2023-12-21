import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
	Form,
	Link,
	useActionData,
	useNavigation,
	useSearchParams,
} from "@remix-run/react";
import { parseFormAny, useZorm } from "react-zorm";
import { z } from "zod";

import { Button } from "~/components";
import {
	createAuthSession,
	isAnonymousSession,
	signInWithEmail,
} from "~/modules/auth";
import { response, isFormProcessing, parseData } from "~/utils";

export async function loader({ request }: LoaderFunctionArgs) {
	try {
		const isAnonymous = await isAnonymousSession(request);

		if (!isAnonymous) {
			return response.redirect("/app", { authSession: null });
		}

		return response.ok({}, { authSession: null });
	} catch (cause) {
		return response.error(cause, { authSession: null });
	}
}

const LoginFormSchema = z.object({
	email: z
		.string()
		.email("invalid-email")
		.transform((email) => email.toLowerCase()),
	password: z.string().min(8, "password-too-short"),
	redirectTo: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
	try {
		const payload = await parseData(
			parseFormAny(await request.formData()),
			LoginFormSchema,
			"Login form payload is invalid",
		);

		const { email, password, redirectTo } = payload;

		const authSession = await signInWithEmail(email, password);

		return createAuthSession({
			request,
			authSession,
			redirectTo: redirectTo || "/app",
		});
	} catch (cause) {
		return response.error(cause, { authSession: null });
	}
}

export default function LoginPage() {
	const zo = useZorm("Auth", LoginFormSchema);
	const actionResponse = useActionData<typeof action>();
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirectTo") ?? undefined;
	const navigation = useNavigation();
	const isProcessing = isFormProcessing(navigation.state);

	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				<Form ref={zo.ref} method="post" className="space-y-6" replace>
					<h1 className="text-2xl">Login in</h1>
					<div>
						<label
							htmlFor={zo.fields.email()}
							className="block text-sm font-medium text-gray-700"
						>
							Email
						</label>

						<div className="mt-1">
							<input
								data-test-id="email"
								required
								autoFocus={true}
								name={zo.fields.email()}
								type="email"
								autoComplete="email"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								disabled={isProcessing}
							/>
							{zo.errors.email()?.message && (
								<div
									className="pt-1 text-red-700"
									id="email-error"
								>
									{zo.errors.email()?.message}
								</div>
							)}
						</div>
					</div>

					<div>
						<label
							htmlFor={zo.fields.password()}
							className="block text-sm font-medium text-gray-700"
						>
							Password
						</label>
						<div className="mt-1">
							<input
								data-test-id="password"
								name={zo.fields.password()}
								type="password"
								autoComplete="new-password"
								className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
								disabled={isProcessing}
							/>
							{zo.errors.password()?.message && (
								<div
									className="pt-1 text-red-700"
									id="password-error"
								>
									{zo.errors.password()?.message}
								</div>
							)}
						</div>
					</div>

					<input
						type="hidden"
						name={zo.fields.redirectTo()}
						value={redirectTo}
					/>
					<Button className="w-full" disabled={isProcessing}>
						{isProcessing ? "..." : "Log in"}
					</Button>
					<div className="flex items-center justify-center">
						<div className="text-center text-sm text-gray-500">
							Don't have an account?{" "}
							<Link
								className="text-indigo-500 underline"
								to={{
									pathname: "/join",
									search: searchParams.toString(),
								}}
							>
								Sign up
							</Link>
						</div>
					</div>
					{actionResponse?.error ? (
						<div className="pt-1 text-red-700" id="name-error">
							{actionResponse.error.message}
						</div>
					) : null}
				</Form>
			</div>
		</div>
	);
}
