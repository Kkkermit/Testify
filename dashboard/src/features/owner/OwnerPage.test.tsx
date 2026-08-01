import { type OwnerGuildRow, type OwnerStats, type Paged } from "@testify/shared";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { formatUptime, pageCount, pageFrom } from "@/features/owner/owner.utils";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const stats: OwnerStats = {
	guilds: 3,
	users: 4_200,
	uptimeMs: 90_000_000,
	memoryMb: 128,
	commands: 76,
	database: "connected",
};

function row(overrides: Partial<OwnerGuildRow> = {}): OwnerGuildRow {
	return {
		id: "900000000000000001",
		name: "Test Server",
		iconUrl: null,
		memberCount: 1_234,
		joinedAt: null,
		configured: ["levelling"],
		...overrides,
	};
}

function page(items: OwnerGuildRow[], total = items.length): Paged<OwnerGuildRow> {
	return { items, total, page: 1, perPage: 25 };
}

function useOwnerApi(items: OwnerGuildRow[], total?: number): void {
	server.use(
		http.get("/api/owner/stats", () => HttpResponse.json(stats)),
		http.get("/api/owner/guilds", () => HttpResponse.json(page(items, total))),
	);
}

describe("pageFrom", () => {
	/** A page number out of a URL can be anything at all. */
	it("falls back to the first page for anything that is not one", () => {
		for (const raw of [null, "", "0", "-3", "abc", "1.5", "1e9999"]) {
			expect(pageFrom(raw)).toBe(1);
		}
	});

	it("reads a real page number", () => {
		expect(pageFrom("4")).toBe(4);
	});
});

describe("formatUptime", () => {
	it("reads at the scale it is at", () => {
		expect(formatUptime(90_000_000)).toBe("1d 1h");
		expect(formatUptime(3_900_000)).toBe("1h 5m");
		expect(formatUptime(120_000)).toBe("2m");
	});
});

describe("pageCount", () => {
	it("rounds a part-full last page up", () => {
		expect(pageCount(51, 25)).toBe(3);
	});

	/** Zero servers is still one page, or the pager renders "Page 1 of 0". */
	it("is never less than one", () => {
		expect(pageCount(0, 25)).toBe(1);
		expect(pageCount(10, 0)).toBe(1);
	});
});

describe("the owner console", () => {
	it("shows the fleet's numbers", async () => {
		useOwnerApi([row()]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByText("4,200")).toBeInTheDocument();
		expect(screen.getByText("1d 1h")).toBeInTheDocument();
		expect(screen.getByText("connected")).toBeInTheDocument();
	});

	/** The question this screen exists to answer: which of my servers has never configured anything. */
	it("calls out a server with nothing set up", async () => {
		useOwnerApi([row({ configured: [] })]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByText("Nothing set up")).toBeInTheDocument();
	});

	it("lists what each server has configured", async () => {
		useOwnerApi([row({ configured: ["levelling", "welcome"] })]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByText("levelling")).toBeInTheDocument();
		expect(screen.getByText("welcome")).toBeInTheDocument();
	});

	it("renders the servers as a real table, so it can be read by a screen reader", async () => {
		useOwnerApi([row()]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByRole("table")).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Server" })).toBeInTheDocument();
	});

	it("hides the pager when everything fits on one page", async () => {
		useOwnerApi([row()]);
		renderWithProviders(<OwnerPage />, { path: "/owner" });
		await screen.findByRole("table");

		expect(screen.queryByRole("navigation", { name: /pages/i })).toBeNull();
	});

	it("pages when there is more than one page, and disables the ends", async () => {
		useOwnerApi([row()], 60);
		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByRole("navigation", { name: /pages/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
		expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
	});

	/** A manager who guesses the URL gets a 404, and the screen must not confirm the console exists. */
	it("does not confirm the console exists when the API refuses", async () => {
		server.use(
			http.get("/api/owner/stats", () =>
				HttpResponse.json({ error: { code: "not_found", message: "No such endpoint." } }, { status: 404 }),
			),
			http.get("/api/owner/guilds", () =>
				HttpResponse.json({ error: { code: "not_found", message: "No such endpoint." } }, { status: 404 }),
			),
		);

		renderWithProviders(<OwnerPage />, { path: "/owner" });

		expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
		expect(screen.queryByRole("table")).toBeNull();
	});
});

describe("OwnerPage accessibility", () => {
	it("has no automatically detectable violations", async () => {
		useOwnerApi([row()]);
		const { container } = renderWithProviders(<OwnerPage />, { path: "/owner" });
		await screen.findByRole("table");

		await expectNoViolations(container);
	});
});
