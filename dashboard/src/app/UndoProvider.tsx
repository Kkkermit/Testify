import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Undo, type UndoableDelete, UndoContext, UNDO_WINDOW_MS } from "@/app/undo";
import { Button } from "@/components/primitives";
import { ApiError } from "@/lib/api";

/** Deletions wait here for a few seconds behind a notice with Undo; nothing is sent until the window closes. */
export function UndoProvider({ children }: { children: ReactNode }): React.JSX.Element {
	const { t } = useTranslation();
	const [waiting, setWaiting] = useState<UndoableDelete | null>(null);
	const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
	const [failure, setFailure] = useState<{ label: string; message: string } | null>(null);

	const current = useRef<UndoableDelete | null>(null);
	const timer = useRef<number | undefined>(undefined);
	const left = useRef(UNDO_WINDOW_MS);
	const startedAt = useRef(0);
	const held = useRef({ hover: false, focus: false });
	const lastInput = useRef<"keyboard" | "pointer">("pointer");
	const undoButton = useRef<HTMLButtonElement>(null);
	const focusUndo = useRef(false);

	const stopClock = useCallback(() => {
		if (timer.current === undefined) return;
		window.clearTimeout(timer.current);
		timer.current = undefined;
		left.current -= Date.now() - startedAt.current;
	}, []);

	const send = useCallback(
		(entry: UndoableDelete) => {
			stopClock();
			current.current = null;
			setWaiting(null);
			entry.commit().catch((error: unknown) => {
				// It is still there, so it comes back, and the reason is said wherever the reader now is.
				setHidden((was) => without(was, entry.key));
				setFailure({ label: entry.label, message: error instanceof ApiError ? error.message : "" });
			});
		},
		[stopClock],
	);

	const startClock = useCallback(() => {
		if (current.current === null || timer.current !== undefined) return;
		if (held.current.hover || held.current.focus) return;
		startedAt.current = Date.now();
		timer.current = window.setTimeout(() => {
			timer.current = undefined;
			if (current.current !== null) send(current.current);
		}, left.current);
	}, [send]);

	const schedule = useCallback(
		(entry: UndoableDelete) => {
			if (current.current !== null) send(current.current);

			current.current = entry;
			left.current = UNDO_WINDOW_MS;
			held.current = { hover: false, focus: false };
			// The row and its button vanish, so a keyboard reader is handed the one control that matters now.
			focusUndo.current = lastInput.current === "keyboard";
			setFailure(null);
			setHidden((was) => new Set([...was, entry.key]));
			setWaiting(entry);
			startClock();
		},
		[send, startClock],
	);

	const undo = useCallback(() => {
		const entry = current.current;
		if (entry === null) return;
		stopClock();
		current.current = null;
		setWaiting(null);
		setHidden((was) => without(was, entry.key));
	}, [stopClock]);

	useEffect(() => {
		if (waiting !== null && focusUndo.current) undoButton.current?.focus();
	}, [waiting]);

	useEffect(() => {
		const keyboard = (): void => {
			lastInput.current = "keyboard";
		};
		const pointer = (): void => {
			lastInput.current = "pointer";
		};
		// Closing or leaving the page is the end of the window, and a keepalive delete outlives the page.
		const leaving = (): void => {
			if (current.current !== null) send(current.current);
		};

		document.addEventListener("keydown", keyboard, true);
		document.addEventListener("pointerdown", pointer, true);
		window.addEventListener("pagehide", leaving);
		return () => {
			document.removeEventListener("keydown", keyboard, true);
			document.removeEventListener("pointerdown", pointer, true);
			window.removeEventListener("pagehide", leaving);
			leaving();
		};
	}, [send]);

	const value = useMemo<Undo>(() => ({ schedule, isHidden: (key) => hidden.has(key) }), [schedule, hidden]);

	function hold(kind: "hover" | "focus", on: boolean): void {
		held.current = { ...held.current, [kind]: on };
		if (on) stopClock();
		else startClock();
	}

	return (
		<UndoContext.Provider value={value}>
			{children}

			<div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
				{/* Present before anything is said in it, or a screen reader misses the first notice. */}
				<div role="status" className="flex flex-col items-center">
					{waiting !== null && (
						<div
							onMouseEnter={() => {
								hold("hover", true);
							}}
							onMouseLeave={() => {
								hold("hover", false);
							}}
							onFocus={() => {
								hold("focus", true);
							}}
							onBlur={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget)) hold("focus", false);
							}}
							onKeyDown={(event) => {
								if (event.key === "Escape") send(waiting);
							}}
							className="bg-popover border-border rounded-card motion-fade pointer-events-auto flex max-w-md items-center gap-4 border py-2 pr-2 pl-4 text-sm shadow-lg"
						>
							<p className="min-w-0 flex-1">{t("undo.deleted", { what: waiting.label })}</p>
							<Button ref={undoButton} variant="secondary" onClick={undo}>
								{t("undo.undo")}
							</Button>
						</div>
					)}
				</div>

				{failure !== null && (
					<div
						role="alert"
						className="bg-popover border-destructive/50 rounded-card motion-fade pointer-events-auto flex max-w-md items-center gap-4 border py-2 pr-2 pl-4 text-sm shadow-lg"
					>
						<p className="min-w-0 flex-1">
							{t("undo.failed", { what: failure.label })} {failure.message}
						</p>
						<Button
							variant="ghost"
							onClick={() => {
								setFailure(null);
							}}
						>
							{t("undo.dismiss")}
						</Button>
					</div>
				)}
			</div>
		</UndoContext.Provider>
	);
}

function without(set: ReadonlySet<string>, key: string): ReadonlySet<string> {
	const next = new Set(set);
	next.delete(key);
	return next;
}
