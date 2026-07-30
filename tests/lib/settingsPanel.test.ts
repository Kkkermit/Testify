import { ButtonStyle, TextInputStyle } from "discord.js";
import { parseCustomId } from "@core/button";
import { modalForm, quickAmountRow } from "@lib/components.util";
import { parseWholeNumber, settingsPanel, statusValue } from "@lib/settingsPanel.util";

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

	/** The whole point: every setting visible with its current value beside it. */
	it("shows each setting as a field with its current value", () => {
		const fields = panel.embeds[0]?.toJSON().fields;

		expect(fields?.map((field) => field.name)).toEqual(["Status", "Drop size"]);
		expect(fields?.[1]?.value).toBe("10–500");
	});

	it("gives every action a button namespaced to the handler", () => {
		const ids = panel.components.flatMap((row) =>
			row.components.map((component) => (component.toJSON() as { custom_id?: string }).custom_id ?? ""),
		);

		expect(ids.map((id) => parseCustomId(id).id)).toEqual(["treasure", "treasure"]);
		expect(ids.map((id) => parseCustomId(id).action)).toEqual(["toggle", "edit-amount"]);
	});

	it("carries extra args onto every button, so the handler knows what it edits", () => {
		const withArgs = settingsPanel({
			id: "lottery",
			category: "economy",
			title: "Lottery",
			fields: [],
			actions: [{ action: "toggle", label: "Toggle" }],
			args: ["guild-1"],
		});

		const id = (withArgs.components[0]?.components[0]?.toJSON() as { custom_id: string }).custom_id;
		expect(parseCustomId(id).args).toEqual(["guild-1"]);
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

	it("greys everything out when the panel is superseded", () => {
		const dead = settingsPanel({
			id: "x",
			category: "economy",
			title: "Old",
			fields: [],
			actions: [{ action: "toggle", label: "Toggle" }],
			disabled: true,
		});

		expect((dead.components[0]?.components[0]?.toJSON() as { disabled?: boolean }).disabled).toBe(true);
	});
});

describe("statusValue", () => {
	it("reads at a glance rather than as a word", () => {
		expect(statusValue(true)).toContain("Enabled");
		expect(statusValue(false)).toContain("Disabled");
		expect(statusValue(true)).not.toBe(statusValue(false));
	});
});

describe("parseWholeNumber", () => {
	const bounds = { min: 5, max: 500 };

	it("accepts a plain number", () => {
		expect(parseWholeNumber("42", "Messages", bounds)).toEqual({ ok: true, value: 42 });
	});

	it("tolerates the separators people actually type", () => {
		expect(parseWholeNumber(" 1,0 0 ", "Messages", { min: 1, max: 1_000 })).toEqual({ ok: true, value: 100 });
	});

	/** Returned rather than thrown, so a form can report every bad field at once. */
	it("names the field when the value is not a number", () => {
		const result = parseWholeNumber("lots", "Messages", bounds);

		expect(result.ok).toBe(false);
		expect(result.ok ? "" : result.reason).toContain("Messages");
	});

	it("rejects a fraction", () => {
		expect(parseWholeNumber("4.5", "Messages", bounds).ok).toBe(false);
	});

	it("rejects a value outside the bounds, and says what they are", () => {
		const result = parseWholeNumber("9000", "Messages", bounds);

		expect(result.ok).toBe(false);
		expect(result.ok ? "" : result.reason).toContain("500");
	});

	it("accepts the bounds themselves", () => {
		expect(parseWholeNumber("5", "Messages", bounds).ok).toBe(true);
		expect(parseWholeNumber("500", "Messages", bounds).ok).toBe(true);
	});

	it("rejects an empty field rather than reading it as zero", () => {
		expect(parseWholeNumber("", "Messages", bounds).ok).toBe(false);
	});
});

describe("modalForm", () => {
	const modal = modalForm({
		id: "treasure",
		action: "save-amount",
		args: ["guild-1"],
		title: "Drop size",
		fields: [
			{ id: "min", label: "Smallest", value: "10" },
			{ id: "max", label: "Largest", value: "500", paragraph: true, required: false },
		],
	});

	/** The modal row union needs narrowing before a text input can be read out. */
	const inputAt = (index: number): { value?: string; style?: number; required?: boolean } => {
		const row = modal.toJSON().components[index] as unknown as { components: unknown[] };
		return row.components[0] as { value?: string; style?: number; required?: boolean };
	};

	it("carries its own state in the custom ID", () => {
		const parsed = parseCustomId(modal.toJSON().custom_id);

		expect(parsed.id).toBe("treasure");
		expect(parsed.action).toBe("save-amount");
		expect(parsed.args).toEqual(["guild-1"]);
	});

	/** Pre-filling is what turns a form into an editor. */
	it("pre-fills each field with the current value", () => {
		expect(inputAt(0).value).toBe("10");
	});

	it("honours paragraph and required per field", () => {
		expect(inputAt(1).style).toBe(TextInputStyle.Paragraph);
		expect(inputAt(1).required).toBe(false);
	});

	it("defaults to a required single-line input", () => {
		expect(inputAt(0).style).toBe(TextInputStyle.Short);
		expect(inputAt(0).required).toBe(true);
	});

	it("truncates a title past Discord's limit rather than being rejected", () => {
		const long = modalForm({ id: "x", action: "y", title: "T".repeat(80), fields: [{ id: "a", label: "A" }] });
		expect(long.toJSON().title.length).toBeLessThanOrEqual(45);
	});
});

describe("quickAmountRow", () => {
	const row = quickAmountRow("money", "dep", 1_000, "user-1");
	const buttons = row.components.map((component) => component.toJSON() as unknown as Record<string, unknown>);

	it("offers a quarter, a half, everything and a custom option", () => {
		expect(buttons).toHaveLength(4);
		expect(buttons[3]?.label).toBe("Custom…");
	});

	/** The label has to say what pressing it does, not just "25%". */
	it("resolves each percentage to a real figure in the label", () => {
		expect(buttons[0]?.label).toBe("25% — 250");
		expect(buttons[1]?.label).toBe("50% — 500");
		expect(buttons[2]?.label).toBe("All — 1000");
	});

	it("puts the amount and owner in the custom ID", () => {
		const parsed = parseCustomId(buttons[0]?.custom_id as string);

		// The slot name between them keeps the three buttons distinct on a balance
		// small enough that 25%, 50% and all resolve to the same figure.
		expect(parsed.action).toBe("dep");
		expect(parsed.args[0]).toBe("250");
		expect(parsed.args.at(-1)).toBe("user-1");
	});

	it("puts the owner last so ownerOnly can read it", () => {
		for (const built of buttons) {
			expect(parseCustomId(built.custom_id as string).args.at(-1)).toBe("user-1");
		}
	});

	it("formats the figures when given a formatter", () => {
		const formatted = quickAmountRow("money", "dep", 1_000_000, "user-1", (amount) => amount.toLocaleString("en-US"));
		const label = (formatted.components[2]?.toJSON() as { label?: string }).label;

		expect(label).toBe("All — 1,000,000");
	});

	it("disables the amounts when there is nothing to move", () => {
		const empty = quickAmountRow("money", "dep", 0, "user-1");
		const states = empty.components.map((component) => (component.toJSON() as { disabled?: boolean }).disabled);

		expect(states.slice(0, 3)).toEqual([true, true, true]);
	});
});
