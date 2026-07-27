/** The pet catalogue, grouped by rarity. */

export type PetRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface PetSpecies {
	id: string;
	name: string;
	description: string;
	price: number;
	emoji: string;
	feedCost: number;
	incomeBonus: number;
	happinessBoost: number;
	rarity: PetRarity;
}

export const PETS_BY_RARITY: Record<Lowercase<PetRarity>, readonly PetSpecies[]> = {
	common: [
		{
			id: "hamster",
			name: "Hamster",
			description: "A small, furry rodent that loves to run in wheels",
			price: 1000,
			emoji: "🐹",
			feedCost: 50,
			incomeBonus: 0,
			happinessBoost: 2,
			rarity: "Common",
		},
		{
			id: "goldfish",
			name: "Goldfish",
			description: "A small, colorful fish that lives in a bowl",
			price: 1500,
			emoji: "🐠",
			feedCost: 40,
			incomeBonus: 0,
			happinessBoost: 1,
			rarity: "Common",
		},
		{
			id: "guinea_pig",
			name: "Guinea Pig",
			description: "A cute rodent known for its gentle nature",
			price: 2000,
			emoji: "🐹",
			feedCost: 60,
			incomeBonus: 0,
			happinessBoost: 3,
			rarity: "Common",
		},
		{
			id: "budgie",
			name: "Budgie",
			description: "A small, colorful bird known for its chirping",
			price: 3000,
			emoji: "🐦",
			feedCost: 55,
			incomeBonus: 5,
			happinessBoost: 2,
			rarity: "Common",
		},
		{
			id: "turtle",
			name: "Turtle",
			description: "A slow and steady reptile with a protective shell",
			price: 5000,
			emoji: "🐢",
			feedCost: 45,
			incomeBonus: 5,
			happinessBoost: 1,
			rarity: "Common",
		},
	],
	uncommon: [
		{
			id: "rabbit",
			name: "Rabbit",
			description: "A fluffy hopping animal with long ears",
			price: 7500,
			emoji: "🐰",
			feedCost: 100,
			incomeBonus: 10,
			happinessBoost: 5,
			rarity: "Uncommon",
		},
		{
			id: "ferret",
			name: "Ferret",
			description: "A playful, mischievous animal known for its curiosity",
			price: 9000,
			emoji: "🦡",
			feedCost: 120,
			incomeBonus: 12,
			happinessBoost: 7,
			rarity: "Uncommon",
		},
		{
			id: "cockatiel",
			name: "Cockatiel",
			description: "A small parrot with a distinctive crest",
			price: 10_000,
			emoji: "🦜",
			feedCost: 110,
			incomeBonus: 15,
			happinessBoost: 5,
			rarity: "Uncommon",
		},
		{
			id: "hedgehog",
			name: "Hedgehog",
			description: "A spiny mammal that rolls into a ball when threatened",
			price: 12_000,
			emoji: "🦔",
			feedCost: 130,
			incomeBonus: 15,
			happinessBoost: 6,
			rarity: "Uncommon",
		},
		{
			id: "gecko",
			name: "Gecko",
			description: "A small lizard with adhesive toe pads",
			price: 15_000,
			emoji: "🦎",
			feedCost: 90,
			incomeBonus: 10,
			happinessBoost: 4,
			rarity: "Uncommon",
		},
	],
	rare: [
		{
			id: "cat",
			name: "Cat",
			description: "An independent feline companion",
			price: 20_000,
			emoji: "🐱",
			feedCost: 200,
			incomeBonus: 25,
			happinessBoost: 10,
			rarity: "Rare",
		},
		{
			id: "dog",
			name: "Dog",
			description: "Man's best friend, loyal and playful",
			price: 25_000,
			emoji: "🐶",
			feedCost: 250,
			incomeBonus: 30,
			happinessBoost: 15,
			rarity: "Rare",
		},
		{
			id: "parrot",
			name: "Parrot",
			description: "A colorful bird known for its ability to mimic speech",
			price: 30_000,
			emoji: "🦜",
			feedCost: 300,
			incomeBonus: 35,
			happinessBoost: 12,
			rarity: "Rare",
		},
		{
			id: "snake",
			name: "Snake",
			description: "A slithering reptile with a forked tongue",
			price: 40_000,
			emoji: "🐍",
			feedCost: 220,
			incomeBonus: 30,
			happinessBoost: 8,
			rarity: "Rare",
		},
		{
			id: "fox",
			name: "Fox",
			description: "A cunning canid with a bushy tail and pointy ears",
			price: 50_000,
			emoji: "🦊",
			feedCost: 275,
			incomeBonus: 40,
			happinessBoost: 12,
			rarity: "Rare",
		},
	],
	epic: [
		{
			id: "monkey",
			name: "Monkey",
			description: "An intelligent primate known for its playful nature",
			price: 75_000,
			emoji: "🐵",
			feedCost: 500,
			incomeBonus: 75,
			happinessBoost: 20,
			rarity: "Epic",
		},
		{
			id: "penguin",
			name: "Penguin",
			description: "A flightless bird that thrives in cold environments",
			price: 90_000,
			emoji: "🐧",
			feedCost: 450,
			incomeBonus: 80,
			happinessBoost: 18,
			rarity: "Epic",
		},
		{
			id: "panda",
			name: "Panda",
			description: "A black and white bear known for eating bamboo",
			price: 100_000,
			emoji: "🐼",
			feedCost: 600,
			incomeBonus: 90,
			happinessBoost: 25,
			rarity: "Epic",
		},
		{
			id: "koala",
			name: "Koala",
			description: "A tree-dwelling marsupial from Australia",
			price: 120_000,
			emoji: "🐨",
			feedCost: 550,
			incomeBonus: 100,
			happinessBoost: 20,
			rarity: "Epic",
		},
		{
			id: "wolf",
			name: "Wolf",
			description: "A wild canine known for its pack mentality",
			price: 150_000,
			emoji: "🐺",
			feedCost: 700,
			incomeBonus: 110,
			happinessBoost: 22,
			rarity: "Epic",
		},
	],
	legendary: [
		{
			id: "lion",
			name: "Lion",
			description: "The king of the jungle with a majestic mane",
			price: 200_000,
			emoji: "🦁",
			feedCost: 1000,
			incomeBonus: 150,
			happinessBoost: 30,
			rarity: "Legendary",
		},
		{
			id: "tiger",
			name: "Tiger",
			description: "A large cat with distinctive orange and black stripes",
			price: 300_000,
			emoji: "🐯",
			feedCost: 1200,
			incomeBonus: 200,
			happinessBoost: 35,
			rarity: "Legendary",
		},
		{
			id: "dragon",
			name: "Dragon",
			description: "A mythical fire-breathing creature",
			price: 500_000,
			emoji: "🐉",
			feedCost: 2000,
			incomeBonus: 500,
			happinessBoost: 50,
			rarity: "Legendary",
		},
		{
			id: "unicorn",
			name: "Unicorn",
			description: "A magical horse with a single horn",
			price: 750_000,
			emoji: "🦄",
			feedCost: 1500,
			incomeBonus: 400,
			happinessBoost: 45,
			rarity: "Legendary",
		},
		{
			id: "phoenix",
			name: "Phoenix",
			description: "A mythical bird that rises from its own ashes",
			price: 1_000_000,
			emoji: "🔥",
			feedCost: 3000,
			incomeBonus: 1000,
			happinessBoost: 100,
			rarity: "Legendary",
		},
	],
};

export const ALL_PETS: readonly PetSpecies[] = Object.values(PETS_BY_RARITY).flat();

export function findPet(id: string): PetSpecies | undefined {
	return ALL_PETS.find((pet) => pet.id === id);
}

export interface PetStatus {
	mood: string;
	emoji: string;
	needsFood: boolean;
	needsWalk: boolean;
}

/** Happiness and hunger both decay one point an hour since the last interaction. */
export function decayValue(current: number, since: Date | null, now: number = Date.now()): number {
	if (since === null) return current;
	const hours = Math.floor((now - since.getTime()) / 3_600_000);
	return Math.max(0, Math.min(100, current - hours));
}

export function petStatus(happiness: number, hunger: number): PetStatus {
	if (hunger <= 20) return { mood: "Starving", emoji: "\u{1f628}", needsFood: true, needsWalk: false };
	if (happiness <= 20) return { mood: "Miserable", emoji: "\u{1f622}", needsFood: false, needsWalk: true };
	if (hunger <= 50) return { mood: "Hungry", emoji: "\u{1f37d}\ufe0f", needsFood: true, needsWalk: false };
	if (happiness <= 50) return { mood: "Bored", emoji: "\u{1f610}", needsFood: false, needsWalk: true };
	return { mood: "Happy", emoji: "\u{1f60a}", needsFood: false, needsWalk: false };
}
