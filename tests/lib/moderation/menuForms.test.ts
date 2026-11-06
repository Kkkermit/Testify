import messageReport from "@buttons/messageReport";
import moderationForm from "@buttons/moderationForm";

const checkContextMenu = jest.fn<Promise<string | null>, []>(() => Promise.resolve(null));

jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkContextMenu: () => checkContextMenu(),
}));
jest.mock("@lib/moderation", () => ({
	...jest.requireActual<object>("@lib/moderation"),
	warnFromMenu: jest.fn(() => Promise.resolve({ data: {} })),
	timeoutFromMenu: jest.fn(() => Promise.resolve({ data: {} })),
}));
jest.mock("@lib/modmail", () => ({
	...jest.requireActual<object>("@lib/modmail"),
	sendReport: jest.fn(() => Promise.resolve()),
}));

const { warnFromMenu, timeoutFromMenu } = jest.requireMock("@lib/moderation");
const { sendReport } = jest.requireMock("@lib/modmail");

const MODERATOR = "100000000000000001";
const TARGET = "300000000000000003";

function submitted(typed: Record<string, string>) {
	return {
		isModalSubmit: () => true,
		inCachedGuild: () => true,
		guildId: "400000000000000004",
		user: { id: MODERATOR },
		member: { id: MODERATOR },
		fields: { getTextInputValue: (id: string) => typed[id] ?? "" },
		reply: jest.fn(() => Promise.resolve()),
	};
}

const client = { users: { fetch: jest.fn(() => Promise.resolve({ id: TARGET })) } } as never;

beforeEach(() => jest.clearAllMocks());

describe("the right-click forms on submit", () => {
	it("warn and time out through the same paths as the commands", async () => {
		await moderationForm.run(submitted({ reason: " Spam " }) as never, {
			client,
			action: "warn",
			args: [TARGET, MODERATOR],
		});
		await moderationForm.run(submitted({ duration: "2h", reason: "" }) as never, {
			client,
			action: "timeout",
			args: [TARGET, MODERATOR],
		});

		expect(warnFromMenu).toHaveBeenCalledWith({ id: MODERATOR }, { id: TARGET }, "Spam");
		expect(timeoutFromMenu).toHaveBeenCalledWith({ id: MODERATOR }, { id: TARGET }, "2h", "");
	});

	/** A form can sit open while a role is taken away, so the gates are asked again on the submit. */
	it("asks the gates again, and acts on nobody when one refuses", async () => {
		checkContextMenu.mockResolvedValue("You need these permissions: `moderate members`");
		const warn = submitted({ reason: "Spam" });
		const report = submitted({ reason: "Spam" });

		await moderationForm.run(warn as never, { client, action: "warn", args: [TARGET, MODERATOR] });
		await messageReport.run(report as never, { client, action: "send", args: ["5", "8", MODERATOR] });

		expect(warnFromMenu).not.toHaveBeenCalled();
		expect(sendReport).not.toHaveBeenCalled();
		expect(warn.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: 64 }));
		checkContextMenu.mockResolvedValue(null);
	});

	it("sends a report and thanks the reporter privately", async () => {
		const report = submitted({ reason: "Spam" });

		await messageReport.run(report as never, { client, action: "send", args: ["5", "8", MODERATOR] });

		expect(sendReport).toHaveBeenCalledWith({ id: MODERATOR }, "5", "8", "Spam");
		expect(report.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: 64 }));
	});
});
