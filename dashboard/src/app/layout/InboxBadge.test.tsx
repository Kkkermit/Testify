import { screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { http, HttpResponse } from "msw";
import { SidebarLink } from "@/app/layout/SidebarLink";
import { busyInbox } from "@/test/fixtures/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const item = {
	to: `/guilds/${GUILD}/inbox`,
	labelKey: "nav.inbox",
	icon: Inbox,
	badge: { kind: "inbox", guildId: GUILD },
} as const;

describe("the inbox count in the sidebar", () => {
	/** The number is drawn for the eye and spoken as words, so the link is never named just "Inbox 6". */
	it("names how many are waiting, and nothing while none are", async () => {
		server.use(http.get("/api/guilds/:guildId/inbox", () => HttpResponse.json(busyInbox)));
		const { unmount } = renderWithProviders(<SidebarLink item={item} expanded />);

		expect(await screen.findByRole("link", { name: "Inbox 6 waiting" })).toBeInTheDocument();
		unmount();

		server.resetHandlers();
		renderWithProviders(<SidebarLink item={item} expanded />);
		expect(await screen.findByRole("link", { name: "Inbox" })).toBeInTheDocument();
	});
});
