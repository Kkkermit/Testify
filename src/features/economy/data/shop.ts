/**
 * The shop catalogue. Static data, `as const`, so every id is a literal type and a
 * typo in a command is a compile error rather than a silent lookup failure.
 */

export interface ShopItem {
	id: string;
	name: string;
	description: string;
	price: number;
	category: "tools" | "protection" | "upgrades";
	emoji: string;
	usable: boolean;
	useDescription?: string;
}

export interface HouseItem {
	id: string;
	name: string;
	description: string;
	price: number;
	income: number;
	emoji: string;
}

export interface BusinessItem {
	id: string;
	name: string;
	description: string;
	price: number;
	income: number;
	emoji: string;
}

export interface JobItem {
	id: string;
	name: string;
	description: string;
	basePay: number;
	requirements: string[];
	emoji: string;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
	{
		id: "fishing_rod",
		name: "Fishing Rod",
		description: "Allows you to fish for extra income",
		price: 2500,
		category: "tools",
		emoji: "🎣",
		usable: true,
		useDescription: "Use to catch fish and earn money",
	},
	{
		id: "laptop",
		name: "Laptop",
		description: "Required for certain jobs and enables freelance work",
		price: 5000,
		category: "tools",
		emoji: "💻",
		usable: false,
	},
	{
		id: "hunting_rifle",
		name: "Hunting Rifle",
		description: "Allows you to hunt for extra income",
		price: 7500,
		category: "tools",
		emoji: "🔫",
		usable: true,
		useDescription: "Use to hunt animals and earn money",
	},
	{
		id: "padlock",
		name: "Padlock",
		description: "Protects your wallet from robberies (one-time use)",
		price: 1000,
		category: "protection",
		emoji: "🔒",
		usable: false,
	},
	{
		id: "bank_upgrade",
		name: "Bank Upgrade",
		description: "Increases your bank capacity by 50% (stackable)",
		price: 10_000,
		category: "upgrades",
		emoji: "🏦",
		usable: true,
		useDescription: "Increases your bank capacity",
	},
];

export const HOUSES: readonly HouseItem[] = [
	{
		id: "small_apartment",
		name: "Small Apartment",
		description: "A modest place to call home",
		price: 25_000,
		income: 100,
		emoji: "🏢",
	},
	{
		id: "suburban_house",
		name: "Suburban House",
		description: "A comfortable home in the suburbs",
		price: 75_000,
		income: 250,
		emoji: "🏡",
	},
	{
		id: "beach_house",
		name: "Beach House",
		description: "A beautiful house with ocean views",
		price: 150_000,
		income: 500,
		emoji: "🏖️",
	},
	{
		id: "mansion",
		name: "Mansion",
		description: "A luxury home with all amenities",
		price: 500_000,
		income: 1500,
		emoji: "🏰",
	},
];

export const BUSINESSES: readonly BusinessItem[] = [
	{
		id: "coffee_shop",
		name: "Coffee Shop",
		description: "A small café that generates passive income",
		price: 50_000,
		income: 200,
		emoji: "☕",
	},
	{
		id: "restaurant",
		name: "Restaurant",
		description: "A popular eatery that generates good passive income",
		price: 150_000,
		income: 750,
		emoji: "🍽️",
	},
	{
		id: "supermarket",
		name: "Supermarket",
		description: "A large store with steady passive income",
		price: 300_000,
		income: 1200,
		emoji: "🛒",
	},
	{
		id: "tech_company",
		name: "Tech Company",
		description: "A high-value business with significant passive income",
		price: 1_000_000,
		income: 5000,
		emoji: "📱",
	},
];

export const JOBS: readonly JobItem[] = [
	{
		id: "cashier",
		name: "Cashier",
		description: "Entry level job with minimal requirements",
		basePay: 250,
		requirements: [],
		emoji: "💰",
	},
	{
		id: "delivery_driver",
		name: "Delivery Driver",
		description: "Deliver goods around the city",
		basePay: 400,
		requirements: [],
		emoji: "🚚",
	},
	{
		id: "programmer",
		name: "Programmer",
		description: "Write code for companies",
		basePay: 800,
		requirements: ["laptop"],
		emoji: "💻",
	},
	{
		id: "doctor",
		name: "Doctor",
		description: "Save lives, earn big",
		basePay: 1500,
		requirements: ["laptop"],
		emoji: "👨‍⚕️",
	},
];

export function findShopItem(id: string): ShopItem | undefined {
	return SHOP_ITEMS.find((item) => item.id === id);
}

export function findHouse(id: string): HouseItem | undefined {
	return HOUSES.find((house) => house.id === id);
}

export function findBusiness(id: string): BusinessItem | undefined {
	return BUSINESSES.find((business) => business.id === id);
}

export function findJob(id: string): JobItem | undefined {
	return JOBS.find((job) => job.id === id);
}
