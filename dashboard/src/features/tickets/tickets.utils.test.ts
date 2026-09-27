import { type ChannelSummary, type RoleSummary, type TicketSettings } from "@testify/shared";
import { categoriesOf, draftOf, draftProblems, isDirty, staffRoleWarning } from "@/features/tickets/tickets.utils";
import { t } from "@/test/english";

const SETTINGS: TicketSettings = {
	enabled: true,
	panelChannelId: "400000000000000001",
	categoryId: "400000000000000005",
	transcriptChannelId: "400000000000000002",
	staffRoleId: "300000000000000003",
	description: "Press the button",
	buttonLabel: "Create ticket",
	posted: true,
	openTickets: 3,
};

describe("draftProblems", () => {
	const draft = draftOf(SETTINGS);

	it("says nothing about a complete draft", () => {
		expect(draftProblems(draft, t)).toEqual([]);
	});

	it.each(["panelChannelId", "categoryId", "transcriptChannelId", "staffRoleId"] as const)(
		"asks for %s when it is missing",
		(field) => {
			expect(draftProblems({ ...draft, [field]: null }, t)).toHaveLength(1);
		},
	);

	/** Naming only the first gap made it look as though the fields had to be filled from the top down. */
	it("names every missing destination at once, whichever was filled first", () => {
		const problems = draftProblems({ ...draft, panelChannelId: null, staffRoleId: null }, t);

		expect(problems).toEqual(["Choose where the panel is posted.", "Choose the role that handles tickets."]);
	});

	/** An emptied message would post a panel with nothing on it. */
	it("refuses an empty message or button label", () => {
		expect(draftProblems({ ...draft, description: "   " }, t).join(" ")).toMatch(/something to say/i);
		expect(draftProblems({ ...draft, buttonLabel: "" }, t).join(" ")).toMatch(/label/i);
	});
});

describe("isDirty", () => {
	it("is false for an untouched draft", () => {
		expect(isDirty(draftOf(SETTINGS), SETTINGS)).toBe(false);
	});

	it("notices a change to any field", () => {
		expect(isDirty({ ...draftOf(SETTINGS), buttonLabel: "Help" }, SETTINGS)).toBe(true);
		expect(isDirty({ ...draftOf(SETTINGS), categoryId: "400000000000000009" }, SETTINGS)).toBe(true);
	});
});

describe("categoriesOf", () => {
	/** A ticket channel is created under a category, so offering a text channel would only earn a refusal. */
	it("offers categories and nothing else", () => {
		const channels: ChannelSummary[] = [
			{ id: "1", name: "general", kind: "text", position: 1, canSend: true },
			{ id: "2", name: "Support", kind: "category", position: 2, canSend: false },
			{ id: "3", name: "Voice", kind: "voice", position: 3, canSend: false },
		];

		expect(categoriesOf(channels).map((channel) => channel.name)).toEqual(["Support"]);
	});
});

describe("staffRoleWarning", () => {
	const roles: RoleSummary[] = [
		{ id: "1", name: "Staff", colour: null, position: 3, managed: false, assignableByBot: true },
		{ id: "2", name: "Server Booster", colour: null, position: 4, managed: true, assignableByBot: false },
	];

	it("says nothing about an ordinary role", () => {
		expect(staffRoleWarning(roles, "1", t)).toBeNull();
	});

	it("says nothing when no role is chosen yet", () => {
		expect(staffRoleWarning(roles, null, t)).toBeNull();
	});

	/** Discord will not let anybody be given a managed role, so a ticket's overwrites would silently do nothing. */
	it("refuses a role an integration owns", () => {
		expect(staffRoleWarning(roles, "2", t)).toMatch(/managed by an integration/i);
	});

	/** A role deleted since the page loaded would otherwise fail at the moment a ticket is opened. */
	it("says so when the stored role has been deleted", () => {
		expect(staffRoleWarning(roles, "999", t)).toMatch(/no longer exists/i);
	});
});
