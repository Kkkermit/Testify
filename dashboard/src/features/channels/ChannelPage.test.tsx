import { screen, within } from "@testing-library/react";
import { ChannelPage } from "@/features/channels/ChannelPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

const GUILD = "900000000000000001";

function renderChannel(channelId: string): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ChannelPage />, {
		route: `/guilds/${GUILD}/channels/${channelId}`,
		path: "/guilds/:guildId/channels/:channelId",
	});
}

describe("a channel's page", () => {
	/** The page answers "what happens here", so each feature says what it does in this channel, not in general. */
	it("lists what happens in the channel and what each feature does there", async () => {
		const { container } = renderChannel("400000000000000002");

		expect(await screen.findByRole("heading", { level: 1, name: "#locked" })).toBeInTheDocument();
		const tickets = screen.getByRole("link", { name: /Tickets/ });
		expect(tickets).toHaveAttribute("href", `/guilds/${GUILD}/tickets`);
		expect(within(tickets).getByText("Keeps its panel here · Keeps its log here")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Welcome/ })).toBeNull();
		await expectNoViolations(container);
	});

	it("says when nothing happens in a channel, and where to start something", async () => {
		renderChannel("400000000000000003");

		expect(await screen.findByRole("heading", { level: 1, name: "Voice" })).toBeInTheDocument();
		expect(screen.getByText(/does nothing in this channel yet/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Go to the overview" })).toHaveAttribute("href", `/guilds/${GUILD}`);
	});

	/** A channel id from the address is never trusted to name anything the channel list does not. */
	it("reads a channel it does not know as one the reader cannot see", async () => {
		renderChannel("400000000000000099");
		expect(await screen.findByText("This is not a channel you can see.")).toBeInTheDocument();
	});
});
