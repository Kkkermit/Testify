import { type TFunction } from "i18next";
import { searchEntries, searchFor, shortcutLabel } from "@/features/search/quickSearch.utils";
import { i18next } from "@/i18n";
import { catalogue } from "@/test/fixtures/bot";
import { someChannels } from "@/test/fixtures/server";
import { aGuild, cannotAdd, withoutBot } from "@/test/fixtures/session";

const t = i18next.t.bind(i18next) as TFunction;
const second = { ...aGuild, id: "900000000000000009", name: "Café Crew" };

function entriesIn(guild: typeof aGuild | undefined) {
	return searchEntries({
		t,
		guild,
		guilds: [aGuild, second, withoutBot, cannotAdd],
		isOwner: false,
		commands: catalogue.commands,
		channels: someChannels,
	});
}

describe("searchEntries", () => {
	/** A command with a screen goes to that screen, named as the sidebar names it. */
	it("sends a command to the screen that configures it", () => {
		const ban = entriesIn(aGuild).find((entry) => entry.label === "/ban");

		expect(ban?.to).toBe(`/guilds/${aGuild.id}/members`);
		expect(ban?.detail).toBe("Set up on Members");
	});

	it("sends a command with no screen to the command list, filtered to it", () => {
		const ban = entriesIn(undefined).find((entry) => entry.label === "/ban");

		expect(ban?.to).toBe("/commands?q=ban");
	});

	/** A channel is found by its name and opens its page; outside a server there is no channel to find. */
	it("finds a channel by name inside a server, and none outside one", () => {
		const [general] = searchFor(entriesIn(aGuild), "general");

		expect(general).toEqual(
			expect.objectContaining({
				kind: "channel",
				label: "#general",
				to: `/guilds/${aGuild.id}/channels/400000000000000001`,
			}),
		);
		expect(entriesIn(undefined).filter((entry) => entry.kind === "channel")).toEqual([]);
		expect(entriesIn(aGuild).find((entry) => entry.label.includes("Support"))).toBeUndefined();
	});
});

describe("fold and shortcutLabel", () => {
	it("names the key the reader's keyboard has", () => {
		expect(shortcutLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("⌘K");
		expect(shortcutLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Ctrl K");
	});
});
