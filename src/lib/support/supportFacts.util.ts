import { PermissionsBitField } from "discord.js";
import {
	AFK,
	DAY_MS,
	DEFAULT_PREFIX,
	ECONOMY,
	ECONOMY_COOLDOWNS,
	HOUR_MS,
	LEVELLING,
	MINUTE_MS,
	TICKET,
} from "@config/constants";
import { ANSWER_EVERY_MS } from "@lib/autoResponders/autoResponders.util";
import { CASINO_TIMING } from "@lib/casino/casino.constants";
import { COINFLIP_RETURN, DICE_RETURNS } from "@lib/casino/chance.util";
import { HILO_EDGE, HILO_MAX_MULTIPLIER } from "@lib/casino/hilo.util";
import { SLOT_PAYTABLE, slotsReturnToPlayer } from "@lib/casino/slots.util";
import { formatDurationLong, formatNumber, humanisePermission } from "@lib/format/format.util";
import { POLL_LIMITS } from "@lib/polls/polls.constants";
import { REMINDER_LIMITS } from "@lib/reminders/reminders.constants";
import { SCHEDULE_TIMING } from "@lib/scheduledMessages/scheduledMessages.constants";
import { MAKE_PAUSE_MS } from "@lib/tempVoice/tempVoice.constants";
import {
	AUTO_RESPONDER_LIMITS,
	BIRTHDAY_LIMITS,
	GIVEAWAY_LIMITS,
	INVITE_PERMISSIONS,
	LEVEL_LIMITS,
	LOTTERY_LIMITS,
	RAID_LIMITS,
	ROLE_MENU_LIMITS,
	SCHEDULE_LIMITS,
	SETTINGS_LIMITS,
	STARBOARD_LIMITS,
	STICKY_LIMITS,
	TEMP_VOICE_LIMITS,
	TREASURE_DEFAULTS,
	TREASURE_LIMITS,
	WELCOME_LIMITS,
} from "@testify/shared";

/** Every number an article quotes, read from the code, so an article cannot state a limit the bot no longer has. */
export const FACTS: Readonly<Record<string, string>> = {
	"prefix.default": DEFAULT_PREFIX,
	"prefix.maxLength": formatNumber(SETTINGS_LIMITS.maxPrefix),
	"invite.permissions": new PermissionsBitField(BigInt(INVITE_PERMISSIONS))
		.toArray()
		.map((name) => humanisePermission(name))
		.join(", "),

	"economy.startingWallet": formatNumber(ECONOMY.startingWallet),
	"economy.dailyBase": formatNumber(ECONOMY.dailyBase),
	"economy.dailyStreakBonus": formatNumber(ECONOMY.dailyStreakBonus),
	"economy.dailyStreakCap": formatNumber(ECONOMY.dailyStreakCap),
	"economy.dailyMax": formatNumber(ECONOMY.dailyBase + ECONOMY.dailyStreakCap * ECONOMY.dailyStreakBonus),
	"economy.workMin": formatNumber(ECONOMY.workMinPay),
	"economy.workMax": formatNumber(ECONOMY.workMaxPay),
	"economy.begMax": formatNumber(ECONOMY.begMax),
	"economy.robChance": `${String(Math.round(ECONOMY.robSuccessChance * 100))}%`,
	"economy.robFine": `${String(Math.round(ECONOMY.robFinePercent * 100))}%`,
	"economy.robMinWallet": formatNumber(ECONOMY.robMinTargetWallet),
	"economy.heistMin": formatNumber(ECONOMY.heistMinPlayers),
	"economy.heistMax": formatNumber(ECONOMY.heistMaxPlayers),
	"economy.heistJoin": formatDurationLong(ECONOMY.heistJoinWindowMs),
	"economy.inventoryMax": formatNumber(ECONOMY.maxInventorySize),

	"cooldown.daily": formatDurationLong(ECONOMY_COOLDOWNS.daily),
	"cooldown.work": formatDurationLong(ECONOMY_COOLDOWNS.work),
	"cooldown.rob": formatDurationLong(ECONOMY_COOLDOWNS.rob),
	"cooldown.heist": formatDurationLong(ECONOMY_COOLDOWNS.heist),
	"cooldown.beg": formatDurationLong(ECONOMY_COOLDOWNS.beg),

	"casino.slotsReturn": `${(slotsReturnToPlayer() * 100).toFixed(1)}%`,
	"casino.slotsTop": `${formatNumber(SLOT_PAYTABLE.diamond)}×`,
	"casino.coinflipReturn": `${String(COINFLIP_RETURN)}×`,
	"casino.diceSeven": `${String(DICE_RETURNS.seven)}×`,
	"casino.hiloCut": `${String(Math.round((1 - HILO_EDGE) * 100))}%`,
	"casino.hiloCap": `${formatNumber(HILO_MAX_MULTIPLIER)}×`,
	"casino.handIdle": formatDurationLong(CASINO_TIMING.handIdleMs),

	"levelling.xpMin": formatNumber(LEVELLING.xpPerMessageMin),
	"levelling.xpMax": formatNumber(LEVELLING.xpPerMessageMax),
	"levelling.xpCooldown": formatDurationLong(LEVELLING.messageCooldownMs),
	"levelling.xpForLevel1": formatNumber(LEVELLING.xpForLevel(1)),
	"levelling.xpForLevel5": formatNumber(LEVELLING.xpForLevel(5)),
	"levelling.xpForLevel10": formatNumber(LEVELLING.xpForLevel(10)),
	"levelling.maxBoosts": formatNumber(LEVEL_LIMITS.maxBoosts),
	"levelling.maxMultiplier": formatNumber(LEVEL_LIMITS.maxMultiplier),
	"levelling.maxRewards": formatNumber(LEVEL_LIMITS.maxRewards),
	"levelling.maxRewardLevel": formatNumber(LEVEL_LIMITS.maxRewardLevel),
	"levelling.maxIgnoredChannels": formatNumber(LEVEL_LIMITS.maxIgnoredChannels),
	"levelling.maxIgnoredRoles": formatNumber(LEVEL_LIMITS.maxIgnoredRoles),

	"welcome.maxMessage": formatNumber(WELCOME_LIMITS.maxMessage),
	"welcome.maxBackgroundMb": `${String(WELCOME_LIMITS.maxBackgroundBytes / (1024 * 1024))} MB`,

	"sticky.minCap": formatNumber(STICKY_LIMITS.minCap),
	"sticky.maxCap": formatNumber(STICKY_LIMITS.maxCap),
	"sticky.maxPerServer": formatNumber(STICKY_LIMITS.maxPerGuild),

	"giveaway.maxWinners": formatNumber(GIVEAWAY_LIMITS.maxWinners),
	"giveaway.minDuration": formatDurationLong(GIVEAWAY_LIMITS.minDurationMs),
	"giveaway.maxDuration": formatDurationLong(GIVEAWAY_LIMITS.maxDurationMs),

	"lottery.maxWinners": formatNumber(LOTTERY_LIMITS.maxWinners),

	"reminder.min": formatDurationLong(REMINDER_LIMITS.minMs),
	"reminder.max": formatDurationLong(REMINDER_LIMITS.maxMs),
	"reminder.maxActive": formatNumber(REMINDER_LIMITS.maxActive),

	"roleMenu.maxPerServer": formatNumber(ROLE_MENU_LIMITS.maxPerGuild),
	"roleMenu.maxRoles": formatNumber(ROLE_MENU_LIMITS.maxRoles),

	"starboard.minStars": formatNumber(STARBOARD_LIMITS.minThreshold),
	"starboard.maxStars": formatNumber(STARBOARD_LIMITS.maxThreshold),
	"starboard.defaultStars": formatNumber(STARBOARD_LIMITS.defaultThreshold),

	"tempVoice.maxPeople": formatNumber(TEMP_VOICE_LIMITS.maxUserLimit),
	"tempVoice.makePause": formatDurationLong(MAKE_PAUSE_MS),

	"treasure.minMessages": formatNumber(TREASURE_DEFAULTS.minMessages),
	"treasure.maxMessages": formatNumber(TREASURE_DEFAULTS.maxMessages),
	"treasure.minAmount": formatNumber(TREASURE_DEFAULTS.minAmount),
	"treasure.maxAmount": formatNumber(TREASURE_DEFAULTS.maxAmount),
	"treasure.cooldown": formatDurationLong(TREASURE_DEFAULTS.cooldownMs),
	"treasure.maxAmountLimit": formatNumber(TREASURE_LIMITS.maxAmount),

	"ticket.closeDelay": formatDurationLong(TICKET.closeDelayMs),

	"poll.minAnswers": formatNumber(POLL_LIMITS.minAnswers),
	"poll.maxAnswers": formatNumber(POLL_LIMITS.maxAnswers),
	"poll.defaultDuration": formatDurationLong(POLL_LIMITS.defaultHours * HOUR_MS),
	"poll.maxDuration": formatDurationLong(POLL_LIMITS.maxHours * HOUR_MS),

	"afk.maxNote": formatNumber(AFK.maxNote),
	"afk.keep": formatDurationLong(AFK.keepDays * DAY_MS),
	"afk.noticeEvery": formatDurationLong(AFK.noticeEveryMs),

	"autoResponder.maxPerServer": formatNumber(AUTO_RESPONDER_LIMITS.maxPerGuild),
	"autoResponder.pause": formatDurationLong(ANSWER_EVERY_MS),

	"schedule.maxPerServer": formatNumber(SCHEDULE_LIMITS.maxPerGuild),
	"schedule.lateBy": formatDurationLong(SCHEDULE_TIMING.lateByMs),
	"schedule.maxAhead": formatDurationLong(SCHEDULE_LIMITS.maxAheadDays * DAY_MS),

	"birthday.maxMessage": formatNumber(BIRTHDAY_LIMITS.maxMessage),

	"raid.maxAccountAge": formatDurationLong(RAID_LIMITS.maxAccountAgeDays * DAY_MS),
	"raid.alertEvery": formatDurationLong(RAID_LIMITS.alertEveryMinutes * MINUTE_MS),
};

const FACT = /\{fact:([a-zA-Z0-9.]+)\}/g;

export function unknownFacts(text: string): string[] {
	return [...text.matchAll(FACT)].map((match) => match[1] ?? "").filter((key) => FACTS[key] === undefined);
}

export function fillFacts(text: string): string {
	return text.replace(FACT, (whole, key: string) => FACTS[key] ?? whole);
}
