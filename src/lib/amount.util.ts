import { strings } from "@config/strings";
import { UserFacingError } from "@core/errors";

/** Parses the amount argument shared by deposit, withdraw, transfer and gamble. */
export function resolveAmount(input: string, available: number): number {
	const normalised = input.trim().toLowerCase().replace(/[,_]/g, "");

	if (normalised === "all" || normalised === "max") {
		if (available <= 0) throw new UserFacingError("You have nothing to use here.");
		return available;
	}

	if (normalised === "half") {
		const half = Math.floor(available / 2);
		if (half <= 0) throw new UserFacingError("You have nothing to use here.");
		return half;
	}

	const percentage = /^(\d{1,3})%$/.exec(normalised);
	if (percentage) {
		const share = Math.floor((available * Number.parseInt(percentage[1]!, 10)) / 100);
		if (share <= 0) throw new UserFacingError("That works out to nothing.");
		return share;
	}

	const parsed = Number.parseInt(normalised, 10);
	if (Number.isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
		throw new UserFacingError(strings.economy.amountPositive);
	}

	return parsed;
}
