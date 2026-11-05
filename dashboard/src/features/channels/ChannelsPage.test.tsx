import { screen } from "@testing-library/react";
import { ChannelsPage } from "@/features/channels/ChannelsPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

const GUILD = "900000000000000001";

describe("the Channels page", () => {
	/** Each channel opens what happens there, and each server-wide feature its own page, so nothing is listed twice. */
	it("lists the channels the bot works in, then the features that belong to none", async () => {
		const { container } = renderWithProviders(<ChannelsPage />, {
			route: `/guilds/${GUILD}/channels`,
			path: "/guilds/:guildId/channels",
		});

		expect(await screen.findByRole("link", { name: /#general/ })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/channels/400000000000000001`,
		);
		const everywhere = screen.getByRole("region", { name: "Across the whole server" });
		expect(everywhere).toHaveTextContent("Levelling");
		expect(everywhere).not.toHaveTextContent("Tickets");
		await expectNoViolations(container);
	});
});
