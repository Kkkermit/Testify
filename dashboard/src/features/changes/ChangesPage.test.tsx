import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ChangesPage } from "@/features/changes/ChangesPage";
import { expectNoViolations } from "@/test/axe";
import { serverChanges } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = "900000000000000001";

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<ChangesPage />, { route: `/guilds/${GUILD}/changes`, path: "/guilds/:guildId/changes" });
}

function askedFor(): URLSearchParams[] {
	const asked: URLSearchParams[] = [];
	server.use(
		http.get(`/api/guilds/${GUILD}/changes`, ({ request }) => {
			asked.push(new URL(request.url).searchParams);
			return HttpResponse.json(serverChanges);
		}),
	);
	return asked;
}

describe("the changes page", () => {
	it("lists what Discord recorded beside what the dashboard did", async () => {
		renderPage();

		expect(await screen.findByText("marcus")).toBeInTheDocument();
		expect(screen.getByText("Banned")).toBeInTheDocument();
		expect(screen.getByText("Reason: Spamming invites")).toBeInTheDocument();
		expect(screen.getByText("Turned levelling on")).toBeInTheDocument();
		expect(screen.getByText(/By kate on the dashboard/)).toBeInTheDocument();
	});

	it("asks for the last week everywhere until told otherwise", async () => {
		const asked = askedFor();
		renderPage();
		await screen.findByText("marcus");

		expect(asked[0]?.get("days")).toBe("7");
		expect(asked[0]?.get("source")).toBe("all");
	});

	it("narrows by where the change was made and how far back", async () => {
		const asked = askedFor();
		renderPage();
		await screen.findByText("marcus");

		await userEvent.click(screen.getByRole("button", { name: "In Discord" }));
		await userEvent.selectOptions(screen.getByLabelText("Period"), "14");

		await waitFor(() => {
			expect(asked.at(-1)?.get("days")).toBe("14");
		});
		expect(asked.at(-1)?.get("source")).toBe("discord");
	});

	it("searches by what was typed", async () => {
		const asked = askedFor();
		renderPage();
		await screen.findByText("marcus");

		await userEvent.type(screen.getByLabelText(/Search changes/), "marcus");

		await waitFor(() => {
			expect(asked.at(-1)?.get("q")).toBe("marcus");
		});
	});

	/** Without the permission the list would silently look like nothing happened in Discord. */
	it("says why Discord's changes are missing when the bot cannot read them", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/changes`, () =>
				HttpResponse.json({ ...serverChanges, items: [], total: 0, discordReadable: false }),
			),
		);
		renderPage();

		expect(await screen.findByText(/Give the bot View Audit Log/)).toBeInTheDocument();
		expect(screen.getByText("Nothing changed in this period.")).toBeInTheDocument();
	});

	it("offers a retry rather than an empty list when the read fails", async () => {
		server.use(http.get(`/api/guilds/${GUILD}/changes`, () => HttpResponse.json({}, { status: 500 })));
		renderPage();

		expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderPage();
		await screen.findByText("marcus");

		await expectNoViolations(container);
	});
});
