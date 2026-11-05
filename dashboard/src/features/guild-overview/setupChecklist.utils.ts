import { type SetupStep, type SetupStepState } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

type StepAction = "start" | "create" | "choose" | null;

export function actionFor(step: SetupStepState): StepAction {
	if (step.done) return null;
	if (step.blocker !== null) return "choose";
	return step.createsChannel ? "create" : "start";
}

export const STEP_TITLE: Record<SetupStep, TranslationKey> = {
	levelling: "checklist.levellingTitle",
	welcome: "checklist.welcomeTitle",
	"audit-log": "checklist.auditTitle",
};

export function describeStep(step: SetupStepState): TranslationKey {
	if (step.step === "levelling") return step.done ? "checklist.levellingDone" : "checklist.levellingBody";

	if (step.step === "welcome") {
		if (step.done) return "checklist.welcomeDone";
		return step.blocker === null ? "checklist.welcomeBody" : "checklist.welcomeNoChannel";
	}

	if (step.done) return "checklist.auditDone";
	if (step.blocker === "bot_cannot_create") return "checklist.auditBotCannot";
	if (step.blocker !== null) return "checklist.auditYouCannot";
	return step.createsChannel ? "checklist.auditCreate" : "checklist.auditReuse";
}

const HIDDEN_KEY = "testify:setupHidden";

function hiddenGuilds(): string[] {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
		return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
	} catch {
		return [];
	}
}

export function isChecklistHidden(guildId: string): boolean {
	return hiddenGuilds().includes(guildId);
}

export function hideChecklist(guildId: string): void {
	try {
		localStorage.setItem(HIDDEN_KEY, JSON.stringify([...new Set([...hiddenGuilds(), guildId])]));
	} catch {
		// A browser that refuses storage shows the checklist again next time, which is harmless.
	}
}
