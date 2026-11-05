import { type RoleSummary, type TicketSettings } from "@testify/shared";
import { draftOf, draftProblems, staffRoleWarning, ticketSummary } from "@/features/tickets/tickets.utils";
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

describe("staffRoleWarning", () => {
	const roles: RoleSummary[] = [
		{ id: "1", name: "Staff", colour: null, position: 3, managed: false, assignableByBot: true, powerful: false },
		{
			id: "2",
			name: "Server Booster",
			colour: null,
			position: 4,
			managed: true,
			assignableByBot: false,
			powerful: false,
		},
	];

	/** Discord will not let anybody be given a managed role, so a ticket's overwrites would silently do nothing. */
	it("refuses a role an integration owns", () => {
		expect(staffRoleWarning(roles, "2", t)).toMatch(/managed by an integration/i);
	});

	/** A role deleted since the page loaded would otherwise fail at the moment a ticket is opened. */
	it("says so when the stored role has been deleted", () => {
		expect(staffRoleWarning(roles, "999", t)).toMatch(/no longer exists/i);
	});
});

describe("ticketSummary", () => {
	const on = { enabled: true, posted: true, openTickets: 2 };

	/** Tickets switched on with no panel posted still let nobody in, so the sentence says so. */
	it("says whether members can open a ticket, and how many are open", () => {
		expect(ticketSummary({ ...on, enabled: false }, "#help", t)).toBe("Tickets are off, so members cannot open one.");
		expect(ticketSummary({ ...on, posted: false }, "#help", t)).toBe(
			"Tickets are on, but the panel is not posted yet, so nobody can open one.",
		);
		expect(ticketSummary({ ...on, openTickets: 1 }, "#help", t)).toBe(
			"Members open a ticket from the panel in #help, and 1 is open right now.",
		);
		expect(ticketSummary(on, "#help", t)).toBe(
			"Members open a ticket from the panel in #help, and 2 are open right now.",
		);
	});
});
