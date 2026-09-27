import { parseCustomId } from "@core/button";
import { djLine, musicSystemPanel } from "@lib/music/musicSystemPanel.util";
import { type MusicSettings } from "@testify/shared";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

function settings(overrides: Partial<MusicSettings> = {}): MusicSettings {
	return { enabled: true, djRoleIds: [], configured: true, ...overrides };
}

describe("musicSystemPanel", () => {
	it("says plainly which way the switch is", () => {
		expect(textOf(musicSystemPanel(settings(), OWNER))).toContain("**On.**");
		expect(textOf(musicSystemPanel(settings({ enabled: false }), OWNER))).toContain("**Off.**");
	});

	it("offers the press that moves the switch the other way", () => {
		const labels = (state: MusicSettings): string[] =>
			buttonsOf(musicSystemPanel(state, OWNER)).map((entry) => String(entry.label));

		expect(labels(settings())).toContain("Turn off");
		expect(labels(settings({ enabled: false }))).toContain("Turn on");
	});

	/** The router compares the last argument, so a missing owner would let anybody drive somebody else's panel. */
	it("puts the invoking user last in every custom ID", () => {
		for (const id of idsOf(musicSystemPanel(settings({ djRoleIds: ["role-1"] }), OWNER))) {
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	it("gives every control its own custom ID", () => {
		expect(duplicateIds(musicSystemPanel(settings(), OWNER))).toEqual([]);
	});

	/** Otherwise the menu and the list above it can disagree about what is chosen. */
	it("pre-ticks the roles already chosen", () => {
		const rendered = musicSystemPanel(settings({ djRoleIds: ["role-1", "role-2"] }), OWNER);
		const json = JSON.stringify(rendered.components[0]?.toJSON());

		expect(json).toContain("role-1");
		expect(json).toContain("role-2");
	});

	it("says a manager can always reach the player, whatever is chosen", () => {
		expect(textOf(musicSystemPanel(settings({ djRoleIds: ["role-1"] }), OWNER))).toContain("Manage Server");
	});
});

describe("djLine", () => {
	it("says the player is open when no role is chosen", () => {
		expect(djLine(settings())).toContain("Anybody");
	});

	it("names the roles as mentions rather than as raw ids", () => {
		expect(djLine(settings({ djRoleIds: ["role-1"] }))).toContain("<@&role-1>");
	});
});
