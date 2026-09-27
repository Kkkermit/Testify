import { MUSIC_SYSTEM_SUBCOMMAND } from "@lib/music/music.constants";
import { isDj, musicRefusal, normaliseMusicSettings } from "@lib/music/musicSettings.util";
import { type MusicSettings } from "@testify/shared";

function settings(overrides: Partial<MusicSettings> = {}): MusicSettings {
	return { enabled: true, djRoleIds: [], configured: true, ...overrides };
}

describe("normaliseMusicSettings", () => {
	/** A fresh install should play music without anybody having to find a switch first. */
	it("leaves a server with no record on and open to everybody", () => {
		expect(normaliseMusicSettings(null)).toEqual({ enabled: true, djRoleIds: [], configured: false });
	});

	it("says a stored record is configured, so a screen can stop calling its values defaults", () => {
		expect(normaliseMusicSettings({ enabled: false, djRoleIds: ["1"] })).toEqual({
			enabled: false,
			djRoleIds: ["1"],
			configured: true,
		});
	});
});

describe("isDj", () => {
	it("lets anybody in while no role has been chosen", () => {
		expect(isDj(settings(), [])).toBe(true);
	});

	it("wants one of the chosen roles once there are any", () => {
		expect(isDj(settings({ djRoleIds: ["a", "b"] }), ["c"])).toBe(false);
		expect(isDj(settings({ djRoleIds: ["a", "b"] }), ["c", "b"])).toBe(true);
	});
});

describe("musicRefusal", () => {
	it("allows an ordinary member while the system is open", () => {
		expect(musicRefusal(settings(), { roleIds: [], manager: false })).toBeNull();
	});

	it("names the command that turns it back on", () => {
		const refusal = musicRefusal(settings({ enabled: false }), { roleIds: [], manager: true });

		expect(refusal).toContain("/music system");
	});

	/** A switch is a switch: a manager who turned music off should not still be able to play it. */
	it("refuses a manager too while the system is off", () => {
		expect(musicRefusal(settings({ enabled: false }), { roleIds: [], manager: true })).not.toBeNull();
	});

	it("refuses somebody with none of the DJ roles", () => {
		expect(musicRefusal(settings({ djRoleIds: ["dj"] }), { roleIds: ["other"], manager: false })).toContain("DJ role");
	});

	/** Otherwise a server could pick a role nobody holds and lock itself out of its own player. */
	it("always lets a manager through the DJ roles", () => {
		expect(musicRefusal(settings({ djRoleIds: ["dj"] }), { roleIds: [], manager: true })).toBeNull();
	});
});

describe("MUSIC_SYSTEM_SUBCOMMAND", () => {
	/** The gate exempts it by name, so renaming the subcommand without this would lock a server out. */
	it("is the name the settings subcommand is registered under", () => {
		expect(MUSIC_SYSTEM_SUBCOMMAND).toBe("system");
	});
});
