import { type ZodType } from "zod";
import { LIMITS } from "../config/constants";
import { ExternalApiError } from "../core/errors";

/**
 * Every outbound HTTP call goes through here: one timeout policy, one error type,
 * and schema validation at the boundary. Third-party APIs change without notice,
 * and the previous code consumed every response untyped — each failure collapsing
 * to `null` or an unhandled `TypeError`.
 */

export interface RequestOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string;
	timeoutMs?: number;
	/** Query parameters appended to the URL, skipping undefined values. */
	query?: Record<string, string | number | boolean | undefined>;
}

function withQuery(url: string, query: RequestOptions["query"]): string {
	if (!query) return url;
	const target = new URL(url);
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined) target.searchParams.set(key, String(value));
	}
	return target.toString();
}

export async function fetchRaw(service: string, url: string, options: RequestOptions = {}): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? LIMITS.externalApiTimeoutMs);

	try {
		const response = await fetch(withQuery(url, options.query), {
			method: options.method ?? "GET",
			...(options.headers !== undefined ? { headers: options.headers } : {}),
			...(options.body !== undefined ? { body: options.body } : {}),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new ExternalApiError(service, new Error(`HTTP ${response.status} from ${url}`));
		}

		return response;
	} catch (error) {
		if (error instanceof ExternalApiError) throw error;
		throw new ExternalApiError(service, error);
	} finally {
		clearTimeout(timeout);
	}
}

export async function fetchJson<T>(
	service: string,
	url: string,
	schema: ZodType<T>,
	options: RequestOptions = {},
): Promise<T> {
	const response = await fetchRaw(service, url, options);

	let payload: unknown;
	try {
		payload = await response.json();
	} catch (error) {
		throw new ExternalApiError(service, error);
	}

	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		throw new ExternalApiError(service, new Error(`Unexpected response shape: ${parsed.error.message}`));
	}
	return parsed.data;
}

export async function fetchText(service: string, url: string, options: RequestOptions = {}): Promise<string> {
	const response = await fetchRaw(service, url, options);
	return response.text();
}

export async function fetchBuffer(service: string, url: string, options: RequestOptions = {}): Promise<Buffer> {
	const response = await fetchRaw(service, url, options);
	return Buffer.from(await response.arrayBuffer());
}
