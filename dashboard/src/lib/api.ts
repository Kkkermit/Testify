import { type ApiErrorBody, CHANGE_WAY_HEADER, type ChangeWay } from "@testify/shared";

const BASE = "/api";
// The server sets the `__Host-` copy outside development and reads only that one there.
const CSRF_COOKIES = ["__Host-dash_csrf", "dash_csrf"];

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

/** The server's own words for a refusal, or the fallback when it gave none. */
export function refusalText(error: unknown, fallback: string): string {
	return error instanceof ApiError ? error.message : fallback;
}

export function isRefusal(error: unknown): boolean {
	return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

function readCookie(name: string): string | null {
	const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
	return match === undefined ? null : decodeURIComponent(match.slice(name.length + 1));
}

/** A write that puts a change back or brings a backup in says so, so the owners can count how settings change. */
interface WriteOptions {
	via?: Exclude<ChangeWay, "save" | "setup">;
}

async function request<T>(method: string, path: string, body?: unknown, options: WriteOptions = {}): Promise<T> {
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["content-type"] = "application/json";
	if (options.via !== undefined) headers[CHANGE_WAY_HEADER] = options.via;

	if (method !== "GET") {
		// Double-submit: the readable cookie echoed in a header the browser cannot set cross-site.
		const csrf = CSRF_COOKIES.map(readCookie).find((value) => value !== null) ?? null;
		if (csrf !== null) headers["x-csrf-token"] = csrf;
	}

	const response = await fetch(`${BASE}${path}`, {
		method,
		headers,
		credentials: "same-origin",
		// Only a keepalive request outlives the page, which is when an undoable delete is sent.
		keepalive: method === "DELETE",
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
		// A proxy or a crash can return HTML.
		return { error: { code: "unknown", message: `Request failed with status ${String(response.status)}.` } };
	}
}

export const api = {
	get: <T>(path: string): Promise<T> => request<T>("GET", path),
	post: <T>(path: string, body?: unknown): Promise<T> => request<T>("POST", path, body),
	patch: <T>(path: string, body?: unknown, options?: WriteOptions): Promise<T> =>
		request<T>("PATCH", path, body, options),
	put: <T>(path: string, body?: unknown, options?: WriteOptions): Promise<T> => request<T>("PUT", path, body, options),
	delete: <T>(path: string): Promise<T> => request<T>("DELETE", path),
};
