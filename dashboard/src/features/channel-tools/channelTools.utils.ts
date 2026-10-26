import { SLOWMODE_SECONDS, type ToolChannel } from "@testify/shared";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** In the browser's language; 0 is the caller's own word for off. */
export function slowmodeText(seconds: number, locale: string): string {
	const [value, unit] =
		seconds % HOUR === 0
			? [seconds / HOUR, "hour"]
			: seconds % MINUTE === 0
				? [seconds / MINUTE, "minute"]
				: [seconds, "second"];
	return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(value);
}

/** Discord's own lengths, plus whatever the channel is set to when somebody chose another in Discord. */
export function slowmodeChoices(current: number): number[] {
	const choices: number[] = [...SLOWMODE_SECONDS];
	if (!choices.includes(current)) choices.push(current);
	return choices.sort((a, b) => a - b);
}

/** What somebody looking for trouble wants first: every channel that is locked or slowed right now. */
export function restricted(channels: readonly ToolChannel[]): ToolChannel[] {
	return channels.filter((channel) => channel.locked || channel.slowmodeSeconds > 0);
}
