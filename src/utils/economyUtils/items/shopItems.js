module.exports = {
    items: [
        {
            id: "fishing_rod",
            name: "Fishing Rod",
            description: "Allows you to fish for extra income",
            price: 2500,
            category: "tools",
            emoji: "🎣",
            usable: true,
            useDescription: "Use to catch fish and earn money"
        },
        {
            id: "laptop",
            name: "Laptop",
            description: "Required for certain jobs and enables freelance work",
            price: 5000,
            category: "tools",
            emoji: "💻",
            usable: false
        },
        {
            id: "hunting_rifle",
            name: "Hunting Rifle",
            description: "Allows you to hunt for extra income",
            price: 7500,
            category: "tools",
            emoji: "🔫",
            usable: true,
            useDescription: "Use to hunt animals and earn money"
        },
        {
            id: "padlock",
            name: "Padlock",
            description: "Protects your wallet from robberies (one-time use)",
            price: 1000,
            category: "protection",
            emoji: "🔒",
            usable: false
        },
        {
            id: "bank_upgrade",
            name: "Bank Upgrade",
            description: "Increases your bank capacity by 50% (stackable)",
            price: 10000,
            category: "upgrades",
            emoji: "🏦",
            usable: true,
            useDescription: "Increases your bank capacity"
        }
    ],
    houses: [
        {
            id: "small_apartment",
            name: "Small Apartment",
            description: "A modest place to call home",
            price: 25000,
            income: 100,
            emoji: "🏢"
        },
        {
            id: "suburban_house",
            name: "Suburban House",
            description: "A comfortable home in the suburbs",
            price: 75000,
            income: 250,
            emoji: "🏡"
        },
        {
            id: "beach_house",
            name: "Beach House",
            description: "A beautiful house with ocean views",
            price: 150000,
            income: 500,
            emoji: "🏖️"
        },
        {
            id: "mansion",
            name: "Mansion",
            description: "A luxury home with all amenities",
            price: 500000,
            income: 1500,
            emoji: "🏰"
        }
    ],
    businesses: [
        {
            id: "coffee_shop",
            name: "Coffee Shop",
            description: "A small café that generates passive income",
            price: 50000,
            income: 200,
            emoji: "☕"
        },
        {
            id: "restaurant",
            name: "Restaurant",
            description: "A popular eatery that generates good passive income",
            price: 150000,
            income: 750,
            emoji: "🍽️"
        },
        {
            id: "supermarket",
            name: "Supermarket",
            description: "A large store with steady passive income",
            price: 300000,
            income: 1200,
            emoji: "🛒"
        },
        {
            id: "tech_company",
            name: "Tech Company",
            description: "A high-value business with significant passive income",
            price: 1000000,
            income: 5000,
            emoji: "📱"
        }
    ],
    jobs: [
        {
            id: "cashier",
            name: "Cashier",
            description: "Entry level job with minimal requirements",
            basePay: 250,
            requirements: [],
            emoji: "💰"
        },
        {
            id: "delivery_driver",
            name: "Delivery Driver",
            description: "Deliver goods around the city",
            basePay: 400,
            requirements: [],
            emoji: "🚚"
        },
        {
            id: "programmer",
            name: "Programmer",
            description: "Write code for companies",
            basePay: 800,
            requirements: ["laptop"],
            emoji: "💻"
        },
        {
            id: "doctor",
            name: "Doctor",
            description: "Save lives, earn big",
            basePay: 1500,
            requirements: ["laptop"],
            emoji: "👨‍⚕️"
        }
    ],
    pets: {
        common: { name: "Common Pets", description: "Affordable pets for beginner pet owners", emoji: "🐹" },
        uncommon: { name: "Uncommon Pets", description: "Interesting pets with special qualities", emoji: "🐰" },
        rare: { name: "Rare Pets", description: "Valuable pets with greater benefits", emoji: "🐱" },
        epic: { name: "Epic Pets", description: "Extraordinary pets with significant bonuses", emoji: "🐼" },
        legendary: { name: "Legendary Pets", description: "Mythical creatures with amazing abilities", emoji: "🦄" }
    }
};
