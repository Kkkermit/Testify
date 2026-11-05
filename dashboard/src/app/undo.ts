import { createContext, useContext } from "react";

export const UNDO_WINDOW_MS = 8_000;

export interface UndoableDelete {
	key: string;
	label: string;
	commit: () => Promise<unknown>;
}

export interface Undo {
	schedule: (entry: UndoableDelete) => void;
	isHidden: (key: string) => boolean;
}

export const UndoContext = createContext<Undo | null>(null);

export function useUndo(): Undo {
	const undo = useContext(UndoContext);
	if (undo === null) throw new Error("useUndo needs an UndoProvider above it, which AppShell provides.");
	return undo;
}
