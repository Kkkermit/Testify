import { SLOWMODE_SECONDS, type ToolChannel } from "@testify/shared";
import { formatUnit } from "@/lib/intl";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export function slowmodeText(seconds: number): string {
	if (seconds % HOUR === 0) return formatUnit(seconds / HOUR, "hour", { display: "long" });
	if (seconds % MINUTE === 0) return formatUnit(seconds / MINUTE, "minute", { display: "long" });
	return formatUnit(seconds, "second", { display: "long" });
}

export function slowmodeChoices(current: number): number[] {
	const choices: number[] = [...SLOWMODE_SECONDS];
	if (!choices.includes(current)) choices.push(current);
	return choices.sort((a, b) => a - b);
}

export function restricted(channels: readonly ToolChannel[]): ToolChannel[] {
	return channels.filter((channel) => channel.locked || channel.slowmodeSeconds > 0);
}
