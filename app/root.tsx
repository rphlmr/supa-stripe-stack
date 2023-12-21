import { Fragment, useEffect, useState } from "react";

import { Dialog, Transition } from "@headlessui/react";
import { Bars3Icon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type {
	LinksFunction,
	LoaderFunctionArgs,
	MetaFunction,
} from "@remix-run/node";
import {
	Form,
	Link,
	Links,
	LiveReload,
	Meta,
	NavLink,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetchers,
	useLoaderData,
	useLocation,
} from "@remix-run/react";

import type { CatchResponse } from "~/utils";
import { getBrowserEnv, tw, response } from "~/utils";

import { isAnonymousSession, requireAuthSession } from "./modules/auth";
import { getUserTier } from "./modules/user";
import tailwindStylesheetUrl from "./styles/tailwind.css";

export const links: LinksFunction = () => [
	{ rel: "stylesheet preload prefetch", href: tailwindStylesheetUrl, as: "style" },
	
];

export const meta: MetaFunction = () => [
	{ title: "Notee" },
	{ name: "description", content: "Notee App" },
];

export async function loader({ request }: LoaderFunctionArgs) {
	const isAnonymous = await isAnonymousSession(request);

	if (isAnonymous) {
		return response.ok(
			{
				env: getBrowserEnv(),
				email: null,
				userTier: null,
			},
			{ authSession: null },
		);
	}

	const authSession = await requireAuthSession(request);
	const { userId, email } = authSession;

	try {
		const userTier = await getUserTier(userId);

		return response.ok(
			{
				env: getBrowserEnv(),
				email,
				userTier,
			},
			{ authSession },
		);
	} catch (cause) {
		throw response.error(cause, { authSession });
	}
}

export default function App() {
	const { env } = useLoaderData<typeof loader>();

	return (
		<html className="h-full">
			<head>
				<Meta />
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width,initial-scale=1.0,maximum-scale=1.0"
				/>
				<Links />
			</head>
			<body className="h-full">
				<Content />
				<ScrollRestoration />
				<script
					dangerouslySetInnerHTML={{
						__html: `window.env = ${JSON.stringify(env)}`,
					}}
				/>
				<Scripts />
				<LiveReload />
			</body>
		</html>
	);
}

function Content() {
	const { key } = useLocation();

	return (
		<ContentLayout>
			<NotifyError />
			<div className="px-6 pt-6 lg:px-8">
				<HeaderMenu key={key} />
			</div>
			<main>
				<div className="relative px-6 lg:px-8">
					<div className="mx-auto max-w-3xl pt-10">
						<Outlet />
					</div>
				</div>
			</main>
		</ContentLayout>
	);
}

function NotifyError() {
	const [show, setShow] = useState(false);
	const fetchers = useFetchers();

	const error = fetchers.map(
		(f) => (f.data as CatchResponse | null)?.error,
	)[0];

	useEffect(() => {
		if (error) {
			setShow(true);
		} else {
			setShow(false);
		}
	}, [error]);

	return (
		<>
			<div
				aria-live="assertive"
				className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
			>
				<div className="flex w-full flex-col items-center space-y-4 sm:items-end">
					<Transition
						show={show}
						as={Fragment}
						enter="transform ease-out duration-300 transition"
						enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
						enterTo="translate-y-0 opacity-100 sm:translate-x-0"
						leave="transition ease-in duration-100"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
							<div className="p-4">
								<div className="flex items-start">
									<div className="shrink-0">
										<XCircleIcon
											className="h-6 w-6 text-red-400"
											aria-hidden="true"
										/>
									</div>
									<div className="ml-3 w-0 flex-1 pt-0.5">
										<p className="text-sm font-medium text-gray-900">
											An error occurred 😫
										</p>
										<p className="mt-1 text-sm text-gray-500">
											{error?.message}
										</p>
										{error?.traceId ? (
											<p className="mt-1 text-sm text-gray-500">
												TraceId: {error.traceId}
											</p>
										) : null}
										{error?.metadata ? (
											<p className="mt-1 text-sm text-gray-500">
												<span>Metadata:</span>
												<pre className="overflow-x-auto text-xs">
													{JSON.stringify(
														error.metadata,
														null,
														2,
													)}
												</pre>
											</p>
										) : null}
									</div>
									<div className="ml-4 flex shrink-0">
										<button
											type="button"
											className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
											onClick={() => {
												setShow(false);
											}}
										>
											<span className="sr-only">
												Close
											</span>
											<XMarkIcon
												className="h-5 w-5"
												aria-hidden="true"
											/>
										</button>
									</div>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</div>
		</>
	);
}

const navigation = [
	{ name: "My notes", href: "/app" },
	{ name: "Manage my subscription", href: "/subscription" },
];

function HeaderMenu() {
	const { email, userTier } = useLoaderData<typeof loader>();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<div>
			<nav
				className="flex h-9 items-center justify-between"
				aria-label="Global"
			>
				<div
					className="flex items-center space-x-2 lg:min-w-0 lg:flex-1"
					aria-label="Global"
				>
					<Link
						to="/"
						className="-m-1.5 p-1.5 text-2xl font-semibold text-gray-900 hover:text-gray-900"
					>
						Notee
					</Link>
					<a
						href="https://github.com/rphlmr/supa-stripe-stack"
						target="_blank"
						rel="noreferrer"
						className="inline-flex space-x-1"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
						>
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
						</svg>
						<span className="font-bold">GitHub</span>
					</a>
				</div>
				<div className="flex lg:hidden">
					<button
						type="button"
						className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
						onClick={() => setMobileMenuOpen(true)}
					>
						<span className="sr-only">Open main menu</span>
						<Bars3Icon className="h-6 w-6" aria-hidden="true" />
					</button>
				</div>
				{email ? (
					<div className="hidden lg:flex lg:min-w-0 lg:flex-1 lg:justify-center lg:gap-x-12">
						{navigation.map((item) => (
							<NavLink
								key={item.name}
								to={item.href}
								className={({ isActive }) =>
									tw(
										"font-semibold text-gray-900 hover:text-gray-900",
										isActive && "text-indigo-600",
									)
								}
							>
								{item.name}
							</NavLink>
						))}
					</div>
				) : null}
				<div className="hidden lg:flex lg:min-w-0 lg:flex-1 lg:items-center lg:justify-end lg:space-x-2">
					{email ? (
						<>
							<span className="text-base">
								{email} ({userTier?.name})
							</span>

							<Form action="/logout" method="post">
								<button
									data-test-id="logout"
									type="submit"
									className="inline-block rounded-lg px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-gray-900/10 hover:ring-gray-900/20"
								>
									Log out
								</button>
							</Form>
						</>
					) : (
						<Link
							to="/login"
							className="inline-block rounded-lg px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-gray-900/10 hover:ring-gray-900/20"
						>
							Log in
						</Link>
					)}
				</div>
			</nav>
			<Dialog as="div" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
				<Dialog.Panel className="fixed inset-0 z-10 overflow-y-auto bg-white p-6 lg:hidden">
					<div className="flex h-9 items-center justify-between">
						<div className="flex">
							<Link
								to="/"
								className="-m-1.5 p-1.5 text-2xl font-semibold text-gray-900 hover:text-gray-900"
							>
								Notee
							</Link>
						</div>
						<div className="flex">
							<button
								type="button"
								className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
								onClick={() => setMobileMenuOpen(false)}
							>
								<span className="sr-only">Close menu</span>
								<XMarkIcon
									className="h-6 w-6"
									aria-hidden="true"
								/>
							</button>
						</div>
					</div>
					<div className="mt-6 flow-root">
						<div className="-my-6 divide-y divide-gray-500/10">
							{email ? (
								<div className="space-y-2 py-6">
									{navigation.map((item) => (
										<NavLink
											key={item.name}
											to={item.href}
											className={({ isActive }) =>
												tw(
													"-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-400/10",
													isActive &&
														"text-indigo-600",
												)
											}
										>
											{item.name}
										</NavLink>
									))}
								</div>
							) : null}
							<div className="py-6">
								{email ? (
									<>
										<span className="text-base">
											{email}
										</span>

										<Form action="/logout" method="post">
											<button
												data-test-id="logout"
												type="submit"
												className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-6 text-gray-900 hover:bg-gray-400/10"
											>
												Log out
											</button>
										</Form>
									</>
								) : (
									<Link
										to="/login"
										className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-6 text-gray-900 hover:bg-gray-400/10"
									>
										Log in
									</Link>
								)}
							</div>
						</div>
					</div>
				</Dialog.Panel>
			</Dialog>
		</div>
	);
}

function ContentLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="isolate bg-white">
			<div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
				<svg
					className="relative left-[calc(50%-11rem)] -z-10 h-[21.1875rem] max-w-none -translate-x-1/2 rotate-[30deg] sm:left-[calc(50%-30rem)] sm:h-[42.375rem]"
					viewBox="0 0 1155 678"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fill="url(#45de2b6b-92d5-4d68-a6a0-9b9b2abad533)"
						fillOpacity=".3"
						d="M317.219 518.975L203.852 678 0 438.341l317.219 80.634 204.172-286.402c1.307 132.337 45.083 346.658 209.733 145.248C936.936 126.058 882.053-94.234 1031.02 41.331c119.18 108.451 130.68 295.337 121.53 375.223L855 299l21.173 362.054-558.954-142.079z"
					/>
					<defs>
						<linearGradient
							id="45de2b6b-92d5-4d68-a6a0-9b9b2abad533"
							x1="1155.49"
							x2="-78.208"
							y1=".177"
							y2="474.645"
							gradientUnits="userSpaceOnUse"
						>
							<stop stopColor="#9089FC" />
							<stop offset={1} stopColor="#FF80B5" />
						</linearGradient>
					</defs>
				</svg>
			</div>
			{children}
			<div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl">
				<svg
					className="relative left-[calc(50%+3rem)] max-w-none -translate-x-1/2 sm:left-[calc(50%+36rem)] sm:h-[42.375rem]"
					viewBox="0 0 1155 678"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fill="url(#ecb5b0c9-546c-4772-8c71-4d3f06d544bc)"
						fillOpacity=".3"
						d="M317.219 518.975L203.852 678 0 438.341l317.219 80.634 204.172-286.402c1.307 132.337 45.083 346.658 209.733 145.248C936.936 126.058 882.053-94.234 1031.02 41.331c119.18 108.451 130.68 295.337 121.53 375.223L855 299l21.173 362.054-558.954-142.079z"
					/>
					<defs>
						<linearGradient
							id="ecb5b0c9-546c-4772-8c71-4d3f06d544bc"
							x1="1155.49"
							x2="-78.208"
							y1=".177"
							y2="474.645"
							gradientUnits="userSpaceOnUse"
						>
							<stop stopColor="#9089FC" />
							<stop offset={1} stopColor="#FF80B5" />
						</linearGradient>
					</defs>
				</svg>
			</div>
		</div>
	);
}
