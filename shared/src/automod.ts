import { z } from "zod";
import { plainLine } from "./text";

/** The rules Testify knows how to build. Discord holds many more; those are listed but not offered here. */
export const AUTOMOD_PRESETS = ["flagged-words", "spam", "mention-spam", "keyword"] as const;

export type AutomodPreset = (typeof AUTOMOD_PRESETS)[number];

export const AUTOMOD_LIMITS = {
	minMentions: 1,
	maxMentions: 50,
	maxKeyword: 60,
	/** Discord's own cap per trigger type, and the reason a create can be refused before it is sent. */
	maxRules: 6,
} as const;

export const AUTOMOD_PRESET_LABELS: Record<AutomodPreset, { label: string; describes: string }> = {
	"flagged-words": {
		label: "Flagged words",
		describes: "Discord's own profanity, sexual content and slur lists.",
	},
	spam: { label: "Spam", describes: "Messages Discord identifies as spam." },
	"mention-spam": { label: "Mention spam", describes: "A message mentioning more people than you allow." },
	keyword: { label: "A word you choose", describes: "One word or phrase, blocked outright." },
};

/** What a rule does when it fires, in the words the list shows. */
export type AutomodAction = "block" | "alert" | "timeout" | "other";

export interface AutomodRuleSummary {
	id: string;
	name: string;
	enabled: boolean;
	/** Absent for a trigger Testify does not build, which is still listed so the page matches Discord. */
	preset: AutomodPreset | null;
	trigger: string;
	actions: AutomodAction[];
	/** True when Testify created it, so a rule somebody made in Discord is recognisable. */
	fromTestify: boolean;
}

export interface AutomodRules {
	rules: AutomodRuleSummary[];
	/** False when Testify lacks Manage Server, which is the only reason the whole page cannot work. */
	canManage: boolean;
}

export const automodCreate = z.discriminatedUnion("preset", [
	z.object({ preset: z.literal("flagged-words") }),
	z.object({ preset: z.literal("spam") }),
	z.object({
		preset: z.literal("mention-spam"),
		limit: z.coerce.number().int().min(AUTOMOD_LIMITS.minMentions).max(AUTOMOD_LIMITS.maxMentions),
	}),
	z.object({ preset: z.literal("keyword"), word: plainLine(1, AUTOMOD_LIMITS.maxKeyword) }),
]);

export type AutomodCreate = z.infer<typeof automodCreate>;

export const automodPatch = z.object({ enabled: z.boolean() });

export const automodRuleParam = z.object({ ruleId: z.string().regex(/^\d{17,20}$/, "is not a rule id") });

/** Why a create would be refused, in the words the form shows, so nobody presses Add and gets a 400. */
export function automodBlocked(draft: { preset: AutomodPreset; word: string; limit: number }): string | null {
	if (draft.preset === "keyword" && draft.word.trim() === "") return "Type the word or phrase to block.";
	if (draft.preset === "mention-spam" && !Number.isInteger(draft.limit)) return "Choose how many mentions to allow.";

	return null;
}
