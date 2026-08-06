import { type ApiErrorBody } from "@testify/shared";

const BASE = "/api";
const CSRF_COOKIE = "dash_csrf";

/** Carries the API's `code` through, so a screen can tell "signed out" from "not allowed" without matching on prose. */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly issues: { path: string; message: string }[];

	constructor(status: number, body: ApiErrorBody) {
		super(body.error.message);
		this.name = "ApiError";
		this.status = status;
		this.code = body.error.code;
		this.issues = body.error.issues ?? [];
	}
}

function readCookie(name: string): string | null {
	const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
	return match === undefined ? null : decodeURIComponent(match.slice(name.length + 1));
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["content-type"] = "application/json";

	if (method !== "GET") {
		// Double-submit: the readable cookie echoed in a header the browser cannot set cross-site.
		const csrf = readCookie(CSRF_COOKIE);
		if (csrf !== null) headers["x-csrf-token"] = csrf;
	}

	const response = await fetch(`${BASE}${path}`, {
		method,
		headers,
		credentials: "same-origin",
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});

	if (!response.ok) throw new ApiError(response.status, await errorBody(response));
	if (response.status === 204) return undefined as T;

	return response.json() as Promise<T>;
}

async function errorBody(response: Response): Promise<ApiErrorBody> {
	try {
		return (await response.json()) as ApiErrorBody;
	} catch {
		// A proxy or a crash can return HTML. The status is still worth reporting.
		return { error: { code: "unknown", message: `Request failed with status ${String(response.status)}.` } };
	}
}

export const api = {
	get: <T>(path: string): Promise<T> => request<T>("GET", path),
	post: <T>(path: string, body?: unknown): Promise<T> => request<T>("POST", path, body),
	patch: <T>(path: string, body?: unknown): Promise<T> => request<T>("PATCH", path, body),
	put: <T>(path: string, body?: unknown): Promise<T> => request<T>("PUT", path, body),
	delete: <T>(path: string): Promise<T> => request<T>("DELETE", path),
};
