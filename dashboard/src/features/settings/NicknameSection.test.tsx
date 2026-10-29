import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { NicknameSection } from "@/features/settings/sections/NicknameSection";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function render() {
	return renderWithProviders(<NicknameSection guildId={GUILD} />, { path: "/settings" });
}

describe("the bot's nickname in a server", () => {
	/** Clearing it means "go back to the bot's own name", which is null at Discord rather than "". */
	it("sends null when it is cleared", async () => {
		const user = userEvent.setup();
		let sent: unknown;
		server.use(
			http.patch("/api/guilds/:guildId/settings/nickname", async ({ request }) => {
				sent = await request.json();
				return HttpResponse.json({ nickname: null, canChange: true });
			}),
		);

		render();
		const field = await screen.findByLabelText("Nickname");
		await waitFor(() => {
			expect(field).toHaveValue("Testy");
		});

		await user.clear(field);
		await user.click(screen.getByRole("button", { name: /save name/i }));

		await waitFor(() => {
			expect(sent).toEqual({ nickname: null });
		});
	});

	/** The message names the permission to grant, and the field is disabled so nobody types a name that cannot be applied. */
	it("explains when the bot cannot rename itself there", async () => {
		server.use(
			http.get("/api/guilds/:guildId/settings/nickname", () => HttpResponse.json({ nickname: null, canChange: false })),
		);

		render();

		expect(await screen.findByText(/needs the change nickname permission/i)).toBeInTheDocument();
		expect(screen.getByLabelText("Nickname")).toBeDisabled();
	});
});
