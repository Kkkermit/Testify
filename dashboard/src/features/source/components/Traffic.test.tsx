import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Traffic } from "@/features/source/components/Traffic";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const RealDateTimeFormat = Intl.DateTimeFormat;

// A reader in New York: every formatter that names no zone of its own formats in theirs.
beforeAll(() => {
	jest
		.spyOn(Intl, "DateTimeFormat")
		.mockImplementation(
			(locale, options) => new RealDateTimeFormat(locale, { timeZone: "America/New_York", ...options }),
		);
});

afterAll(() => {
	jest.restoreAllMocks();
});

/** GitHub counts in UTC days, and reading one as a local moment put every bar a day early west of UTC. */
it("names each day as GitHub counted it, whatever the reader's time zone", async () => {
	server.use(
		http.get("/api/site/traffic", () =>
			HttpResponse.json({
				available: true,
				days: [{ date: "2026-11-01", views: 1_234, uniqueViews: 4, clones: 0, uniqueClones: 0 }],
				referrers: [],
				pages: [],
			}),
		),
	);
	renderWithProviders(<Traffic />);

	const views = await screen.findByRole("table", { name: "Views" });
	expect(within(views).getByRole("rowheader", { name: "1 Nov 2026" })).toBeInTheDocument();
	expect(within(views).getByRole("cell", { name: "1,234" })).toBeInTheDocument();
});
