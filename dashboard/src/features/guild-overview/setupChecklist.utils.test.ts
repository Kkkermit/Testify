import { type SetupStepState } from "@testify/shared";
import { describeStep } from "@/features/guild-overview/setupChecklist.utils";

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

describe("describeStep", () => {
	it("names the reason one click cannot do it", () => {
		expect(describeStep(step({ blocker: "bot_cannot_create" }))).toBe("checklist.auditBotCannot");
		expect(describeStep(step({ blocker: "you_cannot_create" }))).toBe("checklist.auditYouCannot");
		expect(describeStep(step({ step: "welcome", blocker: "no_channel" }))).toBe("checklist.welcomeNoChannel");
	});
});
