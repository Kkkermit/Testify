import { UserFacingError } from "@core/errors";
import { type Query } from "@lib/music/music.types";
import { allowsSource, normaliseMusicSources, withinSources } from "@lib/music/musicSources.util";

jest.mock("@database/repositories/botSettingsRepository", () => ({
	getBotSettings: jest.fn(),
	saveBotSettings: jest.fn(),
}));

const youtubeLink: Query = { kind: "url", url: "https://youtu.be/abc", source: "youtube" };
const soundCloudLink: Query = { kind: "url", url: "https://soundcloud.com/a/b", source: "soundcloud" };

describe("normaliseMusicSources", () => {
	/** A bot that has never been configured keeps playing from both, which is what it did before there was a choice. */
	it("reads nothing stored as both, and says it is the default", () => {
		expect(normaliseMusicSources(null)).toEqual({ sources: "both", configured: false });
		expect(normaliseMusicSources({ musicSources: "soundcloud" })).toEqual({ sources: "soundcloud", configured: true });
	});
});

describe("allowsSource", () => {
	it.each([
		["both", "youtube", true],
		["both", "soundcloud", true],
		["youtube", "soundcloud", false],
		["soundcloud", "youtube", false],
		["youtube", "youtube", true],
		["soundcloud", "soundcloud", true],
	] as const)("with %s, %s is allowed: %s", (sources, source, allowed) => {
		expect(allowsSource(sources, source)).toBe(allowed);
	});

	/** The switch is about two services; a link to anywhere else was never the owner's to refuse. */
	it("never refuses another site", () => {
		expect(allowsSource("youtube", "other")).toBe(true);
		expect(allowsSource("soundcloud", "other")).toBe(true);
	});
});

describe("withinSources", () => {
	/** Turning a service off has to cover links as well, or pasting one would walk straight past the switch. */
	it("refuses a link to a service that is switched off, and says which is left", () => {
		expect(() => withinSources(youtubeLink, "soundcloud")).toThrow(UserFacingError);
		expect(() => withinSources(youtubeLink, "soundcloud")).toThrow(/SoundCloud only/);
		expect(() => withinSources(soundCloudLink, "youtube")).toThrow(/YouTube only/);
		expect(withinSources(soundCloudLink, "both")).toBe(soundCloudLink);
	});
});
