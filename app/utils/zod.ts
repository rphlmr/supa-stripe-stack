import type { z, ZodCustomIssue, ZodIssue } from "zod";

import { SupaStripeStackError } from "./error";

type ZodCustomIssueWithMessage = ZodCustomIssue & { message: string };

export function createFormIssues(
	issues?: ZodIssue[],
): ZodCustomIssueWithMessage[] | undefined {
	return issues?.map(({ message, path }) => ({
		code: "custom",
		message,
		path,
	}));
}

function sanitizeSensitiveData(data: unknown) {
	if (!data || typeof data !== "object") return data;

	let sanitizedData = data;

	if ("password" in data) {
		sanitizedData = { ...sanitizedData, password: "🤫" };
	}

	if ("confirmPassword" in data) {
		sanitizedData = { ...sanitizedData, confirmPassword: "🤫" };
	}

	return sanitizedData;
}

export async function parseData<T extends z.ZodTypeAny>(
	data: unknown,
	schema: T,
	message: string,
) {
	const result = await schema.safeParseAsync(data);

	if (!result.success) {
		const issues = result.error.issues;

		throw new SupaStripeStackError({
			message,
			status: 400,
			metadata: { issues, data: sanitizeSensitiveData(data) },
			tag: "Payload validation 👾",
		});
	}

	return result.data as z.infer<T>;
}
