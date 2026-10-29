import { editDistance, type SearchableEntry, stem, SupportSearch } from "@testify/shared";

function entry(id: string, title: string, keywords: string[] = [], questions: string[] = []): SearchableEntry {
	return { id, title, keywords, questions, kind: "article" };
}

const ENTRIES = [
	entry("tickets", "Setting up tickets", ["support ticket", "ticket panel"], ["How do I set up tickets?"]),
	entry("welcome", "Welcoming new members", ["welcome message", "greeting"]),
	entry("counting", "The counting game", ["counting channel"]),
	entry("voice-stats", "Member count channels", ["member counter"]),
	entry("levelling", "Setting up levelling", ["xp", "level"]),
	entry("remove", "Removing the bot from a server", ["kick bot"]),
	entry("add", "Adding the bot to your server", ["invite"]),
];

const search = new SupportSearch(ENTRIES);
const top = (question: string, partial = false): string | undefined =>
	search.search(question, { partial })[0]?.entry.id;

describe("editDistance", () => {
	it("gives up past the limit rather than finishing the table", () => {
		expect(editDistance("ticket", "welcome", 1)).toBe(2);
		expect(editDistance("a", "abcdef", 2)).toBe(3);
	});
});

describe("stem", () => {
	/** Stemmed, the counting game and a member count channel would be the same word, and the wrong one would win. */
	it("keeps counting whole", () => {
		expect(stem("counting")).toBe("counting");
	});
});

describe("SupportSearch", () => {
	/** Both articles say "the bot" and "server"; the word that differs has to decide it. */
	it("tells adding the bot from removing it", () => {
		expect(top("how do I get the bot into my server")).toBe("add");
		expect(top("how do I remove the bot")).toBe("remove");
	});
});
