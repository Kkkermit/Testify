import { type ContentfulStatusCode } from "hono/utils/http-status";
import { type ApiErrorBody } from "@testify/shared";

export interface ApiIssue {
	path: string;
	message: string;
}

/**
 * A refusal with a status attached. The `code` is what the SPA branches on, so it must stay stable even when
 * the wording changes; the `message` is shown to a person and must never carry a stack, a path or an internal
 * identifier.
 */
export class ApiProblem extends Error {
	readonly status: ContentfulStatusCode;
	readonly code: string;
	readonly issues: ApiIssue[];
	/** Set on the response by the error boundary, which builds a fresh one and would otherwise drop them. */
	readonly headers: Record<string, string>;

	constructor(
		status: ContentfulStatusCode,
		code: string,
		message: string,
		issues: ApiIssue[] = [],
		headers: Record<string, string> = {},
	) {
		super(message);
		this.name = "ApiProblem";
		this.status = status;
		this.code = code;
		this.issues = issues;
		this.headers = headers;
	}
}

export function problemBody(problem: ApiProblem): ApiErrorBody {
	return {
		error: {
			code: problem.code,
			message: problem.message,
			...(problem.issues.length > 0 ? { issues: problem.issues } : {}),
		},
	};
}

export const badRequest = (message: string, issues: ApiIssue[] = []): ApiProblem =>
	new ApiProblem(400, "invalid", message, issues);

export const unauthorised = (): ApiProblem =>
	new ApiProblem(401, "unauthenticated", "You are not signed in, or your session has expired.");

export const forbidden = (code: string, message: string): ApiProblem => new ApiProblem(403, code, message);

export const notFound = (code = "not_found", message = "No such endpoint."): ApiProblem =>
	new ApiProblem(404, code, message);

export const tooManyRequests = (retryAfterSeconds: number): ApiProblem =>
	new ApiProblem(
		429,
		"rate_limited",
		`Too many requests. Try again in ${String(retryAfterSeconds)} second${retryAfterSeconds === 1 ? "" : "s"}.`,
		[],
		{ "Retry-After": String(retryAfterSeconds) },
	);
