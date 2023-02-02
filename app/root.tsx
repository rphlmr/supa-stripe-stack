import { Fragment, useEffect, useState } from "react";

import { Dialog, Transition } from "@headlessui/react";
import { Bars3Icon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node";
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

import type { Failure } from "~/utils";
import { getBrowserEnv, tw, response } from "~/utils";

import { isAnonymousSession, requireAuthSession } from "./modules/auth";
import { getUserTier } from "./modules/user";
import tailwindStylesheetUrl from "./styles/tailwind.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheetUrl },
];

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Notee",
  viewport: "width=device-width,initial-scale=1",
});

export async function loader({ request }: LoaderArgs) {
  const isAnonymous = await isAnonymousSession(request);

  if (isAnonymous) {
    return response.ok(
      {
        env: getBrowserEnv(),
        email: null,
        userTier: null,
      },
      { authSession: null }
    );
  }

  const authSession = await requireAuthSession(request);

  const userTier = await getUserTier(authSession.userId);

  if (userTier.error) {
    throw response.serverError(userTier.error, { authSession });
  }

  return response.ok(
    {
      env: getBrowserEnv(),
      email: authSession?.email,
      userTier: userTier.data,
    },
    { authSession }
  );
}

export default function App() {
  const { env } = useLoaderData<typeof loader>().data;

  return (
    <html className="h-full">
      <head>
        <Meta />
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

  const error = fetchers.map((f) => (f.data as Failure | null)?.error)[0];

  useEffect(() => {
    if (error) {
      setShow(true);
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
                          {JSON.stringify(error.metadata, null, 2)}
                        </pre>
                      </p>
                    ) : null}
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      className="inline-flex rounded-md bg-white text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:text-gray-500"
                      onClick={() => {
                        setShow(false);
                      }}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
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
  const { email, userTier } = useLoaderData<typeof loader>().data;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div>
      <nav
        className="flex h-9 items-center justify-between"
        aria-label="Global"
      >
        <div className="flex lg:min-w-0 lg:flex-1" aria-label="Global">
          <Link
            to="/"
            className="-m-1.5 p-1.5 text-2xl font-semibold text-gray-900 hover:text-gray-900"
          >
            Notee
          </Link>
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
                    isActive && "text-indigo-600"
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
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
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
                          "-mx-3 block rounded-lg py-2 px-3 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-400/10",
                          isActive && "text-indigo-600"
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
                    <span className="text-base">{email}</span>

                    <Form action="/logout" method="post">
                      <button
                        data-test-id="logout"
                        type="submit"
                        className="-mx-3 block rounded-lg py-2.5 px-3 text-base font-semibold leading-6 text-gray-900 hover:bg-gray-400/10"
                      >
                        Log out
                      </button>
                    </Form>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="-mx-3 block rounded-lg py-2.5 px-3 text-base font-semibold leading-6 text-gray-900 hover:bg-gray-400/10"
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
      <div className="absolute inset-x-0 -z-10 transform-gpu overflow-hidden blur-3xl">
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
