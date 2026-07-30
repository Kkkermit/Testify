import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { type WelcomeSettings } from "@database/models/guildSettings.schema";
import {
	checkBackground,
	DEFAULT_WELCOME_MESSAGE,
	fillTemplate,
	isWelcomeStyle,
	normaliseWelcome,
	type StoredWelcomeSettings,
	WELCOME_LIMITS,
	WELCOME_PLACEHOLDERS,
} from "@lib/welcome.util";
import { WELCOME_PANEL_ID, welcomePanel } from "@lib/welcomePanel.util";
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
	it("treats an unconfigured guild as off", () => {
		expect(normaliseWelcome(null)).toBeNull();
	});

	/**
	 * The first version only had an `isEmbed` boolean. A guild that turned it on must
	 * keep embeds without re-running setup.
	 */
	it("reads the old embed flag as the embed style", () => {
		const legacy = stored({ isEmbed: true });
		delete (legacy as Partial<WelcomeSettings>).style;

		expect(normaliseWelcome(legacy)?.style).toBe("embed");
	});

	it("reads the old flag being off as plain text", () => {
		const legacy = stored({ isEmbed: false });
		delete (legacy as Partial<WelcomeSettings>).style;

		expect(normaliseWelcome(legacy)?.style).toBe("text");
	});

	it("prefers an explicit style over the old flag", () => {
		expect(normaliseWelcome(stored({ isEmbed: true, style: "card" }))?.style).toBe("card");
	});

	it("reports whether a background is actually stored", () => {
		expect(normaliseWelcome(stored())?.hasBackground).toBe(false);
		expect(
			normaliseWelcome(stored({ background: { data: Buffer.from("x"), contentType: "image/png", name: "b.png" } }))
				?.hasBackground,
		).toBe(true);
	});

	/** An empty buffer is not a background, and must not claim to be one. */
	it("treats a zero-length background as none", () => {
		const empty = stored({ background: { data: Buffer.alloc(0), contentType: "image/png", name: "b.png" } });
		expect(normaliseWelcome(empty)?.hasBackground).toBe(false);
	});
});

describe("fillTemplate", () => {
	const context = { mention: "<@7>", username: "alice", serverName: "Testify", memberCount: 1_234 };

	it("fills every documented placeholder", () => {
		expect(fillTemplate("{user} {username} {server} {count}", context)).toBe("<@7> alice Testify 1234");
	});

	it("fills a placeholder used more than once", () => {
		expect(fillTemplate("{user} {user}", context)).toBe("<@7> <@7>");
	});

	/** A typo should show up as itself rather than silently vanishing. */
	it("leaves an unknown placeholder alone", () => {
		expect(fillTemplate("Hi {usrname}", context)).toBe("Hi {usrname}");
	});

	it("leaves a message with no placeholders untouched", () => {
		expect(fillTemplate("Welcome!", context)).toBe("Welcome!");
	});

	it("fills the default message the panel starts people with", () => {
		expect(fillTemplate(DEFAULT_WELCOME_MESSAGE, context)).not.toContain("{");
	});

	it("documents every placeholder it supports", () => {
		for (const entry of WELCOME_PLACEHOLDERS) {
			expect(fillTemplate(entry.token, context)).not.toBe(entry.token);
		}
	});
});

describe("checkBackground", () => {
	it("accepts a reasonable PNG", () => {
		expect(checkBackground({ contentType: "image/png", size: 500_000 })).toEqual({ ok: true });
	});

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

describe("isWelcomeStyle", () => {
	it("accepts the three styles and nothing else", () => {
		expect(isWelcomeStyle("card")).toBe(true);
		expect(isWelcomeStyle("embed")).toBe(true);
		expect(isWelcomeStyle("text")).toBe(true);
		expect(isWelcomeStyle("gif")).toBe(false);
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

		it("says nobody is greeted yet rather than showing a status", () => {
			expect(textOf(fresh)).toMatch(/nobody is greeted yet/i);
		});

		/** Every other control needs a channel to act on. */
		it("disables every button until a channel is picked", () => {
			for (const control of buttonsOf(fresh)) expect(control.disabled).toBe(true);
		});

		it("still offers the channel picker", () => {
			expect(idsOf(fresh).some((id) => parseCustomId(id).action === "channel")).toBe(true);
		});
	});

	it("names the channel and the style it is using", () => {
		const text = textOf(configured);

		expect(text).toContain(CHANNEL);
		expect(text).toMatch(/image card/i);
	});

	it("shows the message that will be sent", () => {
		expect(textOf(configured)).toContain("Hi {user}");
	});

	it("lists the placeholders, so nobody has to guess them", () => {
		const text = textOf(configured);
		for (const entry of WELCOME_PLACEHOLDERS) expect(text).toContain(entry.token);
	});

	it("greys out the style already in use", () => {
		const styles = buttonsOf(configured).filter(
			(control) => parseCustomId(String(control.custom_id)).action === "style",
		);

		expect(styles).toHaveLength(3);
		expect(styles.filter((control) => control.disabled === true)).toHaveLength(1);
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

	it("shows a note from the last press when there is one", () => {
		const rendered = welcomePanel({ config: null, note: "Nobody will be greeted." }, OWNER);
		expect(textOf(rendered)).toContain("Nobody will be greeted.");
	});
});
