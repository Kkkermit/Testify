import { type Notice, type NoticeFeed } from "@testify/shared";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { NoticeBanner } from "@/features/notices/components/NoticeBanner";
import { NotificationsPage } from "@/features/notices/NotificationsPage";
import { expectNoViolations } from "@/test/axe";
import { musicNotice } from "@/test/fixtures/bot";
import { me } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const OLDER: Notice = {
	...musicNotice,
	id: "b".repeat(24),
	title: "Casino maintenance",
	body: "Blackjack is back.",
	tone: "fixed",
	publishedAt: "2026-10-01T10:00:00.000Z",
	updatedAt: "2026-10-03T10:00:00.000Z",
};

function feedOf(feed: NoticeFeed, seen: { count: number } = { count: 0 }): void {
	server.use(
		http.get("/api/notices", () => HttpResponse.json(feed)),
		http.post("/api/notices/seen", () => {
			seen.count += 1;
			return HttpResponse.json({ ...feed, unread: 0 });
		}),
	);
}

describe("the notifications page", () => {
	/** Reading the page is reading them, and the badges stay put while they are read rather than vanishing. */
	it("marks what is new, then marks it read once, keeping the badge", async () => {
		const seen = { count: 0 };
		feedOf({ notices: [musicNotice, OLDER], unread: 1 }, seen);

		const { container } = renderWithProviders(<NotificationsPage />, { path: "/notifications" });

		const newest = (await screen.findByRole("heading", { name: "Music is down" })).closest("li");
		const older = screen.getByRole("heading", { name: "Casino maintenance" }).closest("li");
		await waitFor(() => {
			expect(seen.count).toBe(1);
		});

		expect(within(newest as HTMLElement).getByText("New")).toBeInTheDocument();
		expect(within(older as HTMLElement).queryByText("New")).toBeNull();
		expect(within(older as HTMLElement).getByText(/edited/)).toBeInTheDocument();
		await expectNoViolations(container);
	});

	/** Only a pointer: the owner console behind it refuses everybody else on its own. */
	it("points only the bot's owners at the place to manage them", async () => {
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, isOwner: true })));
		const { unmount } = renderWithProviders(<NotificationsPage />, { path: "/notifications" });

		expect(await screen.findByRole("link", { name: "Manage notifications" })).toHaveAttribute(
			"href",
			"/owner?tab=notifications",
		);
		unmount();

		server.use(http.get("/api/auth/me", () => HttpResponse.json(me)));
		const { client } = renderWithProviders(<NotificationsPage />, { path: "/notifications" });
		await waitFor(() => {
			expect(client.getQueryData(["me"])).toBeDefined();
		});
		expect(screen.queryByRole("link", { name: "Manage notifications" })).toBeNull();
	});

	it("says when one comes down", async () => {
		feedOf({ notices: [{ ...musicNotice, endsAt: "2026-11-02T09:00:00.000Z" }], unread: 0 });

		renderWithProviders(<NotificationsPage />, { path: "/notifications" });

		expect(await screen.findByText(/Up until/)).toBeInTheDocument();
	});

	it("asks nothing of the server when nothing is new", async () => {
		const seen = { count: 0 };
		feedOf({ notices: [OLDER], unread: 0 }, seen);

		const { client } = renderWithProviders(<NotificationsPage />, { path: "/notifications" });

		expect(await screen.findByRole("heading", { name: "Casino maintenance" })).toBeInTheDocument();
		expect(client.isMutating()).toBe(0);
		expect(seen.count).toBe(0);
	});

	it("says so when there is nothing to read", async () => {
		renderWithProviders(<NotificationsPage />, { path: "/notifications" });

		expect(await screen.findByText("Nothing to tell you right now")).toBeInTheDocument();
	});

	/** An unread list that failed must not read as an empty one. */
	it("says the list could not be read, and offers a retry", async () => {
		server.use(http.get("/api/notices", () => HttpResponse.json({}, { status: 500 })));

		renderWithProviders(<NotificationsPage />, { path: "/notifications" });

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.queryByText("Nothing to tell you right now")).toBeNull();
	});
});

describe("the notifications banner", () => {
	it("counts what is new and links to it", async () => {
		feedOf({ notices: [musicNotice], unread: 1 });

		renderWithProviders(<NoticeBanner />, { path: "/guilds" });

		const banner = await screen.findByRole("complementary", { name: "New notifications" });
		expect(banner).toHaveTextContent("You have 1 new notification");
		expect(within(banner).getByRole("link", { name: "Read them" })).toHaveAttribute("href", "/notifications");
	});

	it("stays away when nothing is new, and on the page that reads them", async () => {
		const shown: string[] = [];
		for (const [path, unread] of [
			["/guilds", 0],
			["/notifications", 1],
		] as const) {
			feedOf({ notices: [musicNotice], unread });
			const { client, unmount } = renderWithProviders(<NoticeBanner />, { path });
			await waitFor(() => {
				expect(client.getQueryData(["notices"])).toBeDefined();
			});
			if (screen.queryByRole("complementary") !== null) shown.push(`${path} with ${String(unread)} unread`);
			unmount();
		}

		expect(shown).toEqual([]);
	});
});
