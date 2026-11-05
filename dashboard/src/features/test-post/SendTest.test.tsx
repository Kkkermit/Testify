import { type TestPost } from "@testify/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SendTest } from "@/features/test-post/SendTest";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderButton(test: TestPost): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<SendTest test={test} />, {
		route: `/guilds/${GUILD}/sticky`,
		path: "/guilds/:guildId/sticky",
	});
}

describe("Send me a test", () => {
	/** The draft goes as it stands, unsaved, to this page's server, so the reader checks what they are about to save. */
	it("sends the draft to the page's server and says where it went", async () => {
		const user = userEvent.setup();
		let sent: unknown = null;
		server.use(
			http.post(`/api/guilds/${GUILD}/test-post`, async ({ request }) => {
				sent = await request.json();
				return new HttpResponse(null, { status: 204 });
			}),
		);
		renderButton({ kind: "plain", message: "Read the rules" });

		await user.click(screen.getByRole("button", { name: "Send me a test" }));

		expect(await screen.findByText("Sent to your direct messages.")).toBeInTheDocument();
		expect(sent).toEqual({ kind: "plain", message: "Read the rules" });
	});

	it("cannot send an empty message", () => {
		renderButton({ kind: "plain", message: "   " });

		expect(screen.getByRole("button", { name: "Send me a test" })).toBeDisabled();
	});

	/** A refusal lands beside the button that caused it, not as a silent nothing. */
	it("says how to open direct messages when Discord would not deliver", async () => {
		const user = userEvent.setup();
		server.use(
			http.post(`/api/guilds/${GUILD}/test-post`, () =>
				HttpResponse.json({ error: { code: "dm_closed", message: "Closed." } }, { status: 403 }),
			),
		);
		renderButton({ kind: "plain", message: "Hi" });

		await user.click(screen.getByRole("button", { name: "Send me a test" }));

		expect(await screen.findByText(/privacy settings/)).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderButton({ kind: "plain", message: "Hi" });

		await expectNoViolations(container);
	});
});
