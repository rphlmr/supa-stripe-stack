import * as React from "react";

import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { Form, Link, useSearchParams, useTransition } from "@remix-run/react";
import { parseFormAny, useZorm } from "react-zorm";
import { z } from "zod";

import { Button } from "~/components";
import { createAuthSession, isAnonymousSession } from "~/modules/auth";
import { getUserByEmail, createUserAccount } from "~/modules/user";
import { response, isFormProcessing, parseData } from "~/utils";

export async function loader({ request }: LoaderArgs) {
  const isAnonymous = await isAnonymousSession(request);

  if (!isAnonymous) {
    return response.redirect("/app", { authSession: null });
  }

  return response.ok(null, { authSession: null });
}

const JoinFormSchema = z.object({
  email: z
    .string()
    .email("invalid-email")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(8, "password-too-short"),
  name: z.string().min(1, "name-too-short"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: ActionArgs) {
  const payload = await parseData(
    parseFormAny(await request.formData()),
    JoinFormSchema,
    "Join form payload is invalid"
  );

  if (payload.error) {
    return response.badRequest(payload.error, { authSession: null });
  }

  const { email, password, name, redirectTo } = payload.data;

  const existingUser = await getUserByEmail(email);

  if (existingUser.error) {
    return response.serverError(existingUser.error, { authSession: null });
  }

  if (existingUser.data) {
    return response.serverError(
      {
        message: "This email has already been used",
        metadata: { email },
      },
      { authSession: null }
    );
  }

  const authSession = await createUserAccount({
    email,
    password,
    name,
  });

  if (authSession.error) {
    return response.serverError(authSession.error, { authSession: null });
  }

  return createAuthSession({
    request,
    authSession: authSession.data,
    redirectTo: redirectTo || "/app",
  });
}

export default function Join() {
  const zo = useZorm("NewQuestionWizardScreen", JoinFormSchema);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const transition = useTransition();
  const isProcessing = isFormProcessing(transition.state);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <Form ref={zo.ref} method="post" className="space-y-6" replace>
          <h1 className="text-2xl">Create an account</h1>

          <div>
            <label
              htmlFor={zo.fields.name()}
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <div className="mt-1">
              <input
                data-test-id="name"
                required
                autoFocus={true}
                name={zo.fields.name()}
                type="text"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                disabled={isProcessing}
              />
              {zo.errors.name()?.message && (
                <div className="pt-1 text-red-700" id="name-error">
                  {zo.errors.name()?.message}
                </div>
              )}
            </div>
          </div>

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
                name={zo.fields.email()}
                type="email"
                autoComplete="email"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                disabled={isProcessing}
              />
              {zo.errors.email()?.message && (
                <div className="pt-1 text-red-700" id="email-error">
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
                <div className="pt-1 text-red-700" id="password-error">
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
            {isProcessing ? "..." : "Create Account"}
          </Button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                className="text-indigo-500 underline"
                to={{
                  pathname: "/login",
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
