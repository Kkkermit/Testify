import { screen } from "@testing-library/react";
import { UptimeStrip } from "@/features/status/components/UptimeStrip";
import { renderWithProviders } from "@/test/renderWithProviders";

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

/** A stored day read as a local moment labelled every day of the strip one day early for anybody west of UTC. */
it("names each day as the day it is, whatever the reader's time zone", () => {
	renderWithProviders(<UptimeStrip days={[{ day: "2026-11-01", uptime: 1 }]} />);

	expect(screen.getByRole("rowheader", { name: "1 Nov 2026" })).toBeInTheDocument();
});
