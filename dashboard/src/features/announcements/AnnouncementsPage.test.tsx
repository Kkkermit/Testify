import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";
const SENT = { channelId: "400000000000000001", url: "https://discord.com/channels/9/4/5" };

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<AnnouncementsPage />, {
		route: `/guilds/${GUILD}/announcements`,
		path: "/guilds/:guildId/announcements",
	});
}

function capture(): { body: unknown } {
	const captured: { body: unknown } = { body: undefined };
	server.use(
		http.post("/api/guilds/:guildId/announcements", async ({ request }) => {
			captured.body = await request.json();
			return HttpResponse.json(SENT);
		}),
	);
	return captured;
}

async function writeAnnouncement(user: ReturnType<typeof userEvent.setup>, message: string): Promise<void> {
	const picker = await screen.findByLabelText("Posted in");
	// The channels arrive after the picker does, so wait for the one to choose.
	await within(picker).findByRole("option", { name: /general/ });
	await user.selectOptions(picker, "400000000000000001");
	await user.type(screen.getByLabelText("Message"), message);
}

describe("the announcements page", () => {
	/** An announcement goes to everybody, so the form starts pinging nobody and has to be told otherwise. */
	it("starts pinging nobody, and says what is missing before it can post", async () => {
		const { container } = renderPage();

		expect(await screen.findByRole("radio", { name: /nobody/i })).toBeChecked();
		expect(screen.getByRole("button", { name: "Post announcement" })).toBeDisabled();
		expect(screen.getByText("Choose a channel first.")).toBeInTheDocument();
		await expectNoViolations(container);
	});

	it("shows the words and the ping in the preview as they are typed", async () => {
		const user = userEvent.setup();
		renderPage();

		await writeAnnouncement(user, "Event at eight");
		await user.click(screen.getByRole("radio", { name: /@here/i }));

		const preview = screen.getByRole("region", { name: "Preview" });
		expect(within(preview).getByText("Event at eight")).toBeInTheDocument();
		expect(within(preview).getByText("@here")).toBeInTheDocument();
	});

	it("posts an embed with its title and colour, then offers the post", async () => {
		const user = userEvent.setup();
		const captured = capture();
		renderPage();

		await writeAnnouncement(user, "Patch notes are out");
		await user.type(screen.getByLabelText(/^title/i), "Update");
		await user.selectOptions(screen.getByLabelText("Colour"), "Gold");
		await user.click(screen.getByRole("button", { name: "Post announcement" }));

		await waitFor(() => {
			expect(captured.body).toEqual({
				channelId: "400000000000000001",
				style: "embed",
				title: "Update",
				colour: "#ffd700",
				message: "Patch notes are out",
				mentions: "none",
			});
		});
		expect(await screen.findByRole("link", { name: /open in discord/i })).toHaveAttribute("href", SENT.url);
		expect(screen.getByLabelText("Message")).toHaveValue("");
	});

	it("sends plain text without a title, even one typed before switching", async () => {
		const user = userEvent.setup();
		const captured = capture();
		renderPage();

		await writeAnnouncement(user, "Hello");
		await user.type(screen.getByLabelText(/^title/i), "Dropped");
		await user.click(screen.getByRole("radio", { name: /plain text/i }));
		await user.click(screen.getByRole("button", { name: "Post announcement" }));

		await waitFor(() => {
			expect(captured.body).toEqual({
				channelId: "400000000000000001",
				style: "text",
				message: "Hello",
				mentions: "none",
			});
		});
	});

	it("says why a ping was refused", async () => {
		const user = userEvent.setup();
		server.use(
			http.post("/api/guilds/:guildId/announcements", () =>
				HttpResponse.json(
					{ error: { code: "cannot_mention", message: "You need the Mention Everyone permission." } },
					{ status: 403 },
				),
			),
		);
		renderPage();

		await writeAnnouncement(user, "Hi");
		await user.click(screen.getByRole("radio", { name: /@everyone/i }));
		await user.click(screen.getByRole("button", { name: "Post announcement" }));

		expect(await screen.findByText("You need the Mention Everyone permission.")).toBeInTheDocument();
	});
});
