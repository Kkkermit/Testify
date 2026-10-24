import { createContext, useContext } from "react";

/** How long a deletion waits for Undo; hovering or focusing the notice holds the clock. */
export const UNDO_WINDOW_MS = 8_000;

export interface UndoableDelete {
	/** Unique across the app, so a row can ask whether it is the one waiting to go. */
	key: string;
	/** What was deleted, as the notice names it. */
	label: string;
	commit: () => Promise<unknown>;
}

export interface Undo {
	/** Hides the row now and deletes it when the window closes; a delete already waiting is sent first. */
	schedule: (entry: UndoableDelete) => void;
	/** True from the click until the row has gone for good, so it never reappears in between. */
	isHidden: (key: string) => boolean;
}

export const UndoContext = createContext<Undo | null>(null);

export function useUndo(): Undo {
	const undo = useContext(UndoContext);
	if (undo === null) throw new Error("useUndo needs an UndoProvider above it, which AppShell provides.");
	return undo;
}
