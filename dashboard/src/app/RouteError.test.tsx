import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, type RouteObject, RouterProvider } from "react-router";
import { RouteError } from "@/app/RouteError";
import { claimAutoReload, classifyRouteError, errorDetails, reloadPage } from "@/app/routeError.utils";
import en from "@/i18n/locales/en.json";
import { expectNoViolations } from "@/test/axe";

jest.mock("@/app/routeError.utils", () => ({
	...jest.requireActual<object>("@/app/routeError.utils"),
	reloadPage: jest.fn(),
}));

const STALE = new TypeError(
	"Failed to fetch dynamically imported module: http://localhost:5174/src/features/commands/CommandsPage.tsx",
);

function renderFailing(thrown: unknown, from: "render" | "loader" = "render"): ReturnType<typeof render> {
	function Thrower(): never {
		throw thrown;
	}

	const router = createMemoryRouter([
		{
			path: "/",
			element: <Thrower />,
			errorElement: <RouteError standalone />,
			// Only a loader's thrown Response becomes a route error response; a component's stays a plain object.
			...(from === "loader"
				? {
						loader: () => {
							throw thrown;
						},
					}
				: {}),
		},
	]);
	return render(<RouterProvider router={router} />);
}

beforeEach(() => {
	sessionStorage.clear();
	jest.mocked(reloadPage).mockClear();
	// React reports every error a boundary catches; the boundary handling it is what is under test.
	jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe("the route error screen", () => {
	/** A chunk that moved under an open tab is fixed by loading the new build, so the reader never sees a screen. */
	it("reloads once when a page's module has moved", async () => {
		renderFailing(STALE);

		await waitFor(() => {
			expect(reloadPage).toHaveBeenCalledTimes(1);
		});
		expect(screen.queryByText(en.routeError.staleHeading)).not.toBeInTheDocument();
	});

	/** Without the guard, a chunk that is genuinely missing reloads the tab for ever. */
	it("explains instead of reloading again when the reload did not help", async () => {
		claimAutoReload(sessionStorage);
		renderFailing(STALE);

		expect(await screen.findByRole("heading", { level: 1, name: en.routeError.staleTitle })).toBeInTheDocument();
		expect(reloadPage).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: en.routeError.reload })).toBeInTheDocument();
	});

	/** The default screen printed the module URL and a note to developers; a reader should see neither. */
	it("keeps the error's own text off the page", () => {
		renderFailing(new Error("Cannot read properties of undefined (reading 'secret') at /src/features/x.tsx"));

		expect(screen.getByRole("heading", { level: 1, name: en.routeError.crashTitle })).toBeInTheDocument();
		expect(screen.getByText(en.routeError.crashBody)).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/secret|\.tsx|Hey developer/);
		expect(screen.queryByText(en.routeError.details)).not.toBeInTheDocument();
	});

	it("offers a reload and a way back to the servers", () => {
		renderFailing(new Error("boom"));

		screen.getByRole("button", { name: en.routeError.reload }).click();
		expect(reloadPage).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("link", { name: en.error.backToServers })).toHaveAttribute("href", "/guilds");
	});

	it("shows the 404 page for a route that answered not found", async () => {
		renderFailing(new Response(null, { status: 404, statusText: "Not Found" }), "loader");

		expect(await screen.findByRole("heading", { level: 1, name: en.notFound.title })).toBeInTheDocument();
	});

	it("survives a thrown value that is not an Error at all", () => {
		renderFailing("plain text");

		expect(screen.getByRole("heading", { level: 1, name: en.routeError.crashTitle })).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderFailing(new Error("boom"));

		await expectNoViolations(container);
	});
});

describe("classifyRouteError", () => {
	it.each([
		"Failed to fetch dynamically imported module: /src/a.tsx",
		"error loading dynamically imported module: /src/a.tsx",
		"Importing a module script failed.",
	])("reads %s as a moved module", (message) => {
		expect(classifyRouteError(new TypeError(message))).toBe("stale");
	});

	it("treats anything else as a crash", () => {
		expect(classifyRouteError(new Error("boom"))).toBe("crash");
		expect(classifyRouteError("text")).toBe("crash");
		expect(classifyRouteError(null)).toBe("crash");
	});
});

describe("claimAutoReload", () => {
	it("grants one reload per window", () => {
		expect(claimAutoReload(sessionStorage, 1_000)).toBe(true);
		expect(claimAutoReload(sessionStorage, 20_000)).toBe(false);
		expect(claimAutoReload(sessionStorage, 40_000)).toBe(true);
	});

	it("refuses when storage is missing or throws, rather than risking a loop", () => {
		const broken = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: jest.fn(),
		};

		expect(claimAutoReload(null)).toBe(false);
		expect(claimAutoReload(broken)).toBe(false);
	});
});

describe("errorDetails", () => {
	it("prefers a stack and falls back to plain text", () => {
		const error = new Error("boom");

		expect(errorDetails(error)).toBe(error.stack);
		expect(errorDetails("plain")).toBe("plain");
	});
});

function* walk(routes: RouteObject[]): Generator<RouteObject> {
	for (const route of routes) {
		yield route;
		if (route.children !== undefined) yield* walk(route.children);
	}
}

describe("where the error screens sit", () => {
	/** A page that fails inside the shell keeps the sidebar, so the reader can go somewhere else. */
	it("catches page failures inside the shell", async () => {
		const { routes } = await import("@/routes");
		const boundary = [...walk(routes as RouteObject[])].find((route) => route.errorElement !== undefined);

		expect(boundary?.children?.some((route) => route.path === "/guilds")).toBe(true);
	});
});
