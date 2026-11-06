import { type RestorableAction } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const BACKUP_SECTION_LABELS: Record<RestorableAction, TranslationKey> = {
	"welcome.update": "nav.welcome",
	"goodbye.update": "goodbye.heading",
	"birthdays.update": "nav.birthdays",
	"levelling.update": "nav.levelling",
	"starboard.update": "nav.starboard",
	"ideas.update": "nav.ideas",
	"temp-voice.update": "nav.tempVoice",
	"raid.update": "nav.raid",
	"cases.settings": "nav.cases",
	"verification.update": "settings.verifyTitle",
	"music.update": "nav.music",
	"treasure.update": "nav.treasure",
	"lottery.update": "nav.lottery",
	"settings.prefix": "settings.prefixTitle",
	"settings.anti-link": "settings.linkTitle",
	"settings.auto-roles": "settings.autoRoleTitle",
	"settings.counting": "settings.countingTitle",
	"settings.voice-stats": "settings.voiceTitle",
};
