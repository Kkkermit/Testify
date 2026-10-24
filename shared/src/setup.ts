import { z } from "zod";

/** The starters on a new server's overview: each turns one feature on with defaults the server chooses. */

export const SETUP_STEPS = ["levelling", "welcome", "audit-log"] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

/** The name a new private log channel is given when the server has none to reuse. */
export const AUDIT_LOG_CHANNEL_NAME = "audit-log";

/**
 * Why a step cannot be done in one click: no channel both the bot and the person can post in, or a new log channel
 * that the bot or the person lacks Manage Channels to make.
 */
export type SetupBlocker = "no_channel" | "bot_cannot_create" | "you_cannot_create";

export interface SetupStepState {
	step: SetupStep;
	done: boolean;
	/** Where a one-click start would post, so the button can say so before it is pressed. */
	channelId: string | null;
	channelName: string | null;
	/** True when a one-click start makes a new private channel rather than reusing one. */
	createsChannel: boolean;
	blocker: SetupBlocker | null;
}

export interface SetupChecklist {
	steps: SetupStepState[];
}

export const setupStepParams = z.object({ step: z.enum(SETUP_STEPS) });
