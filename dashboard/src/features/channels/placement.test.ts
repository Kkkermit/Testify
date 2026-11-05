import {
	birthdayPatch,
	botStatsPost,
	countingPatch,
	FEATURE_PLACES,
	goodbyePatch,
	ideaSettingsPatch,
	starboardPatch,
	tempVoicePatch,
	welcomePatchSchema,
} from "@testify/shared";
import { PLACEMENTS } from "@/features/channels/placement";

const CHANNEL = "400000000000000001";

/** The schema each placement's route parses its body with, so a placement can never send what its route refuses. */
const ROUTE_SCHEMAS: Record<keyof typeof PLACEMENTS, { safeParse: (body: unknown) => { success: boolean } }> = {
	welcome: welcomePatchSchema,
	goodbye: goodbyePatch,
	birthdays: birthdayPatch,
	ideas: ideaSettingsPatch,
	starboard: starboardPatch,
	counting: countingPatch,
	"temp-voice": tempVoicePatch,
	"bot-stats": botStatsPost,
};

describe("placements", () => {
	it("send a body their own route accepts, naming the channel", () => {
		const refused = Object.entries(PLACEMENTS).flatMap(([key, placement]) => {
			const schema = ROUTE_SCHEMAS[key as keyof typeof PLACEMENTS];
			const body = placement.body(CHANNEL);
			return schema.safeParse(body).success && Object.values(body).includes(CHANNEL) ? [] : [key];
		});

		expect(refused).toEqual([]);
	});

	/** Only a feature that lives in one chosen channel is placed by dropping it on one. */
	it("exist only for features that live in one channel", () => {
		const others = Object.keys(PLACEMENTS).filter(
			(key) => FEATURE_PLACES[key as keyof typeof FEATURE_PLACES].reach !== "channel",
		);

		expect(others).toEqual([]);
	});
});
