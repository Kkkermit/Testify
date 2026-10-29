import { parseCustomId } from "@core/button";
import { scheduleEditor, scheduleHub } from "@lib/scheduledMessages/scheduledMessagePanel.util";
import { SCHEDULE_LIMITS, type ScheduledMessage } from "@testify/shared";
import { idsOf, textOf } from "@tests/helpers/containers";

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

	it("puts the owner last in every control, as the router expects", () => {
		for (const id of idsOf(scheduleHub(full.slice(0, 3), OWNER))) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	it("pings nobody the messages name", () => {
		expect(scheduleHub([schedule(1, { message: "@everyone" })], OWNER).allowedMentions).toEqual({ parse: [] });
	});
});

describe("scheduleEditor", () => {
	/** A post that will be skipped has to say so, or the panel reads as working. */
	it("warns when the bot cannot post in its channel", () => {
		expect(textOf(scheduleEditor({ schedule: schedule(1, { canSend: false }) }, OWNER))).toContain("Cannot post");
		expect(textOf(scheduleEditor({ schedule: schedule(1) }, OWNER))).not.toContain("Cannot post");
	});
});
