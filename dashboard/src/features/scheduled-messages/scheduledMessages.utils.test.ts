import { fromLocalInput, toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";

describe("the local time helpers", () => {
	/** The input shows the reader's own clock, and what is sent back must be the same instant. */
	it("round-trips an instant through the input, to the minute", () => {
		const at = new Date("2026-10-25T18:30:45.000Z");

		expect(fromLocalInput(toLocalInput(at))?.getTime()).toBe(new Date("2026-10-25T18:30:00.000Z").getTime());
	});

	it("writes the shape a datetime-local input takes", () => {
		expect(toLocalInput("2026-01-05T09:07:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
	});

	it("reads nothing from an empty or broken value", () => {
		expect(fromLocalInput("")).toBeNull();
		expect(fromLocalInput("not a time")).toBeNull();
	});
});
