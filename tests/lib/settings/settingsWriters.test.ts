import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { RESTORABLE, type RestorableAction } from "@testify/shared";

/** A command or a panel that writes a setting the Changes page can put back records it, as the dashboard does. */

const SRC = join(__dirname, "../../../src");

const WRITERS: Record<RestorableAction, string[]> = {
	"welcome.update": ["saveWelcome", "disableWelcome"],
	"goodbye.update": ["saveGoodbyeSettings", "applyGoodbye"],
	"birthdays.update": ["saveBirthdaySettings", "applyBirthdaySettings"],
	"levelling.update": ["saveLevelSettings", "deleteLevelSettings"],
	"starboard.update": ["saveStarboardSettings", "applyStarboardSettings"],
	"ideas.update": ["saveIdeaSettings", "applyIdeaSettings"],
	"temp-voice.update": ["saveTempVoiceSettings", "applyTempVoiceSettings"],
	"raid.update": ["saveRaidSettings", "applyRaidSettings"],
	"cases.settings": ["saveCaseSettings", "applyCaseSettings"],
	"verification.update": ["saveVerifyConfig", "deleteVerifyConfig"],
	"music.update": ["saveMusicSettings", "applyMusicSettings"],
	"treasure.update": ["saveTreasureConfig", "applyTreasure", "resetTreasure"],
	"lottery.update": ["saveLottery", "applyLottery", "deleteLottery"],
	"settings.prefix": ["setPrefix", "setPrefixEnabled"],
	"settings.anti-link": ["setAntiLink", "disableAntiLink"],
	"settings.auto-roles": ["setAutoRoles"],
	"settings.counting": ["setCounting", "disableCounting"],
	"settings.voice-stats": ["setVoiceCounter"],
};

function modules(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return modules(path);
		return path.endsWith(".ts") ? [path] : [];
	});
}

const read = (path: string): string => readFileSync(path, "utf8");
const named = (path: string): string => relative(SRC, path).split(sep).join("/");

function records(path: string, action: RestorableAction): boolean {
	const text = read(path).replace(/\s+/g, " ");
	return new RegExp(`recordsSettings\\( ?\\[[^\\]]*"${action.replace(".", "\\.")}"`).test(text);
}

describe("settings changed in Discord", () => {
	const handlers = [...modules(join(SRC, "buttons")), ...modules(join(SRC, "commands"))];

	it("names a writer for every setting the Changes page can put back", () => {
		expect(Object.keys(WRITERS).sort()).toEqual(Object.keys(RESTORABLE).sort());
		expect(handlers.length).toBeGreaterThan(150);
	});

	it("are recorded by every command and panel that writes one", () => {
		const unrecorded: string[] = [];
		let writing = 0;

		for (const [action, writers] of Object.entries(WRITERS) as [RestorableAction, string[]][]) {
			const pattern = new RegExp(`\\b(?:${writers.join("|")})\\(`);
			for (const file of handlers.filter((path) => pattern.test(read(path)))) {
				writing += 1;
				if (!records(file, action)) unrecorded.push(`${named(file)} → ${action}`);
			}
		}

		expect(writing).toBeGreaterThan(20);
		expect(unrecorded).toEqual([]);
	});
});
