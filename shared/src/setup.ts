import { z } from "zod";

export const SETUP_STEPS = ["levelling", "welcome", "audit-log"] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

export const AUDIT_LOG_CHANNEL_NAME = "audit-log";

/**
 * Why a step cannot be done in one click: no channel both the bot and the person can post in, or a new log channel
 * that the bot or the person lacks Manage Channels to make.
 */
export type SetupBlocker = "no_channel" | "bot_cannot_create" | "you_cannot_create";

export interface SetupStepState {
	step: SetupStep;
	done: boolean;
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
