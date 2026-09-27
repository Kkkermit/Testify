import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { AuditLogPage } from "@/features/audit-log/AuditLogPage";
import { GiveawaysPage } from "@/features/giveaways/GiveawaysPage";
import { LotteryPage } from "@/features/lottery/LotteryPage";
import { MembersPage } from "@/features/members/MembersPage";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { TreasurePage } from "@/features/treasure/TreasurePage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

/** Every guild screen reports a failed read with a retry, and keeps a single `<h1>`. */

const GUILD = "900000000000000001";

const SCREENS: { name: string; path: string; endpoint: string; element: React.JSX.Element }[] = [
	{ name: "audit log", path: "audit-log", endpoint: "audit-log", element: <AuditLogPage /> },
	{ name: "treasure", path: "treasure", endpoint: "treasure", element: <TreasurePage /> },
	{ name: "tickets", path: "tickets", endpoint: "tickets", element: <TicketsPage /> },
	{ name: "lottery", path: "lottery", endpoint: "lottery", element: <LotteryPage /> },
	{ name: "giveaways", path: "giveaways", endpoint: "giveaways", element: <GiveawaysPage /> },
	{ name: "members", path: "members", endpoint: "members/leaderboard", element: <MembersPage /> },
];

describe("a guild screen whose read fails", () => {
	it.each(SCREENS)("offers a retry on $name rather than a skeleton", async ({ path, endpoint, element }) => {
		server.use(
			http.get(`/api/guilds/:guildId/${endpoint}`, () =>
				HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
			),
		);

		renderWithProviders(element, { path: `/guilds/:guildId/${path}`, route: `/guilds/${GUILD}/${path}` });

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it.each(SCREENS)("keeps one h1 on $name", async ({ path, endpoint, element }) => {
		server.use(
			http.get(`/api/guilds/:guildId/${endpoint}`, () =>
				HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
			),
		);

		renderWithProviders(element, { path: `/guilds/:guildId/${path}`, route: `/guilds/${GUILD}/${path}` });

		await screen.findByRole("button", { name: /try again/i });

		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
	});
});
