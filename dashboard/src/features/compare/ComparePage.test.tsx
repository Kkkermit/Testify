import { type GuildOverview } from "@testify/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ComparePage } from "@/features/compare/ComparePage";
import { expectNoViolations } from "@/test/axe";
import { overview } from "@/test/fixtures/server";
import { aGuild, me } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const OTHER = { ...aGuild, id: "900000000000000004", name: "Gaming Hub" };

function twoServers(second: Partial<GuildOverview> | number = {}): void {
	server.use(
		http.get("/api/auth/me", () => HttpResponse.json({ ...me, guilds: [aGuild, OTHER] })),
		http.get(`/api/guilds/${OTHER.id}/overview`, () =>
			typeof second === "number"
				? HttpResponse.json({ error: { code: "forbidden", message: "No." } }, { status: second })
				: HttpResponse.json({ ...overview, id: OTHER.id, name: OTHER.name, ...second }),
		),
	);
}

function renderPage(search = ""): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ComparePage />, { route: `/guilds/compare${search}`, path: "/guilds/compare" });
}

describe("the side-by-side page", () => {
	it("puts each server in a column and each feature in a row", async () => {
		twoServers();
		renderPage();

		const table = await screen.findByRole("table");
		expect(within(table).getByRole("columnheader", { name: /Test Server/ })).toBeInTheDocument();
		expect(within(table).getByRole("columnheader", { name: /Gaming Hub/ })).toBeInTheDocument();
		expect(within(table).getByRole("rowheader", { name: /Levelling/ })).toBeInTheDocument();
	});

	/** Each column is that server's own overview, so losing access to one says so there and leaves the rest. */
	it("names a server the reader can no longer manage, and keeps the other column", async () => {
		twoServers(403);
		renderPage();

		expect(await screen.findByText("You can no longer manage this server.")).toBeInTheDocument();
		expect(screen.getAllByText("Not known").length).toBeGreaterThan(0);
		expect(screen.getAllByRole("link", { name: /On|Off/ }).length).toBeGreaterThan(0);
	});

	it("hides the features set up alike when asked for only the differences", async () => {
		const user = userEvent.setup();
		twoServers({ features: overview.features.map((f) => (f.key === "levelling" ? { ...f, enabled: !f.enabled } : f)) });
		renderPage();
		await screen.findByRole("rowheader", { name: /Levelling/ });
		const before = screen.getAllByRole("rowheader").length;

		await user.click(screen.getByRole("switch", { name: "Only show where they differ" }));

		expect(screen.getByRole("rowheader", { name: /Levelling/ })).toBeInTheDocument();
		expect(screen.getAllByRole("rowheader").length).toBeLessThan(before);
	});

	it("explains itself to somebody who manages one server", async () => {
		renderPage();

		expect(await screen.findByText("Side by side needs two servers")).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		twoServers();
		const { container } = renderPage();
		await screen.findByRole("rowheader", { name: /Levelling/ });

		await expectNoViolations(container);
	});
});
