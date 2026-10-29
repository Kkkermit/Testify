import { ALL_PETS, decayValue, petStatus } from "@lib/economy/pets.util";

const HOUR = 3_600_000;

describe("the pet catalogue", () => {
	it("gives every pet a unique id, so lookups cannot collide", () => {
		expect(new Set(ALL_PETS.map((pet) => pet.id)).size).toBe(ALL_PETS.length);
	});

	/** Pets are a money sink by design; `happinessBoost` is the reason to own one. */
	it("charges to feed every pet and gives every pet a happiness boost", () => {
		for (const pet of ALL_PETS) {
			expect(pet.feedCost).toBeGreaterThan(0);
			expect(pet.happinessBoost).toBeGreaterThan(0);
			expect(pet.incomeBonus).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("decayValue", () => {
	const now = Date.now();

	it("leaves the value alone for a pet that has never been interacted with", () => {
		expect(decayValue(80, null, now)).toBe(80);
	});

	it("never falls below zero", () => {
		expect(decayValue(10, new Date(now - 500 * HOUR), now)).toBe(0);
	});

	it("never rises above one hundred, even if the clock went backwards", () => {
		expect(decayValue(100, new Date(now + 50 * HOUR), now)).toBe(100);
	});
});

describe("petStatus", () => {
	it("always answers with an emoji", () => {
		for (const [happiness, hunger] of [
			[100, 100],
			[10, 100],
			[100, 10],
			[40, 40],
			[0, 0],
		]) {
			expect(petStatus(happiness!, hunger!).emoji.length).toBeGreaterThan(0);
		}
	});
});
