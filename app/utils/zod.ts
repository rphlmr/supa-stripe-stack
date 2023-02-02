import type { z, ZodCustomIssue, ZodIssue } from "zod";

import { failure, success } from "./resolvers";

type ZodCustomIssueWithMessage = ZodCustomIssue & { message: string };

export function createFormIssues(
  issues?: ZodIssue[]
): ZodCustomIssueWithMessage[] | undefined {
  return issues?.map(({ message, path }) => ({
    code: "custom",
    message,
    path,
  }));
}

export async function parseData<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T,
  message: string
) {
  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    const issues = result.error.issues;

    return failure({
      message,
      metadata: { issues, data },
      tag: "Payload validation 👾",
    });
  }

  return success(result.data as z.infer<T>);
}
