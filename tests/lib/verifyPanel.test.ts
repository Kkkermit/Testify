import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { type VerifySettings } from "@database/models/verification.schema";
import {
	DEFAULT_VERIFY_MESSAGE,
	isReady,
	normaliseVerify,
	type StoredVerifySettings,
	type VerifyConfig,
	VERIFY_PANEL_ID,
	verifyPanel,
} from "@lib/verifyPanel.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const CHANNEL = "200000000000000002";
const ROLE = "300000000000000003";

function stored(overrides: Partial<VerifySettings> = {}): StoredVerifySettings {
	return {
		guildId: "1",
		channelId: CHANNEL,
		roleId: ROLE,
		messageId: null,
		message: "Press to verify",
		verifiedIds: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function config(overrides: Partial<VerifyConfig> = {}): VerifyConfig {
	return {
		channelId: CHANNEL,
		roleId: ROLE,
		messageId: null,
		message: "Press to verify",
		verifiedCount: 0,
		...overrides,
	};
}

describe("normaliseVerify", () => {
	it("gives an unconfigured guild an empty config with the default wording", () => {
		expect(normaliseVerify(null)).toEqual({
			channelId: null,
			roleId: null,
			messageId: null,
			message: DEFAULT_VERIFY_MESSAGE,
			verifiedCount: 0,
		});
	});

	/** The wording was a command option before, so an existing document has no message. */
	it("falls back to the default wording for a document written before it existed", () => {
		const legacy = stored();
		delete (legacy as Partial<VerifySettings>).message;

		expect(normaliseVerify(legacy).message).toBe(DEFAULT_VERIFY_MESSAGE);
	});

	/** An empty string would render a panel with nothing above the button. */
	it("falls back for a blank message too", () => {
		expect(normaliseVerify(stored({ message: "" })).message).toBe(DEFAULT_VERIFY_MESSAGE);
	});

	it("counts who has verified", () => {
		expect(normaliseVerify(stored({ verifiedIds: ["a", "b", "c"] })).verifiedCount).toBe(3);
	});
});

describe("isReady", () => {
	it("needs both a channel and a role", () => {
		expect(isReady(config())).toBe(true);
		expect(isReady(config({ channelId: null }))).toBe(false);
		expect(isReady(config({ roleId: null }))).toBe(false);
	});
});

describe("the verification panel", () => {
	const ready = verifyPanel({ config: config() }, OWNER);

	it("is a Components V2 message", () => {
		expect(ready.flags).toBe(MessageFlags.IsComponentsV2);
	});

	it("namespaces every control, with the owner last", () => {
		for (const id of idsOf(ready)) {
			expect(parseCustomId(id).id).toBe(VERIFY_PANEL_ID);
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it("gives every control a distinct custom ID", () => {
		expect(duplicateIds(ready)).toEqual([]);
		expect(duplicateIds(verifyPanel({ config: normaliseVerify(null) }, OWNER))).toEqual([]);
	});

	it("names the channel and the role", () => {
		expect(textOf(ready)).toContain(CHANNEL);
		expect(textOf(ready)).toContain(ROLE);
	});

	it("shows the wording members will see", () => {
		expect(textOf(ready)).toContain("Press to verify");
	});

	/** Naming what is missing beats a generic "not configured". */
	it("says exactly what is still needed", () => {
		expect(textOf(verifyPanel({ config: config({ channelId: null }) }, OWNER))).toMatch(/a channel/i);
		expect(textOf(verifyPanel({ config: config({ roleId: null }) }, OWNER))).toMatch(/a role to grant/i);
	});

	it("cannot post until both are chosen", () => {
		const postOf = (rendered: ReturnType<typeof verifyPanel>): unknown =>
			buttonsOf(rendered).find((control) => parseCustomId(String(control.custom_id)).action === "post")?.disabled;

		expect(postOf(verifyPanel({ config: config({ roleId: null }) }, OWNER))).toBe(true);
		expect(postOf(ready)).toBe(false);
	});

	it("offers to update rather than repost once the panel exists", () => {
		const labelOf = (rendered: ReturnType<typeof verifyPanel>): unknown =>
			buttonsOf(rendered).find((control) => parseCustomId(String(control.custom_id)).action === "post")?.label;

		expect(labelOf(ready)).toBe("Post the panel");
		expect(labelOf(verifyPanel({ config: config({ messageId: "9" }) }, OWNER))).toBe("Update the panel");
	});

	it("says whether the panel has been posted, and how many have verified", () => {
		const text = textOf(verifyPanel({ config: config({ messageId: "9", verifiedCount: 1_234 }) }, OWNER));

		expect(text).toMatch(/panel is posted/i);
		expect(text).toContain("1,234");
	});

	/**
	 * Setup can look complete while every verification fails at the last step, and Discord gives no warning until it
	 * does.
	 */
	it("warns when the chosen role sits above the bot", () => {
		expect(textOf(verifyPanel({ config: config(), roleTooHigh: true }, OWNER))).toMatch(/above mine/i);
		expect(textOf(ready)).not.toMatch(/above mine/i);
	});

	it("shows a note from the last press when there is one", () => {
		expect(textOf(verifyPanel({ config: config(), note: "Panel posted." }, OWNER))).toContain("Panel posted.");
	});
});
