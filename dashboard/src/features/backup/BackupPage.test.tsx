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

// jsdom's File, and the Blob its slice() returns, have no text() or arrayBuffer(), which every browser's have.
beforeAll(() => {
	const jsdomBlob = Object.getPrototypeOf(File.prototype) as Blob;
	const read = <T,>(file: Blob, as: "readAsText" | "readAsArrayBuffer"): Promise<T> =>
		new Promise<T>((resolve) => {
			const reader = new FileReader();
			reader.onload = () => {
				resolve(reader.result as T);
			};
			reader[as](file);
		});
	Object.defineProperty(jsdomBlob, "text", {
		configurable: true,
		value(this: Blob) {
			return read<string>(this, "readAsText");
		},
	});
	Object.defineProperty(jsdomBlob, "arrayBuffer", {
		configurable: true,
		value(this: Blob) {
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

	/** The server judges a program by its first bytes alone, so nothing else of the file ever leaves the browser. */
	/** A program chosen under its own name, or one past the size limit, was once refused and never reported. */
	it("reports a program by its first eight bytes whatever it is called, and a mistaken archive not at all", async () => {
		const sent: unknown[] = [];
		server.use(
			http.post(`/api/guilds/${GUILD}/backup/program`, async ({ request }) => {
				sent.push(await request.json());
				return HttpResponse.json({ error: { code: "blacklisted", message: "Blocked." } }, { status: 403 });
			}),
		);
		renderPage();
		const user = userEvent.setup({ applyAccept: false });
		const picker = await screen.findByLabelText(/From a backup file/);
		const zip = new File([Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])], "backup.json", {
			type: "application/json",
		});
		const program = new File(
			[Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04]), new Uint8Array(300 * 1024)],
			"setup.exe",
			{ type: "application/x-msdownload" },
		);

		// Somebody can be talked into choosing a program, so the page says what it costs before anything is chosen.
		expect(screen.getByText(/Choosing a program or a script here blocks your account/)).toBeInTheDocument();
		expect(screen.getByText(/If somebody told you to choose a file here, stop/)).toBeInTheDocument();

		await user.upload(picker, zip);
		expect(await screen.findByText(/That is a program, a script or another kind of file/)).toBeInTheDocument();
		await user.upload(picker, program);

		await waitFor(() => {
			expect(sent).toEqual([{ head: [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00] }]);
		});
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
