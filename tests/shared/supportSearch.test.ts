import { editDistance, isConfident, type SearchableEntry, stem, SupportSearch, wordsOf } from "@testify/shared";

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
	it("counts insertions, deletions, substitutions and one swapped pair", () => {
		expect(editDistance("ticket", "ticket", 2)).toBe(0);
		expect(editDistance("tickt", "ticket", 2)).toBe(1);
		expect(editDistance("welcom", "welcome", 2)).toBe(1);
		expect(editDistance("wrods", "words", 2)).toBe(1);
	});

	it("gives up past the limit rather than finishing the table", () => {
		expect(editDistance("ticket", "welcome", 1)).toBe(2);
		expect(editDistance("a", "abcdef", 2)).toBe(3);
	});
});

describe("stem", () => {
	it("brings the forms of a word to one root", () => {
		expect(["spamming", "spam"].map(stem)).toEqual(["spam", "spam"]);
		expect(["levelling", "level"].map(stem)).toEqual(["level", "level"]);
		expect(["giving", "give"].map(stem)).toEqual(["giv", "giv"]);
	});

	/** Stemmed, the counting game and a member count channel would be the same word, and the wrong one would win. */
	it("keeps counting whole", () => {
		expect(stem("counting")).toBe("counting");
	});
});

describe("wordsOf", () => {
	it("drops stop words, numbers and ignored names, and joins the phrases that mean one thing", () => {
		expect(wordsOf("How do I set up Testify for 10 people?", ["testify"])).toEqual(["setup"]);
		expect(wordsOf("how do I log in")).toEqual(["login"]);
		expect(wordsOf("turn the volume down")).toEqual(["volume", "adjust"]);
		expect(wordsOf("why does it say I'm blocked")).toEqual(["blocked"]);
	});
});

describe("SupportSearch", () => {
	it("finds an article by what it is called", () => {
		expect(top("ticket panel")).toBe("tickets");
	});

	it("sees past a typo, and leaves a word nothing is near alone", () => {
		expect(top("tickts")).toBe("tickets");
		expect(search.correct("tickt")).toBe("ticket");
		expect(search.correct("zzzzzz")).toBeNull();
	});

	it("completes the word still being typed only when asked to", () => {
		expect(top("tick", true)).toBe("tickets");
		expect(top("tick")).not.toBe("tickets");
	});

	it("tells the counting game from a member count", () => {
		expect(top("counting channel")).toBe("counting");
		expect(top("member count channel")).toBe("voice-stats");
	});

	/** Both articles say "the bot" and "server"; the word that differs has to decide it. */
	it("tells adding the bot from removing it", () => {
		expect(top("how do I get the bot into my server")).toBe("add");
		expect(top("how do I remove the bot")).toBe("remove");
	});

	it("is not confident about a question made of words no article uses", () => {
		expect(isConfident(search.search("what is the capital of france")[0])).toBe(false);
		expect(isConfident(search.search("ticket panel")[0])).toBe(true);
	});

	it("returns nothing for a question with nothing to match", () => {
		expect(search.search("the and of")).toEqual([]);
	});
});
