import { ACCESS_AREAS, type AccessArea, type BotFeature, isAccessArea } from "@testify/shared";
import { type LucideIcon } from "lucide-react";
import { type NavItem, navigationFor } from "@/config/navigation";
import { type TranslationKey } from "@/i18n";
import { ApiError } from "@/lib/api";

export interface AreaChoice {
	area: AccessArea;
	labelKey: TranslationKey;
	icon: LucideIcon;
}

export interface AreaGroup {
	labelKey: TranslationKey;
	choices: AreaChoice[];
}

const ANY_GUILD = { id: "0", name: "" };

function choicesIn(items: readonly NavItem[]): AreaChoice[] {
	return items.flatMap(({ to, labelKey, icon }) => {
		const screen = to.split("/")[3] ?? "";
		return isAccessArea(screen) ? [{ area: screen, labelKey, icon }] : [];
	});
}

/** The screens grouped as the sidebar groups them, so choosing them reads like the dashboard itself. */
export function areaGroups(featuresOff?: ReadonlySet<BotFeature>): AreaGroup[] {
	const groups = navigationFor({ guild: ANY_GUILD, isOwner: false, featuresOff });
	const server = groups.find((group) => group.guildId === ANY_GUILD.id);
	// The server's command switches sit with the bot-wide links, so they are gathered in with its own screens.
	const top = groups.filter((group) => group !== server).flatMap((group) => group.items);
	return [
		{ labelKey: "access.serverGroup" as const, choices: choicesIn([...(server?.items ?? []), ...top]) },
		...(server?.sections ?? []).map((section) => ({ labelKey: section.labelKey, choices: choicesIn(section.items) })),
	].filter((group) => group.choices.length > 0);
}

const LABELS = new Map(areaGroups().flatMap((group) => group.choices.map((choice) => [choice.area, choice.labelKey])));

export function areaLabel(area: AccessArea): TranslationKey {
	return LABELS.get(area) ?? "nav.overview";
}

/** In the order the screens are listed, whatever order they were ticked in. */
export function inOrder(areas: readonly AccessArea[]): AccessArea[] {
	return ACCESS_AREAS.filter((area) => areas.includes(area));
}

export function sameAreas(a: readonly AccessArea[], b: readonly AccessArea[]): boolean {
	return inOrder(a).join() === inOrder(b).join();
}

const REFUSALS: Record<string, TranslationKey> = {
	not_a_member: "access.refusedNotMember",
	is_bot: "access.refusedBot",
	already_full: "access.refusedFull",
	already_given: "access.refusedGiven",
	too_many: "access.refusedTooMany",
};

/** The reason in the reader's language when the server named a known one; otherwise null, for the generic line. */
export function refusalKey(error: unknown): TranslationKey | null {
	return error instanceof ApiError ? (REFUSALS[error.code] ?? null) : null;
}
