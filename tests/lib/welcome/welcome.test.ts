import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { type WelcomeSettings } from "@database/models/welcome.schema";
import { WELCOME_PANEL_ID } from "@lib/welcome/welcome.constants";
import {
	checkBackground,
	fillTemplate,
	normaliseWelcome,
	type StoredWelcomeSettings,
	WELCOME_LIMITS,
} from "@lib/welcome/welcome.util";
import { welcomePanel } from "@lib/welcome/welcomePanel.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const CHANNEL = "200000000000000002";

function stored(overrides: Partial<WelcomeSettings> = {}): StoredWelcomeSettings {
	return {
		guildId: "1",
		channelId: CHANNEL,
		message: "Hello {user}",
		isEmbed: false,
		style: "card",
		background: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

describe("normaliseWelcome", () => {
	/** A guild that turned it on must keep embeds without re-running setup. */
	it("reads the old embed flag as the embed style", () => {
		const legacy = stored({ isEmbed: true });
		delete (legacy as Partial<WelcomeSettings>).style;

		expect(normaliseWelcome(legacy)?.style).toBe("embed");
	});

	/** An empty buffer is not a background, and must not claim to be one. */
	it("treats a zero-length background as none", () => {
		const empty = stored({ background: { data: Buffer.alloc(0), contentType: "image/png", name: "b.png" } });
		expect(normaliseWelcome(empty)?.hasBackground).toBe(false);
	});
});

describe("fillTemplate", () => {
	const context = { mention: "<@7>", username: "alice", serverName: "Testify", memberCount: 1_234 };

	/** A typo should show up as itself rather than silently vanishing. */
	it("leaves an unknown placeholder alone", () => {
		expect(fillTemplate("Hi {usrname}", context)).toBe("Hi {usrname}");
	});
});

describe("checkBackground", () => {
	it("rejects a file that is not an image", () => {
		expect(checkBackground({ contentType: "application/pdf", size: 100 }).ok).toBe(false);
		expect(checkBackground({ contentType: null, size: 100 }).ok).toBe(false);
	});

	/** The card is a still image, so an animated GIF would only show its first frame. */
	it("rejects a GIF, and says why", () => {
		const verdict = checkBackground({ contentType: "image/gif", size: 100 });

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toMatch(/still image/i);
	});

	it("rejects something too large to keep in the settings document", () => {
		expect(checkBackground({ contentType: "image/png", size: WELCOME_LIMITS.maxBackgroundBytes + 1 }).ok).toBe(false);
	});

	it("accepts a file exactly on the limit", () => {
		expect(checkBackground({ contentType: "image/png", size: WELCOME_LIMITS.maxBackgroundBytes }).ok).toBe(true);
	});
});

describe("the welcome panel", () => {
	const configured = welcomePanel(
		{ config: { channelId: CHANNEL, message: "Hi {user}", style: "card", hasBackground: false } },
		OWNER,
	);

	it("is a Components V2 message", () => {
		expect(configured.flags).toBe(MessageFlags.IsComponentsV2);
	});

	it("namespaces every control, with the owner last", () => {
		for (const id of idsOf(configured)) {
			expect(parseCustomId(id).id).toBe(WELCOME_PANEL_ID);
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it("gives every control a distinct custom ID", () => {
		expect(duplicateIds(configured)).toEqual([]);
		expect(duplicateIds(welcomePanel({ config: null }, OWNER))).toEqual([]);
	});

	describe("before anything is configured", () => {
		const fresh = welcomePanel({ config: null }, OWNER);

		/** Every other control needs a channel to act on. */
		it("disables every button until a channel is picked", () => {
			for (const control of buttonsOf(fresh)) expect(control.disabled).toBe(true);
		});
	});

	it("only offers to remove a background when there is one", () => {
		const removeOf = (rendered: ReturnType<typeof welcomePanel>): boolean | undefined =>
			buttonsOf(rendered).find((control) => parseCustomId(String(control.custom_id)).action === "clear-bg")
				?.disabled as boolean | undefined;

		expect(removeOf(configured)).toBe(true);
		expect(
			removeOf(
				welcomePanel({ config: { channelId: CHANNEL, message: "Hi", style: "card", hasBackground: true } }, OWNER),
			),
		).toBe(false);
	});

	/** Only worth mentioning on the style that actually draws one. */
	it("explains how to upload a background only on the card style", () => {
		expect(textOf(configured)).toMatch(/welcome background/i);
		expect(
			textOf(
				welcomePanel({ config: { channelId: CHANNEL, message: "Hi", style: "text", hasBackground: false } }, OWNER),
			),
		).not.toMatch(/welcome background/i);
	});
});
