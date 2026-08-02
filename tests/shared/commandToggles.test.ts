import { ALWAYS_ENABLED, availabilityOf, commandTogglePut, isAlwaysEnabled, toggleName } from "@testify/shared";

const state = { disabled: ["ban"], disabledGlobally: ["rank"] };

describe("availabilityOf", () => {
	it("reads a command nobody has touched as on", () => {
		expect(availabilityOf("beg", state)).toBe("on");
	});

	it("distinguishes off here from off everywhere", () => {
		expect(availabilityOf("ban", state)).toBe("off-here");
		expect(availabilityOf("rank", state)).toBe("off-everywhere");
	});

	/** A server cannot re-enable what the owner switched off, so the bot-wide list has to win. */
	it("lets the bot-wide list win over a server's own", () => {
		expect(availabilityOf("rank", { disabled: ["rank"], disabledGlobally: ["rank"] })).toBe("off-everywhere");
	});

	it("reports a protected command as locked whatever the lists say", () => {
		expect(availabilityOf("help", { disabled: ["help"], disabledGlobally: ["help"] })).toBe("locked");
	});
});

describe("toggleName", () => {
	it("adds and removes", () => {
		expect(toggleName(["ban"], "rank")).toEqual(["ban", "rank"]);
		expect(toggleName(["ban", "rank"], "ban")).toEqual(["rank"]);
	});

	/** Sorted, so two tabs that switch the same pair in a different order send the same list. */
	it("keeps the list sorted", () => {
		expect(toggleName(["rank"], "ban")).toEqual(["ban", "rank"]);
	});
});

describe("commandTogglePut", () => {
	it("accepts ordinary names", () => {
		expect(commandTogglePut.safeParse({ disabled: ["ban", "anti-link"] }).success).toBe(true);
		expect(commandTogglePut.safeParse({ disabled: [] }).success).toBe(true);
	});

	/** An id straight out of a body reaches a Mongo write if nothing checks its shape first. */
	it("refuses anything that is not a command name", () => {
		for (const name of ["../../etc/passwd", "Ban", "has space", "-leading", "", "a".repeat(40)]) {
			expect(commandTogglePut.safeParse({ disabled: [name] }).success).toBe(false);
		}
	});

	it("refuses a command the bot needs, whatever the form rendered", () => {
		for (const name of ALWAYS_ENABLED) {
			expect(isAlwaysEnabled(name)).toBe(true);
			expect(commandTogglePut.safeParse({ disabled: [name] }).success).toBe(false);
		}
	});
});
