import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { subcommandsOf } from "@core/command";
import { loadEverything } from "@core/loader";
import { createLogger } from "@core/logger";

const client = {
	commands: new Collection(),
	aliases: new Collection(),
	buttons: new Collection(),
	messageHandlers: [],
	logger: createLogger("fatal", false),
	on: () => undefined,
	once: () => undefined,
} as unknown as TestifyClient;
loadEverything(client);

function privateNames(): string[] {
	const names: string[] = [];
	for (const command of client.commands.values()) {
		if (command.private === true) names.push(command.name);
		for (const sub of subcommandsOf(command)) {
			if (command.private !== true && sub.private === true) names.push(`${command.name} ${sub.name}`);
		}
	}
	return names.sort();
}

describe("which commands answer privately", () => {
	/** Agreed command by command, so a server is not flooded and nothing meant to be seen goes missing. */
	it("is exactly the agreed list", () => {
		expect(privateNames()).toEqual(
			[
				"add",
				"announce",
				"anti-link",
				"ask",
				"audit-logging",
				"auto-role",
				"automod",
				"balance",
				"beg",
				"blacklist",
				"bot",
				"bot-stats-channel",
				"bug-report",
				"calculate",
				"casino info",
				"casino settings",
				"clear",
				"cooldowns",
				"counting",
				"create",
				"daily",
				"deposit",
				"dm",
				"economy",
				"economy-info",
				"eval",
				"flush-logs",
				"giveaway",
				"guild-list",
				"help",
				"impersonate",
				"inventory",
				"levelling",
				"lottery delete",
				"lottery enter",
				"lottery freeze",
				"lottery setup",
				"member-count",
				"music status",
				"music system",
				"nickname",
				"permissions",
				"pet feed",
				"pet rehome",
				"pet rename",
				"pet shop",
				"pet walk",
				"ping",
				"prefix",
				"profile",
				"reset",
				"role",
				"role-info",
				"say",
				"server-info",
				"shop",
				"softban list",
				"sticky-message",
				"suggest",
				"ticket",
				"treasure",
				"user-info",
				"verify",
				"voice-stats",
				"warn punishments",
				"welcome",
				"withdraw",
				"work",
			].sort(),
		);
	});
});
