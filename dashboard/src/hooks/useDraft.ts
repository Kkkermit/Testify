import { type SetStateAction, useState } from "react";

type SetDraft<Draft> = (next: SetStateAction<Draft>) => void;

interface Edit<Draft> {
	of: string | undefined;
	value: Draft;
}

/** An edit of a saved value that lasts until that value itself changes, so another setting saving on the page keeps it. */
export function useDraft<Draft>(saved: Draft): [draft: Draft, setDraft: SetDraft<Draft>];
export function useDraft<Draft>(saved: Draft | undefined): [draft: Draft | undefined, setDraft: SetDraft<Draft>];
export function useDraft<Draft>(saved: Draft | undefined): [draft: Draft | undefined, setDraft: SetDraft<Draft>] {
	const [edit, setEdit] = useState<Edit<Draft> | null>(null);
	const savedKey = JSON.stringify(saved);
	const current = (held: Edit<Draft> | null): Draft | undefined =>
		held !== null && held.of === savedKey ? held.value : saved;

	const setDraft: SetDraft<Draft> = (next) => {
		setEdit((held) => {
			const base = current(held);
			if (base === undefined) return held;
			return { of: savedKey, value: next instanceof Function ? next(base) : next };
		});
	};

	return [current(edit), setDraft];
}
