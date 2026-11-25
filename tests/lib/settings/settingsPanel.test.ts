import { ButtonStyle } from "discord.js";
import { parseRange, parseWholeNumber, settingsPanel, statusValue } from "@lib/settings/settingsPanel.util";

describe("settingsPanel", () => {
	const panel = settingsPanel({
		id: "treasure",
		category: "economy",
		title: "Treasure drops",
		fields: [
			{ label: "Status", value: statusValue(true) },
			{ label: "Drop size", value: "10–500" },
		],
		actions: [
			{ action: "toggle", label: "Turn off", style: ButtonStyle.Danger },
			{ action: "edit-amount", label: "Drop size" },
		],
	});

	/** Every setting is visible with its current value beside it. */
	it("shows each setting as a field with its current value", () => {
		const fields = panel.embeds[0]?.toJSON().fields;

		expect(fields?.map((field) => field.name)).toEqual(["Status", "Drop size"]);
		expect(fields?.[1]?.value).toBe("10–500");
	});

	/** Discord rejects a row of more than five, so long panels have to wrap. */
	it("wraps more than five actions onto another row", () => {
		const many = settingsPanel({
			id: "x",
			category: "economy",
			title: "Many",
			fields: [],
			actions: Array.from({ length: 7 }, (_unused, index) => ({ action: `a${index}`, label: `A${index}` })),
		});

		expect(many.components).toHaveLength(2);
		expect(many.components[0]?.components).toHaveLength(5);
		expect(many.components[1]?.components).toHaveLength(2);
	});
});

describe("parseWholeNumber", () => {
	const bounds = { min: 5, max: 500 };

	/** Returned rather than thrown, so a form can report every bad field at once; an empty field is not zero. */
	it("refuses anything but a whole number inside the bounds, naming the field and the bounds", () => {
		const refused = ["lots", "4.5", "9000", ""].map((raw) => parseWholeNumber(raw, "Messages", bounds));
		const reasons = refused.map((result) => (result.ok ? null : result.reason));

		expect(reasons.filter((reason) => reason === null)).toEqual([]);
		expect(reasons[0]).toContain("Messages");
		expect(reasons[2]).toContain("500");
		expect(parseWholeNumber("1,000", "Messages", { min: 5, max: 5_000 })).toEqual({ ok: true, value: 1_000 });
	});
});

describe("parseRange", () => {
	const labels = { min: "Smallest", max: "Largest", order: "The smallest cannot be more than the largest." };
	const rangeBounds = { min: 1, max: 100 };

	/** Both halves are named at once, so somebody fixing the form does not find the second mistake on the next try. */
	it("names every field that is wrong, in order", () => {
		expect(parseRange({ min: "x", max: "500" }, labels, rangeBounds)).toEqual({
			ok: false,
			problems: ["**Smallest** has to be a whole number.", "**Largest** has to be between 1 and 100."],
		});
	});

	it("refuses a range that runs backwards, with the caller's own words", () => {
		expect(parseRange({ min: "9", max: "3" }, labels, rangeBounds)).toEqual({ ok: false, problems: [labels.order] });
		expect(parseRange({ min: "3", max: "3" }, labels, rangeBounds)).toEqual({ ok: true, min: 3, max: 3 });
	});
});
