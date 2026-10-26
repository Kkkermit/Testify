import { parseCustomId } from "@core/button";
import { scheduleEditor, scheduleHub } from "@lib/scheduledMessages/scheduledMessagePanel.util";
import { SCHEDULE_LIMITS, type ScheduledMessage } from "@testify/shared";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

const schedule = (index: number, overrides: Partial<ScheduledMessage> = {}): ScheduledMessage => ({
	id: index.toString(16).padStart(24, "0"),
	channelId: "400000000000000001",
	message: `Message ${String(index)}\n# heading`,
	repeat: "daily",
	nextAt: "2026-10-25T18:30:00.000Z",
	canSend: true,
	...overrides,
});

const full = Array.from({ length: SCHEDULE_LIMITS.maxPerGuild }, (_, index) => schedule(index));

function componentCount(value: unknown): number {
	if (typeof value !== "object" || value === null) return 0;
	const node = value as { type?: number; components?: unknown[]; accessory?: unknown };
	const own = typeof node.type === "number" ? 1 : 0;
	return (
		own +
		(node.components ?? []).reduce<number>((total, child) => total + componentCount(child), 0) +
		componentCount(node.accessory)
	);
}

describe("scheduleHub", () => {
	it("fits a full server inside Discord's component limit", () => {
		expect(componentCount(scheduleHub(full, OWNER).components[0]?.toJSON())).toBeLessThanOrEqual(40);
	});

	it("shows each post's time as a timestamp every reader sees in their own zone", () => {
		const text = textOf(scheduleHub([schedule(1)], OWNER));

		expect(text).toContain(`<t:${String(Date.parse("2026-10-25T18:30:00.000Z") / 1000)}:f>`);
		expect(text).toContain("Every day");
		expect(text).not.toContain("\n# heading");
	});

	it("puts the owner last in every control, as the router expects", () => {
		for (const id of idsOf(scheduleHub(full.slice(0, 3), OWNER))) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	it("points a server with none at the command that adds one", () => {
		expect(textOf(scheduleHub([], OWNER))).toContain("/schedule add");
	});

	it("pings nobody the messages name", () => {
		expect(scheduleHub([schedule(1, { message: "@everyone" })], OWNER).allowedMentions).toEqual({ parse: [] });
	});
});

describe("scheduleEditor", () => {
	it("carries the post's id and then the owner in each of its controls", () => {
		const target = schedule(7);

		for (const id of idsOf(scheduleEditor({ schedule: target }, OWNER))) {
			const { action, args } = parseCustomId(id);
			expect(args.at(-1)).toBe(OWNER);
			if (action !== "hub") expect(args[0]).toBe(target.id);
		}
	});

	/** A post that will be skipped has to say so, or the panel reads as working. */
	it("warns when the bot cannot post in its channel", () => {
		expect(textOf(scheduleEditor({ schedule: schedule(1, { canSend: false }) }, OWNER))).toContain("Cannot post");
		expect(textOf(scheduleEditor({ schedule: schedule(1) }, OWNER))).not.toContain("Cannot post");
	});

	it("asks before deleting", () => {
		const labels = buttonsOf(scheduleEditor({ schedule: schedule(1), confirmingDelete: true }, OWNER)).map(
			(button) => button.label,
		);

		expect(labels).toEqual(expect.arrayContaining(["Delete it", "Keep it"]));
		expect(labels).not.toContain("Delete");
	});
});
