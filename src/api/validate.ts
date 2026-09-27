import { type Context } from "hono";
import { type ZodType } from "zod";
import { type ApiIssue, badRequest } from "@api/errors";

/** Every value that reaches a handler goes through one of these; nothing reads `c.req.param()` or a raw body. */

function issuesOf(error: { issues: { path: PropertyKey[]; message: string }[] }): ApiIssue[] {
	return error.issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message }));
}

function parse<T>(schema: ZodType<T>, value: unknown, what: string): T {
	const result = schema.safeParse(value);
	if (result.success) return result.data;

	throw badRequest(`Those ${what} are not valid.`, issuesOf(result.error));
}

export function parseParams<T>(context: Context, schema: ZodType<T>): T {
	return parse(schema, context.req.param(), "parameters");
}

export function parseQuery<T>(context: Context, schema: ZodType<T>): T {
	return parse(schema, context.req.query(), "query parameters");
}

/** A body that is not JSON becomes the 400 it is, not a 500. */
export async function parseBody<T>(context: Context, schema: ZodType<T>): Promise<T> {
	let body: unknown;

	try {
		body = await context.req.json();
	} catch {
		throw badRequest("The request body is not valid JSON.");
	}

	return parse(schema, body, "fields");
}
