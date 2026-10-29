import { http, HttpResponse } from "msw";
import { api } from "@/lib/api";
import { server } from "@/test/setup";

function clearCookies(): void {
	for (const part of document.cookie.split("; ")) {
		document.cookie = `${part.split("=")[0] ?? ""}=; max-age=0`;
	}
}

describe("the API client", () => {
	afterEach(clearCookies);

	/** The double-submit token is what stops another site posting on the signed-in user's behalf. */
	it("echoes the CSRF cookie back as a header on a write", async () => {
		document.cookie = "dash_csrf=a-secret";
		let sent: string | null = null;
		server.use(
			http.post("/api/thing", ({ request }) => {
				sent = request.headers.get("x-csrf-token");
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await api.post("/thing");
		expect(sent).toBe("a-secret");
	});

	/** A GET can never mutate anything, so sending the token on one would only widen where it leaks. */
	it("does not send the token on a read", async () => {
		document.cookie = "dash_csrf=a-secret";
		let sent: string | null = "unset";
		server.use(
			http.get("/api/thing", ({ request }) => {
				sent = request.headers.get("x-csrf-token");
				return HttpResponse.json({});
			}),
		);

		await api.get("/thing");
		expect(sent).toBeNull();
	});

	it("copes with there being no CSRF cookie yet", async () => {
		server.use(http.delete("/api/thing", () => new HttpResponse(null, { status: 204 })));

		await expect(api.delete("/thing")).resolves.toBeUndefined();
	});

	/** A 204 has no body, and calling `.json()` on it throws. */
	it("returns nothing for an empty response", async () => {
		server.use(http.post("/api/thing", () => new HttpResponse(null, { status: 204 })));

		expect(await api.post("/thing")).toBeUndefined();
	});

	/** A reverse proxy returning an HTML error page must not become "undefined is not an object". */
	it("still reports the status when the error body is not JSON", async () => {
		server.use(http.get("/api/thing", () => new HttpResponse("<html>gateway</html>", { status: 502 })));

		await expect(api.get("/thing")).rejects.toThrow(/status 502/);
	});
});
