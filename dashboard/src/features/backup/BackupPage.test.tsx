import { type BackupDocument } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BackupPage } from "@/features/backup/BackupPage";
import { expectNoViolations } from "@/test/axe";
import { aGuild, me } from "@/test/fixtures/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const GUILD = aGuild.id;

function renderPage(): ReturnType<typeof renderWithProviders> {
	return renderWithProviders(<BackupPage />, { route: `/guilds/${GUILD}/backup`, path: "/guilds/:guildId/backup" });
}

const elsewhere: BackupDocument = {
	kind: "testify-backup",
	version: 1,
	guildName: "Other Place",
	exportedAt: "2026-11-01T10:00:00.000Z",
	sections: {
		"starboard.update": { enabled: true, channelId: "111111111111111111", threshold: 9 },
		"music.update": { djRoleIds: ["222222222222222222"] },
	},
	channels: { "111111111111111111": "General" },
	roles: { "222222222222222222": "DJs" },
};

// jsdom's File has no text() or arrayBuffer(), which every browser's has.
beforeAll(() => {
	const read = <T,>(file: File, as: "readAsText" | "readAsArrayBuffer"): Promise<T> =>
		new Promise<T>((resolve) => {
			const reader = new FileReader();
			reader.onload = () => {
				resolve(reader.result as T);
			};
			reader[as](file);
		});
	Object.defineProperty(File.prototype, "text", {
		configurable: true,
		value(this: File) {
			return read<string>(this, "readAsText");
		},
	});
	Object.defineProperty(File.prototype, "arrayBuffer", {
		configurable: true,
		value(this: File) {
			return read<ArrayBuffer>(this, "readAsArrayBuffer");
		},
	});
});

function backupFile(content: string, name = "backup.json"): File {
	return new File([content], name, { type: name.endsWith(".json") ? "application/json" : "" });
}

describe("the back up and copy page", () => {
	/** A backup is the reader's own reads, so a section they may not read never ends up in the file. */
	it("downloads what the reader can read and says what it left out", async () => {
		server.use(
			http.get(`/api/guilds/${GUILD}/music`, () =>
				HttpResponse.json({ error: { code: "forbidden", message: "x" } }, { status: 403 }),
			),
		);
		const saved: Blob[] = [];
		const createObjectURL = jest.fn((blob: Blob) => {
			saved.push(blob);
			return "blob:backup";
		});
		Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
		const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
		renderPage();

		await userEvent.click(await screen.findByRole("button", { name: "Download a backup" }));

		expect(await screen.findByText(/Left out, because you cannot read them here: Music/)).toBeInTheDocument();
		expect(click).toHaveBeenCalledTimes(1);
		const document = JSON.parse(await saved[0]!.text()) as BackupDocument;
		expect(document.kind).toBe("testify-backup");
		expect(Object.keys(document.sections)).toContain("starboard.update");
		expect(Object.keys(document.sections)).not.toContain("music.update");
		click.mockRestore();
	});

	/** Nothing is written until the reader has seen the plan, and then only what they left ticked. */
	it("reads a backup file, matches its channels by name and applies what is ticked", async () => {
		const sent: { path: string; body: unknown }[] = [];
		server.use(
			http.patch(`/api/guilds/${GUILD}/:feature`, async ({ params, request }) => {
				sent.push({ path: String(params.feature), body: await request.json() });
				return HttpResponse.json({});
			}),
		);
		renderPage();

		await userEvent.upload(await screen.findByLabelText(/From a backup file/), backupFile(JSON.stringify(elsewhere)));

		expect(await screen.findByRole("heading", { name: /From Other Place/ })).toBeInTheDocument();
		expect(screen.getByText(/No role here is called @DJs/)).toBeInTheDocument();
		expect(sent).toEqual([]);

		await userEvent.click(screen.getByRole("button", { name: "Apply 1 section" }));

		await waitFor(() => {
			expect(sent).toEqual([
				{ path: "starboard", body: { enabled: true, channelId: "400000000000000001", threshold: 9 } },
			]);
		});
		expect(await screen.findByText("Saved")).toBeInTheDocument();
	});

	it("refuses a file that is not a backup, and says when it is a program or a script", async () => {
		renderPage();
		const picker = await screen.findByLabelText(/From a backup file/);

		await userEvent.upload(picker, backupFile('{"kind":"other"}'));
		expect(await screen.findByText("That file is not a backup from this page.")).toBeInTheDocument();

		await userEvent.upload(picker, backupFile("#!/bin/sh\necho hi\n"));
		expect(await screen.findByText(/That is a program, a script or another kind of file/)).toBeInTheDocument();

		// The picker hides it, so this is somebody switching the picker to show every file.
		await userEvent.setup({ applyAccept: false }).upload(picker, backupFile(JSON.stringify(elsewhere), "backup.exe"));
		expect(await screen.findByText(/one ending in \.json/)).toBeInTheDocument();
	});

	/** Copying a server set up just like this one has nothing to do, so nothing is ticked to begin with. */
	it("copies from another server the reader manages, leaving alone what is already the same", async () => {
		const other = { ...aGuild, id: "900000000000000009", name: "Sister Server" };
		server.use(http.get("/api/auth/me", () => HttpResponse.json({ ...me, guilds: [aGuild, other] })));
		const { container } = renderPage();

		await userEvent.selectOptions(await screen.findByLabelText(/From another server/), other.id);
		await userEvent.click(screen.getByRole("button", { name: "Read its settings" }));

		expect(await screen.findByRole("heading", { name: /From Sister Server/ })).toBeInTheDocument();
		expect(screen.getAllByText("Already the same here").length).toBeGreaterThan(0);
		expect(screen.getByRole("button", { name: "Apply 0 sections" })).toBeDisabled();
		await expectNoViolations(container);
	});
});
