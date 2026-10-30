import { createMemoryRouter } from "react-router";
import { followTrails, rememberTrail, trailFor } from "@/lib/trail";

function routerAt(start: string) {
	const router = createMemoryRouter([{ path: "*", element: null }], { initialEntries: [start] });
	followTrails(router);
	return router;
}

beforeEach(() => {
	sessionStorage.clear();
});

describe("followTrails", () => {
	/** Back has to know the page a link was followed from, and only a link out of the docs or the source leaves one. */
	it("remembers where a docs or source link was followed from, and nothing else", async () => {
		const docs = routerAt("/docs/quick-start?step=2#install");
		await docs.navigate("/source-code/src/index.ts");
		expect(trailFor(docs.state.location.key)).toEqual({
			pathname: "/docs/quick-start",
			search: "?step=2",
			hash: "#install",
		});

		// A jump within the page is not a new page.
		await docs.navigate("/source-code/src/index.ts#exports");
		expect(trailFor(docs.state.location.key)).toBeNull();

		await docs.navigate("/terms", { replace: true });
		expect(trailFor(docs.state.location.key)).toBeNull();

		const landing = routerAt("/");
		await landing.navigate("/docs");
		expect(trailFor(landing.state.location.key)).toBeNull();
	});

	/** Back and Forward return to an entry rather than making one, so its trail must still be there. */
	it("keeps an entry's trail through Back and Forward", async () => {
		const router = routerAt("/docs/configuration");
		await router.navigate("/docs/docker");
		const key = router.state.location.key;

		await router.navigate(-1);
		await router.navigate(1);

		expect(router.state.location.key).toBe(key);
		expect(trailFor(key)?.pathname).toBe("/docs/configuration");
	});
});

describe("trailFor", () => {
	/** Storage outlives the page, so what is read back is checked before it becomes a link. */
	it("reads a trail kept across a reload, and refuses anything that is not a docs or source page", () => {
		rememberTrail("kept", { pathname: "/docs/setup", search: "", hash: "" });
		sessionStorage.setItem(
			"testify:trail",
			JSON.stringify({
				...JSON.parse(sessionStorage.getItem("testify:trail") ?? "{}"),
				reloaded: { pathname: "/source-code", search: "", hash: "" },
				offsite: { pathname: "//evil.example", search: "", hash: "" },
				broken: "not a trail",
			}),
		);

		expect(trailFor("kept")?.pathname).toBe("/docs/setup");
		expect(trailFor("reloaded")?.pathname).toBe("/source-code");
		expect(trailFor("offsite")).toBeNull();
		expect(trailFor("broken")).toBeNull();
		expect(trailFor("never")).toBeNull();
	});
});
