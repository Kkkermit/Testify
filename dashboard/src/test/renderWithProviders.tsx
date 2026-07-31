import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { type ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

/**
 * A fresh QueryClient per test, or one test's cached `/auth/me` answers the next one's question. Retries are
 * off so a deliberate 500 fails in milliseconds rather than after a backoff.
 */
export function renderWithProviders(
	ui: ReactElement,
	options: { route?: string; path?: string } = {},
): RenderResult & { client: QueryClient } {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

	const router = createMemoryRouter([{ path: options.path ?? "/", element: ui }], {
		initialEntries: [options.route ?? options.path ?? "/"],
	});

	return {
		...render(
			<QueryClientProvider client={client}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		),
		client,
	};
}
