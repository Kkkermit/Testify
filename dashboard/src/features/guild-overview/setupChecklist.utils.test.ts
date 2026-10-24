import { type SetupStepState } from "@testify/shared";
import {
	actionFor,
	describeStep,
	hideChecklist,
	isChecklistHidden,
} from "@/features/guild-overview/setupChecklist.utils";

function step(overrides: Partial<SetupStepState>): SetupStepState {
	return {
		step: "audit-log",
		done: false,
		channelId: null,
		channelName: null,
		createsChannel: false,
		blocker: null,
		...overrides,
	};
}

describe("actionFor", () => {
	it("starts, creates, sends to the screen, or does nothing once done", () => {
		expect(actionFor(step({}))).toBe("start");
		expect(actionFor(step({ createsChannel: true }))).toBe("create");
		expect(actionFor(step({ createsChannel: true, blocker: "bot_cannot_create" }))).toBe("choose");
		expect(actionFor(step({ done: true }))).toBeNull();
	});
});

describe("describeStep", () => {
	it("names the reason one click cannot do it", () => {
		expect(describeStep(step({ blocker: "bot_cannot_create" }))).toBe("checklist.auditBotCannot");
		expect(describeStep(step({ blocker: "you_cannot_create" }))).toBe("checklist.auditYouCannot");
		expect(describeStep(step({ step: "welcome", blocker: "no_channel" }))).toBe("checklist.welcomeNoChannel");
	});

	it("says reuse or create for the log", () => {
		expect(describeStep(step({ channelName: "mod-log" }))).toBe("checklist.auditReuse");
		expect(describeStep(step({ createsChannel: true }))).toBe("checklist.auditCreate");
	});

	it("says what is happening once a step is done", () => {
		expect(describeStep(step({ step: "levelling", done: true }))).toBe("checklist.levellingDone");
		expect(describeStep(step({ step: "welcome", done: true }))).toBe("checklist.welcomeDone");
		expect(describeStep(step({ done: true }))).toBe("checklist.auditDone");
	});
});

describe("hiding the checklist", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("remembers each server on its own", () => {
		hideChecklist("1");

		expect(isChecklistHidden("1")).toBe(true);
		expect(isChecklistHidden("2")).toBe(false);
	});

	it("shrugs off storage holding something else", () => {
		localStorage.setItem("testify:setupHidden", "{not json");

		expect(isChecklistHidden("1")).toBe(false);
		hideChecklist("1");
		expect(isChecklistHidden("1")).toBe(true);
	});
});
