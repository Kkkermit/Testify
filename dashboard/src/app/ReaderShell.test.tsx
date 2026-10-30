import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ReaderShell } from "@/app/ReaderShell";
import { me } from "@/test/fixtures/session";
import { siteInfo } from "@/test/fixtures/site";
import { server } from "@/test/setup";

function renderAppearance(): void {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const router = createMemoryRouter(
		[{ element: <ReaderShell />, children: [{ path: "/appearance", element: <h1>Appearance</h1> }] }],
		{ initialEntries: ["/appearance"] },
	);
	render(
		<QueryClientProvider client={client}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
}

// Reduced motion skips the WebGL backdrop, which jsdom has no canvas to draw.
beforeEach(() => {
	document.documentElement.setAttribute("data-motion", "reduced");
});

afterEach(() => {
	document.documentElement.removeAttribute("data-motion");
});

describe("the appearance page's frame", () => {
	/** Theme, accent and language are the reader's, so a visitor with no account reaches them from the website. */
	it("opens in the website for somebody signed out", async () => {
		server.use(
			http.get("/api/auth/me", () =>
				HttpResponse.json({ error: { code: "unauthenticated", message: "no" } }, { status: 401 }),
			),
		);
		renderAppearance();

		expect(await screen.findByRole("navigation", { name: "Website" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
	});

	it("stays in the dashboard for somebody signed in", async () => {
		renderAppearance();

		expect(await screen.findByRole("link", { name: /skip to content/i })).toBeInTheDocument();
		expect(screen.queryByRole("navigation", { name: "Website" })).toBeNull();
	});

	/** A host with no dashboard would only refuse, so it is never asked who is signed in. */
	it("never asks who is signed in on a host with no dashboard", async () => {
		const asked = jest.fn();
		server.use(
			http.get("/api/site", () => HttpResponse.json({ ...siteInfo, dashboard: false })),
			http.get("/api/auth/me", () => {
				asked();
				return HttpResponse.json(me);
			}),
		);
		renderAppearance();

		expect(await screen.findByRole("navigation", { name: "Website" })).toBeInTheDocument();
		expect(asked).not.toHaveBeenCalled();
	});
});
