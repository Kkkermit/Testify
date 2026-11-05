import { fromLocalInput, scheduleSummary, toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { i18next } from "@/i18n";
import { dateAndTime } from "@/lib/datetime";

describe("the local time helpers", () => {
	/** The input shows the reader's own clock, and what is sent back must be the same instant. */
	it("round-trips an instant through the input, to the minute", () => {
		const at = new Date("2026-10-25T18:30:45.000Z");

		expect(fromLocalInput(toLocalInput(at))?.getTime()).toBe(new Date("2026-10-25T18:30:00.000Z").getTime());
	});
});

describe("scheduleSummary", () => {
	const t = i18next.getFixedT("en");
	const name = (id: string): string => (id === "1" ? "#news" : "#general");

	/** The list is sorted soonest first, but the sentence must name the soonest whatever order it is handed. */
	it("names the next post, whatever order the list is in", () => {
		const later = { channelId: "2", nextAt: "2026-12-02T10:00:00.000Z" };
		const sooner = { channelId: "1", nextAt: "2026-12-01T10:00:00.000Z" };

		expect(scheduleSummary([], name, t)).toBe("Nothing is scheduled yet.");
		expect(scheduleSummary([sooner], name, t)).toBe(
			`One post is scheduled, in #news on ${dateAndTime(sooner.nextAt)}.`,
		);
		expect(scheduleSummary([later, sooner], name, t)).toBe(
			`2 posts are scheduled. The next goes to #news on ${dateAndTime(sooner.nextAt)}.`,
		);
	});
});
