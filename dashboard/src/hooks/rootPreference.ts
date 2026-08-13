import { useCallback, useEffect, useState } from "react";
import { oneOf } from "@/lib/oneOf";

/**
 * A reader's appearance choice lives on `document.documentElement`, never in React state alone, so the
 * stylesheet and anything reading it in JavaScript cannot disagree about what is in force.
 *
 * The default is the *absence* of the attribute, which is what lets CSS answer before a script runs — the CSP
 * forbids the inline bootstrap that would otherwise set it, and an unmarked page is already correct.
 */
export interface Preference<T extends string> {
	readonly attribute: string;
	readonly storageKey: string;
	readonly options: readonly T[];
	readonly fallback: T;
}

export function storedPreference<T extends string>(spec: Preference<T>): T {
	try {
		return oneOf(spec.options, window.localStorage.getItem(spec.storageKey), spec.fallback);
	} catch {
		// Storage throws rather than returning null when cookies are blocked entirely.
		return spec.fallback;
	}
}

export function applyPreference<T extends string>(spec: Preference<T>, value: T): void {
	const root = document.documentElement;
	if (value === spec.fallback) root.removeAttribute(spec.attribute);
	else root.setAttribute(spec.attribute, value);
}

export function useRootPreference<T extends string>(spec: Preference<T>): { value: T; choose: (next: T) => void } {
	const [value, setValue] = useState<T>(() => storedPreference(spec));

	useEffect(() => {
		applyPreference(spec, value);
	}, [spec, value]);

	const choose = useCallback(
		(next: T) => {
			setValue(next);
			try {
				window.localStorage.setItem(spec.storageKey, next);
			} catch {
				// A choice that cannot be remembered is still worth applying for this visit.
			}
		},
		[spec],
	);

	return { value, choose };
}
