import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ChannelPage } from "@/features/channels/ChannelPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderChannel(channelId: string): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ChannelPage />, {
		route: `/guilds/${GUILD}/channels/${channelId}`,
		path: "/guilds/:guildId/channels/:channelId",
	});
}

describe("a channel's page", () => {
	/** The page answers "what happens here", so each feature says what it does in this channel, not in general. */
	it("gives each feature working in the channel a block saying what it does there", async () => {
		const { container } = renderChannel("400000000000000002");

		expect(await screen.findByRole("heading", { level: 1, name: "#locked" })).toBeInTheDocument();
		const tickets = screen.getByRole("region", { name: "Tickets" });
		expect(within(tickets).getByText("Keeps its panel here · Keeps its log here")).toBeInTheDocument();
		expect(within(tickets).getByRole("link", { name: "Open the Tickets page" })).toHaveAttribute(
			"href",
			`/guilds/${GUILD}/tickets`,
		);
		expect(screen.queryByRole("region", { name: "Welcome messages" })).toBeNull();
		await expectNoViolations(container);
	});

	/** The welcome message is changed where it is shown, through the same write the welcome page makes. */
	it("edits a post in place and saves it through the feature's own route", async () => {
		const user = userEvent.setup();
		const bodies: unknown[] = [];
		server.use(
			http.patch(`/api/guilds/${GUILD}/welcome`, async ({ request }) => {
				bodies.push(await request.json());
				return HttpResponse.json({});
			}),
		);
		renderChannel("400000000000000001");

		const welcome = await screen.findByRole("region", { name: "Welcome messages" });
		await user.click(await within(welcome).findByRole("button", { name: "Change the message" }));
		const box = within(welcome).getByRole("textbox", { name: /Message/ });
		await user.clear(box);
		await user.type(box, "Hello {{user}");
		await user.tab();

		await waitFor(() => {
			expect(bodies).toEqual([{ message: "Hello {user}" }]);
		});
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
