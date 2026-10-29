import { ButtonStyle, type Guild } from "discord.js";
import { parseCustomId } from "@core/button";
import { type TestifyClient } from "@core/client";
import { getGoodbyeSettings, saveGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { applyGoodbye, farewellFor, readGoodbye, sendGoodbye } from "@lib/welcome/goodbyeActions.util";
import { goodbyePanel } from "@lib/welcome/goodbyePanel.util";
import { DEFAULT_GOODBYE_MESSAGE, type GoodbyeSettings } from "@testify/shared";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

jest.mock("@database/repositories/goodbyeRepository", () => ({
	getGoodbyeSettings: jest.fn(() => Promise.resolve(null)),
	saveGoodbyeSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@lib/discord/channels.util", () => ({
	canPostIn: jest.fn((_guild: unknown, id: string) => id === POSTABLE),
}));

const GUILD = "900000000000000001";
const POSTABLE = "400000000000000009";
const SILENT = "400000000000000001";
const OWNER = "100000000000000009";

const guild = { id: GUILD, name: "Test Server", memberCount: 41 } as Guild;
const member = {
	id: "100000000000000001",
	user: { username: "sam", displayAvatarURL: () => "https://cdn.discord/sam.png" },
	guild,
} as never;

const stored = (overrides: object = {}) => ({
	enabled: true,
	channelId: POSTABLE,
	message: "Bye {user}, {username} left {server} ({count})",
	style: "text" as const,
	...overrides,
});

beforeEach(() => {
	jest.mocked(getGoodbyeSettings).mockResolvedValue(null);
});

describe("farewellFor", () => {
	/** The member has already gone, so a mention would ping nobody useful, and the text may mention anybody. */
	it("fills the placeholders and pings nobody", () => {
		expect(farewellFor(member, stored())).toEqual({
			content: "Bye <@100000000000000001>, sam left Test Server (41)",
			allowedMentions: { parse: [] },
		});
	});

	it("sends an embed with no content when that is the style", () => {
		const message = farewellFor(member, stored({ style: "embed" }));

		expect(message.content).toBeUndefined();
		expect(message.allowedMentions).toEqual({ parse: [] });
		expect(JSON.stringify(message.embeds)).toContain("sam left Test Server (41)");
	});
});

describe("readGoodbye", () => {
	it("says when the bot cannot post where the goodbye goes", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue(stored({ channelId: SILENT }));

		expect(await readGoodbye(guild)).toMatchObject({ channelId: SILENT, canSend: false });
	});
});

describe("applyGoodbye", () => {
	it("refuses to turn on with nowhere to post", async () => {
		await expect(applyGoodbye(guild, { enabled: true }, OWNER)).rejects.toThrow("Pick a channel for the goodbye");
		expect(saveGoodbyeSettings).not.toHaveBeenCalled();
	});

	it("refuses a channel the bot cannot post in", async () => {
		await expect(applyGoodbye(guild, { channelId: SILENT }, OWNER)).rejects.toThrow("I cannot post in that channel");
	});

	/** A goodbye switched on with its channel taken away would be on and silent, which nobody could tell apart from off. */
	it("turns itself off when its channel is cleared", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue(stored());

		await applyGoodbye(guild, { channelId: null }, OWNER);

		expect(saveGoodbyeSettings).toHaveBeenCalledWith(
			GUILD,
			expect.objectContaining({ enabled: false, channelId: null }),
			OWNER,
		);
	});

	it("keeps what the patch does not mention", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue(stored({ style: "embed" }));

		await applyGoodbye(guild, { message: "See you" }, OWNER);

		expect(saveGoodbyeSettings).toHaveBeenCalledWith(
			GUILD,
			{ enabled: true, channelId: POSTABLE, message: "See you", style: "embed" },
			OWNER,
		);
	});
});

describe("sendGoodbye", () => {
	function clientWith(channel: unknown): TestifyClient {
		return {
			channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
			logger: { warn: jest.fn() },
		} as unknown as TestifyClient;
	}
	const channel = () => ({ isTextBased: () => true, isSendable: () => true, send: jest.fn(() => Promise.resolve()) });

	it("posts in the chosen channel when it is on", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue(stored());
		const target = channel();

		await sendGoodbye(clientWith(target), member);

		expect(target.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
	});

	it("logs, rather than throws, when Discord refuses the post", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue(stored());
		const target = { ...channel(), send: jest.fn(() => Promise.reject(new Error("Missing Access"))) };
		const client = clientWith(target);

		await expect(sendGoodbye(client, member)).resolves.toBeUndefined();
		expect(client.logger.warn).toHaveBeenCalled();
	});
});

describe("goodbyePanel", () => {
	const settings = (overrides: Partial<GoodbyeSettings> = {}): GoodbyeSettings => ({
		enabled: false,
		channelId: null,
		message: DEFAULT_GOODBYE_MESSAGE,
		style: "text",
		canSend: false,
		...overrides,
	});

	it("puts the owner last in every control, as the router expects", () => {
		for (const id of idsOf(goodbyePanel(settings(), OWNER))) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	/** The panel shows the message as typed, and a prefix run posts it where everybody can see. */
	it("pings nobody the message names", () => {
		expect(goodbyePanel(settings({ message: "@everyone bye" }), OWNER).allowedMentions).toEqual({ parse: [] });
	});

	it("cannot be switched on before a channel is chosen", () => {
		const toggle = buttonsOf(goodbyePanel(settings(), OWNER)).find((button) => button.label === "Turn on");

		expect(toggle?.disabled).toBe(true);
	});

	it("offers the other style, and says when it cannot post", () => {
		const panel = goodbyePanel(settings({ enabled: true, channelId: SILENT, style: "embed" }), OWNER);
		const toggle = buttonsOf(panel).find((button) => button.label === "Turn off");

		expect(toggle?.style).toBe(ButtonStyle.Danger);
		expect(buttonsOf(panel).map((button) => button.label)).toContain("Use a plain message");
		expect(textOf(panel)).toContain("I cannot post there");
	});
});
