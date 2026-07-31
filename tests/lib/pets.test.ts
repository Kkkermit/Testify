import { ALL_PETS, decayValue, findPet, PETS_BY_RARITY, petStatus } from "@lib/pets.util";

const HOUR = 3_600_000;

describe("the pet catalogue", () => {
	it("flattens every rarity into one list", () => {
		const counted = Object.values(PETS_BY_RARITY).reduce((total, tier) => total + tier.length, 0);
		expect(ALL_PETS).toHaveLength(counted);
	});

	it("gives every pet a unique id, so lookups cannot collide", () => {
		expect(new Set(ALL_PETS.map((pet) => pet.id)).size).toBe(ALL_PETS.length);
	});

	it("files every pet under the rarity it declares", () => {
		for (const [rarity, tier] of Object.entries(PETS_BY_RARITY)) {
			for (const pet of tier) expect(pet.rarity.toLowerCase()).toBe(rarity);
		}
	});

	it("prices every pet above zero, so none is free", () => {
		for (const pet of ALL_PETS) expect(pet.price).toBeGreaterThan(0);
	});

	/**
	 * Pets are a money sink by design — nearly all of them cost more to feed than they return, and `happinessBoost` is
	 * the reason to own one.
	 */
	it("charges to feed every pet and gives every pet a happiness boost", () => {
		for (const pet of ALL_PETS) {
			expect(pet.feedCost).toBeGreaterThan(0);
			expect(pet.happinessBoost).toBeGreaterThan(0);
			expect(pet.incomeBonus).toBeGreaterThanOrEqual(0);
		}
	});

	it("pays a bigger income bonus the rarer the pet is", () => {
		const best = (tier: readonly { incomeBonus: number }[]): number => Math.max(...tier.map((pet) => pet.incomeBonus));

		expect(best(PETS_BY_RARITY.common)).toBeLessThan(best(PETS_BY_RARITY.legendary));
	});

	it("gets more expensive as it gets rarer", () => {
		const cheapest = (tier: readonly { price: number }[]): number => Math.min(...tier.map((pet) => pet.price));

		expect(cheapest(PETS_BY_RARITY.common)).toBeLessThan(cheapest(PETS_BY_RARITY.legendary));
	});
});

describe("findPet", () => {
	it("finds a pet that exists", () => {
		const first = ALL_PETS[0];
		expect(findPet(first!.id)).toEqual(first);
	});

	it("returns undefined for an unknown id rather than throwing", () => {
		expect(findPet("no-such-pet")).toBeUndefined();
	});

	it("is case sensitive, matching the stored ids exactly", () => {
		expect(findPet(ALL_PETS[0]!.id.toUpperCase())).toBeUndefined();
	});
});

describe("decayValue", () => {
	const now = Date.now();

	it("leaves the value alone for a pet that has never been interacted with", () => {
		expect(decayValue(80, null, now)).toBe(80);
	});

	it("takes a point off per whole hour", () => {
		expect(decayValue(80, new Date(now - 5 * HOUR), now)).toBe(75);
	});

	it("ignores part hours", () => {
		expect(decayValue(80, new Date(now - HOUR * 1.9), now)).toBe(79);
	});

	it("never falls below zero", () => {
		expect(decayValue(10, new Date(now - 500 * HOUR), now)).toBe(0);
	});

	it("never rises above one hundred, even if the clock went backwards", () => {
		expect(decayValue(100, new Date(now + 50 * HOUR), now)).toBe(100);
	});

	it("does not decay within the first hour", () => {
		expect(decayValue(60, new Date(now - 59 * 60_000), now)).toBe(60);
	});
});

describe("petStatus", () => {
	it("puts starvation first, however happy the pet is", () => {
		expect(petStatus(100, 5)).toMatchObject({ mood: "Starving", needsFood: true });
	});

	it("reports misery when the pet is fed but unhappy", () => {
		expect(petStatus(10, 100)).toMatchObject({ mood: "Miserable", needsWalk: true });
	});

	it("reports hunger before boredom", () => {
		expect(petStatus(40, 40)).toMatchObject({ mood: "Hungry", needsFood: true });
	});

	it("reports boredom when only happiness is low", () => {
		expect(petStatus(40, 90)).toMatchObject({ mood: "Bored", needsWalk: true });
	});

	it("reports a happy pet as needing nothing", () => {
		expect(petStatus(90, 90)).toMatchObject({ mood: "Happy", needsFood: false, needsWalk: false });
	});

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
